import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DirectConversationType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMessageEvent } from 'src/modules/system-messages/system-message.constants';
import { SystemMessageService } from 'src/modules/system-messages/system-message.service';
import { AddDirectConversationMemberDto } from '../dto/add-direct-conversation-member.dto';
import { ListDirectConversationsQueryDto } from '../dto/list-direct-conversations-query.dto';
import { OpenDirectConversationDto } from '../dto/open-direct-conversation.dto';
import { UpdateDirectConversationDto } from '../dto/update-direct-conversation.dto';
import { DmAccessService } from './dm-access.service';

type ConversationCursor = {
  lastMessageAt: string;
  id: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class DmConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dmAccessService: DmAccessService,
    private readonly systemMessageService: SystemMessageService,
  ) {}

  async openConversation(
    userId: string,
    workspaceId: string,
    dto: OpenDirectConversationDto,
  ) {
    await this.prisma.workspaceMember.findFirstOrThrow({
      where: {
        workspaceId,
        userId,
        isActive: true,
      },
      select: { workspaceId: true },
    });

    const participantIds = this.normalizeParticipantIds(
      userId,
      dto.participantUserIds,
    );
    const allMemberIds = [userId, ...participantIds];
    await this.assertWorkspaceMembers(workspaceId, allMemberIds);
    const oneToOneKey =
      allMemberIds.length === 2 ? this.buildOneToOneKey(allMemberIds) : null;

    if (oneToOneKey) {
      const existing = await this.findExistingOneToOne(
        workspaceId,
        oneToOneKey,
      );
      if (existing) {
        return this.getConversationById(userId, workspaceId, existing.id);
      }
    }

    const title = this.normalizeTitle(dto.title);
    if (allMemberIds.length > 2 && !title) {
      throw new BadRequestException('Group DM title is required');
    }

    let created: { id: string; type: DirectConversationType };
    try {
      const now = new Date();
      created = await this.prisma.directConversation.create({
        data: {
          workspaceId,
          createdById: userId,
          type:
            allMemberIds.length === 2
              ? DirectConversationType.one_to_one
              : DirectConversationType.group,
          oneToOneKey,
          title: allMemberIds.length === 2 ? null : title,
          lastMessageAt: now,
          members: {
            createMany: {
              data: allMemberIds.map((memberUserId) => ({
                userId: memberUserId,
              })),
            },
          },
        },
      });
    } catch (error) {
      if (oneToOneKey && this.isUniqueConstraintError(error)) {
        const existing = await this.findExistingOneToOne(
          workspaceId,
          oneToOneKey,
        );
        if (existing) {
          return this.getConversationById(userId, workspaceId, existing.id);
        }
      }

      throw error;
    }

    await this.systemMessageService.publishToDirectConversationSafe({
      workspaceId,
      directConversationId: created.id,
      actorUserId: userId,
      event: SystemMessageEvent.DM_CREATED,
      metadata: {
        type: created.type,
      },
    });

    return this.getConversationById(userId, workspaceId, created.id);
  }

  async listConversations(
    userId: string,
    workspaceId: string,
    query: ListDirectConversationsQueryDto,
  ) {
    await this.prisma.workspaceMember.findFirstOrThrow({
      where: {
        workspaceId,
        userId,
        isActive: true,
      },
      select: { workspaceId: true },
    });

    const limit = this.normalizeLimit(query.limit);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

    const conversations = await this.prisma.directConversation.findMany({
      where: {
        workspaceId,
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
        ...(cursor
          ? {
              OR: [
                { lastMessageAt: { lt: new Date(cursor.lastMessageAt) } },
                {
                  lastMessageAt: new Date(cursor.lastMessageAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: this.conversationInclude(),
    });

    const hasNext = conversations.length > limit;
    const pageItems = hasNext ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasNext
      ? this.encodeCursor(
          pageItems[pageItems.length - 1].lastMessageAt ??
            pageItems[pageItems.length - 1].updatedAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      conversations: pageItems.map((conversation) =>
        this.mapConversation(conversation),
      ),
    };
  }

  async getConversationById(
    userId: string,
    workspaceId: string,
    directConversationId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: directConversationId,
        workspaceId,
      },
      include: this.conversationInclude(),
    });

    if (!conversation) {
      throw new NotFoundException('Direct conversation not found');
    }

    return this.mapConversation(conversation);
  }

  async updateConversation(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    dto: UpdateDirectConversationDto,
  ) {
    const conversation = await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );
    this.dmAccessService.assertGroupConversation(conversation);

    await this.prisma.directConversation.update({
      where: { id: directConversationId },
      data: {
        title: this.normalizeTitle(dto.title),
      },
    });

    return this.getConversationById(userId, workspaceId, directConversationId);
  }

  async addMember(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    dto: AddDirectConversationMemberDto,
  ) {
    const conversation = await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );
    this.dmAccessService.assertGroupConversation(conversation);

    await this.assertWorkspaceMembers(workspaceId, [dto.userId]);

    const existing = await this.prisma.directConversationMember.findUnique({
      where: {
        directConversationId_userId: {
          directConversationId,
          userId: dto.userId,
        },
      },
    });

    if (existing?.leftAt === null) {
      throw new ConflictException('User is already in this DM');
    }

    if (existing) {
      await this.prisma.directConversationMember.update({
        where: {
          directConversationId_userId: {
            directConversationId,
            userId: dto.userId,
          },
        },
        data: {
          leftAt: null,
          joinedAt: new Date(),
        },
      });
    } else {
      await this.prisma.directConversationMember.create({
        data: {
          directConversationId,
          userId: dto.userId,
        },
      });
    }

    await this.systemMessageService.publishToDirectConversationSafe({
      workspaceId,
      directConversationId,
      actorUserId: userId,
      targetUserId: dto.userId,
      event: SystemMessageEvent.DM_MEMBER_ADDED,
    });

    return this.getConversationById(userId, workspaceId, directConversationId);
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    targetUserId: string,
  ) {
    const conversation = await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );
    this.dmAccessService.assertGroupConversation(conversation);

    await this.prisma.$transaction(async (tx) => {
      await this.lockDirectConversationMembership(tx, directConversationId);
      await this.assertCanDeactivateMemberInTransaction(
        tx,
        directConversationId,
        targetUserId,
      );

      await tx.directConversationMember.update({
        where: {
          directConversationId_userId: {
            directConversationId,
            userId: targetUserId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      await tx.userDmRead.deleteMany({
        where: {
          directConversationId,
          userId: targetUserId,
        },
      });
    });

    await this.systemMessageService.publishToDirectConversationSafe({
      workspaceId,
      directConversationId,
      actorUserId: userId,
      targetUserId: targetUserId,
      event: SystemMessageEvent.DM_MEMBER_REMOVED,
    });

    return { success: true };
  }

  async leaveConversation(
    userId: string,
    workspaceId: string,
    directConversationId: string,
  ) {
    const conversation = await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );
    this.dmAccessService.assertGroupConversation(conversation);

    await this.prisma.$transaction(async (tx) => {
      await this.lockDirectConversationMembership(tx, directConversationId);
      await this.assertCanDeactivateMemberInTransaction(
        tx,
        directConversationId,
        userId,
      );

      await tx.directConversationMember.update({
        where: {
          directConversationId_userId: {
            directConversationId,
            userId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      await tx.userDmRead.deleteMany({
        where: {
          directConversationId,
          userId,
        },
      });
    });

    await this.systemMessageService.publishToDirectConversationSafe({
      workspaceId,
      directConversationId,
      actorUserId: userId,
      event: SystemMessageEvent.DM_MEMBER_LEFT,
    });

    return { success: true };
  }

  conversationInclude() {
    return {
      members: {
        where: { leftAt: null },
        orderBy: [{ joinedAt: 'asc' as const }, { userId: 'asc' as const }],
        select: {
          userId: true,
          joinedAt: true,
          user: {
            select: {
              email: true,
              fullName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    };
  }

  private mapConversation(
    conversation: Prisma.DirectConversationGetPayload<{
      include: ReturnType<DmConversationService['conversationInclude']>;
    }>,
  ) {
    return {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      type: conversation.type,
      title: conversation.title,
      createdById: conversation.createdById,
      memberCount: conversation.members.length,
      members: conversation.members.map((member) => ({
        userId: member.userId,
        email: member.user.email,
        fullName: member.user.fullName,
        displayName: member.user.displayName,
        avatarUrl: member.user.avatarUrl,
        joinedAt: member.joinedAt,
      })),
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private normalizeParticipantIds(
    userId: string,
    participantUserIds: string[],
  ) {
    const normalized = Array.from(
      new Set(participantUserIds.map((item) => item.trim())),
    ).filter((item) => item !== userId);

    if (normalized.length === 0) {
      throw new BadRequestException(
        'At least one other participant is required for a DM',
      );
    }

    return normalized;
  }

  private normalizeTitle(title?: string) {
    const normalized = title?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  }

  private async assertWorkspaceMembers(workspaceId: string, userIds: string[]) {
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const memberIds = new Set(members.map((item) => item.userId));
    if (userIds.some((userId) => !memberIds.has(userId))) {
      throw new BadRequestException(
        'All DM participants must be active workspace members',
      );
    }
  }

  private async findExistingOneToOne(workspaceId: string, oneToOneKey: string) {
    return this.prisma.directConversation.findFirst({
      where: {
        workspaceId,
        type: DirectConversationType.one_to_one,
        oneToOneKey,
      },
      select: { id: true },
    });
  }

  private normalizeLimit(limit?: number) {
    const value = limit ?? DEFAULT_LIMIT;
    if (value < 1) {
      return 1;
    }
    if (value > MAX_LIMIT) {
      return MAX_LIMIT;
    }
    return value;
  }

  private buildOneToOneKey(userIds: string[]) {
    return [...userIds].sort().join(':');
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async lockDirectConversationMembership(
    tx: Prisma.TransactionClient,
    directConversationId: string,
  ) {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${directConversationId}))`,
    );
  }

  private async assertCanDeactivateMemberInTransaction(
    tx: Prisma.TransactionClient,
    directConversationId: string,
    userId: string,
  ) {
    const membership = await tx.directConversationMember.findUnique({
      where: {
        directConversationId_userId: {
          directConversationId,
          userId,
        },
      },
      select: {
        leftAt: true,
      },
    });

    if (!membership || membership.leftAt) {
      throw new NotFoundException('DM member not found');
    }

    const activeMembers = await tx.directConversationMember.count({
      where: {
        directConversationId,
        leftAt: null,
      },
    });

    if (activeMembers <= 1) {
      throw new BadRequestException(
        'Cannot remove or leave the last active member in a group DM',
      );
    }
  }

  private encodeCursor(lastMessageAt: Date, id: string) {
    const payload: ConversationCursor = {
      lastMessageAt: lastMessageAt.toISOString(),
      id,
    };

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): ConversationCursor {
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(raw) as Partial<ConversationCursor>;
      if (!parsed.lastMessageAt || !parsed.id) {
        throw new Error('Invalid cursor');
      }
      return {
        lastMessageAt: parsed.lastMessageAt,
        id: parsed.id,
      };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
