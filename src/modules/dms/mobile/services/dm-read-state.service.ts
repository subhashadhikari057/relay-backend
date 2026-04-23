import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarkDirectConversationReadDto } from '../dto/mark-direct-conversation-read.dto';
import { DmAccessService } from './dm-access.service';

type DmUnreadCountRow = {
  directConversationId: string;
  unreadCount: bigint | number;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
};

@Injectable()
export class DmReadStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dmAccessService: DmAccessService,
  ) {}

  async markConversationRead(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    dto: MarkDirectConversationReadDto,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const message = await this.prisma.message.findFirst({
      where: {
        id: dto.lastReadMessageId,
        workspaceId,
        directConversationId,
      },
      select: { id: true },
    });

    if (!message) {
      throw new NotFoundException('Referenced DM message not found');
    }

    const now = new Date();
    await this.prisma.userDmRead.upsert({
      where: {
        userId_directConversationId: {
          userId,
          directConversationId,
        },
      },
      update: {
        lastReadMessageId: message.id,
        lastReadAt: now,
      },
      create: {
        userId,
        directConversationId,
        lastReadMessageId: message.id,
        lastReadAt: now,
      },
    });

    return {
      success: true,
      lastReadMessageId: message.id,
      lastReadAt: now,
    };
  }

  async getConversationUnreadCount(
    userId: string,
    workspaceId: string,
    directConversationId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const rows = await this.fetchUnreadCountRows(
      userId,
      workspaceId,
      directConversationId,
    );
    const row = rows[0];

    return (
      row ?? {
        directConversationId,
        unreadCount: 0,
        lastReadMessageId: null,
        lastReadAt: null,
      }
    );
  }

  async getWorkspaceUnreadCounts(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
      },
      select: { workspaceId: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace membership not found');
    }

    const conversations = await this.fetchUnreadCountRows(userId, workspaceId);

    return {
      count: conversations.length,
      totalUnreadCount: conversations.reduce(
        (sum, item) => sum + item.unreadCount,
        0,
      ),
      conversations,
    };
  }

  private async fetchUnreadCountRows(
    userId: string,
    workspaceId: string,
    directConversationId?: string,
  ) {
    const conversationFilter = directConversationId
      ? Prisma.sql`AND dc.id = ${directConversationId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<DmUnreadCountRow[]>(Prisma.sql`
      WITH visible_conversations AS (
        SELECT dc.id
        FROM direct_conversations dc
        INNER JOIN direct_conversation_members dcm
          ON dcm.direct_conversation_id = dc.id
         AND dcm.user_id = ${userId}::uuid
         AND dcm.left_at IS NULL
        WHERE dc.workspace_id = ${workspaceId}::uuid
          ${conversationFilter}
      )
      SELECT
        vc.id AS "directConversationId",
        COALESCE(COUNT(m.id), 0)::bigint AS "unreadCount",
        udr.last_read_message_id AS "lastReadMessageId",
        udr.last_read_at AS "lastReadAt"
      FROM visible_conversations vc
      LEFT JOIN user_dm_reads udr
        ON udr.direct_conversation_id = vc.id
       AND udr.user_id = ${userId}::uuid
      LEFT JOIN messages lr
        ON lr.id = udr.last_read_message_id
      LEFT JOIN messages m
        ON m.direct_conversation_id = vc.id
       AND m.deleted_at IS NULL
       AND m.sender_user_id <> ${userId}::uuid
       AND (
         udr.last_read_message_id IS NULL
         OR lr.id IS NULL
         OR m.created_at > lr.created_at
         OR (m.created_at = lr.created_at AND m.id > lr.id)
       )
      GROUP BY vc.id, udr.last_read_message_id, udr.last_read_at
      ORDER BY vc.id ASC
    `);

    return rows.map((row) => ({
      directConversationId: row.directConversationId,
      unreadCount: Number(row.unreadCount),
      lastReadMessageId: row.lastReadMessageId,
      lastReadAt: row.lastReadAt,
    }));
  }
}
