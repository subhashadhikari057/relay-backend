import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarkChannelReadDto } from '../dto/mark-channel-read.dto';
import { MessageAccessService } from './message-access.service';

type UnreadCountRow = {
  channelId: string;
  unreadCount: bigint | number;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
};

@Injectable()
export class MessageReadStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly messageAccessService: MessageAccessService,
  ) {}

  async markChannelRead(
    userId: string,
    workspaceId: string,
    channelId: string,
    dto: MarkChannelReadDto,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const message = await this.prisma.message.findFirst({
      where: {
        id: dto.lastReadMessageId,
        workspaceId,
        channelId,
      },
      select: { id: true },
    });

    if (!message) {
      throw new NotFoundException(
        'Referenced message not found in this channel',
      );
    }

    const now = new Date();
    await this.prisma.userChannelRead.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      update: {
        lastReadMessageId: message.id,
        lastReadAt: now,
      },
      create: {
        userId,
        channelId,
        lastReadMessageId: message.id,
        lastReadAt: now,
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MESSAGE_READ_UPDATED,
        entityType: AuditEntityType.MESSAGE,
        entityId: message.id,
        metadata: { channelId },
      }),
    );

    return {
      success: true,
      lastReadMessageId: message.id,
      lastReadAt: now,
    };
  }

  async getChannelUnreadCount(
    userId: string,
    workspaceId: string,
    channelId: string,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const rows = await this.fetchUnreadCountRows(
      userId,
      workspaceId,
      channelId,
    );
    const row = rows[0];

    return (
      row ?? {
        channelId,
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

    const channels = await this.fetchUnreadCountRows(userId, workspaceId);

    return {
      count: channels.length,
      totalUnreadCount: channels.reduce(
        (sum, item) => sum + item.unreadCount,
        0,
      ),
      channels,
    };
  }

  private async fetchUnreadCountRows(
    userId: string,
    workspaceId: string,
    channelId?: string,
  ) {
    const channelFilter = channelId
      ? Prisma.sql`AND c.id = ${channelId}::uuid`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<UnreadCountRow[]>(Prisma.sql`
      WITH visible_channels AS (
        SELECT c.id
        FROM channels c
        WHERE c.workspace_id = ${workspaceId}::uuid
          AND c.is_archived = false
          ${channelFilter}
          AND (
            c.type = 'public'
            OR EXISTS (
              SELECT 1
              FROM channel_members cm
              WHERE cm.channel_id = c.id
                AND cm.user_id = ${userId}::uuid
            )
          )
      )
      SELECT
        vc.id AS "channelId",
        COALESCE(COUNT(m.id), 0)::bigint AS "unreadCount",
        ucr.last_read_message_id AS "lastReadMessageId",
        ucr.last_read_at AS "lastReadAt"
      FROM visible_channels vc
      LEFT JOIN user_channel_reads ucr
        ON ucr.channel_id = vc.id
       AND ucr.user_id = ${userId}::uuid
      LEFT JOIN messages lr
        ON lr.id = ucr.last_read_message_id
      LEFT JOIN messages m
        ON m.channel_id = vc.id
       AND m.deleted_at IS NULL
       AND m.sender_user_id <> ${userId}::uuid
       AND (
         ucr.last_read_message_id IS NULL
         OR lr.id IS NULL
         OR m.created_at > lr.created_at
         OR (m.created_at = lr.created_at AND m.id > lr.id)
       )
      GROUP BY vc.id, ucr.last_read_message_id, ucr.last_read_at
      ORDER BY vc.id ASC
    `);

    return rows.map((row) => ({
      channelId: row.channelId,
      unreadCount: Number(row.unreadCount),
      lastReadMessageId: row.lastReadMessageId,
      lastReadAt: row.lastReadAt,
    }));
  }
}
