import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChannelMemberRole,
  ChannelType,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { WorkspacePolicyService } from 'src/modules/workspaces/shared/services/workspace-policy.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ListChannelMembersQueryDto } from './dto/list-channel-members-query.dto';
import { ListChannelsQueryDto } from './dto/list-channels-query.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddChannelMemberDto } from './dto/add-channel-member.dto';

type ChannelListCursor = {
  createdAt: string;
  id: string;
};

type ChannelMembersCursor = {
  joinedAt: string;
  userId: string;
};

type ViewerMembership = {
  role: WorkspaceRole;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ChannelsMobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacePolicyService: WorkspacePolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async createChannel(
    userId: string,
    workspaceId: string,
    dto: CreateChannelDto,
  ) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);
    this.assertWorkspaceOwner(membership.role);
    const normalizedName = this.normalizeChannelName(dto.name);

    try {
      const channel = await this.prisma.$transaction(async (tx) => {
        const created = await tx.channel.create({
          data: {
            workspaceId,
            createdById: userId,
            name: normalizedName,
            topic: this.normalizeChannelTopic(dto.topic),
            description: this.normalizeChannelDescription(dto.description),
            type: dto.type ?? ChannelType.public,
            members: {
              create: {
                userId,
                role: ChannelMemberRole.admin,
              },
            },
          },
          include: {
            members: {
              where: { userId },
              select: { userId: true },
              take: 1,
            },
            _count: {
              select: { members: true },
            },
          },
        });

        return this.mapChannel(created, userId);
      });

      await this.auditService.recordSafe(
        this.auditEventFactory.build({
          workspaceId,
          actorUserId: userId,
          action: AuditAction.WORKSPACE_CHANNEL_CREATED,
          entityType: AuditEntityType.CHANNEL,
          entityId: channel.id,
          metadata: {
            name: channel.name,
            topic: channel.topic,
            description: channel.description,
            type: channel.type,
          },
        }),
      );

      return channel;
    } catch (error) {
      this.rethrowUniqueChannelNameError(error);
    }
  }

  async listChannels(
    userId: string,
    workspaceId: string,
    query: ListChannelsQueryDto,
  ) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);
    const includeArchived = query.includeArchived ?? false;
    const limit = this.normalizeLimit(query.limit);

    if (includeArchived) {
      this.assertCanViewArchived(membership.role);
    }

    const cursor = query.cursor ? this.decodeChannelCursor(query.cursor) : null;

    const where: Prisma.ChannelWhereInput = {
      workspaceId,
      ...(includeArchived ? {} : { isArchived: false }),
      ...this.buildChannelVisibilityWhere(userId, membership),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const channels = await this.prisma.channel.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        members: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
        _count: {
          select: { members: true },
        },
      },
    });

    const hasNext = channels.length > limit;
    const pageItems = hasNext ? channels.slice(0, limit) : channels;
    const nextCursor = hasNext
      ? this.encodeChannelCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      channels: pageItems.map((channel) => this.mapChannel(channel, userId)),
    };
  }

  async getChannelById(
    userId: string,
    workspaceId: string,
    channelId: string,
    includeArchived: boolean,
  ) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);

    if (includeArchived) {
      this.assertCanViewArchived(membership.role);
    }

    const channel = await this.findVisibleChannel({
      userId,
      workspaceId,
      channelId,
      includeArchived,
      membership,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.mapChannel(channel, userId);
  }

  async updateChannel(
    userId: string,
    workspaceId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);
    this.assertWorkspaceOwner(membership.role);

    const existing = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      select: {
        id: true,
        isArchived: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Channel not found');
    }

    if (existing.isArchived) {
      throw new BadRequestException('Archived channels cannot be updated');
    }

    const data: Prisma.ChannelUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = this.normalizeChannelName(dto.name);
    }
    if (dto.topic !== undefined) {
      data.topic = this.normalizeChannelTopic(dto.topic);
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeChannelDescription(dto.description);
    }
    if (dto.type !== undefined) {
      data.type = dto.type;
    }

    try {
      await this.prisma.channel.update({
        where: { id: channelId },
        data,
      });
    } catch (error) {
      this.rethrowUniqueChannelNameError(error);
    }

    const channel = await this.getChannelForResponse(
      channelId,
      workspaceId,
      userId,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_CHANNEL_UPDATED,
        entityType: AuditEntityType.CHANNEL,
        entityId: channel.id,
        metadata: {
          name: channel.name,
          topic: channel.topic,
          description: channel.description,
          type: channel.type,
        },
      }),
    );

    return channel;
  }

  async archiveChannel(userId: string, workspaceId: string, channelId: string) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);
    this.assertWorkspaceOwner(membership.role);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      select: {
        id: true,
        isArchived: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (!channel.isArchived) {
      await this.prisma.channel.update({
        where: { id: channel.id },
        data: { isArchived: true },
      });

      await this.auditService.recordSafe(
        this.auditEventFactory.build({
          workspaceId,
          actorUserId: userId,
          action: AuditAction.WORKSPACE_CHANNEL_ARCHIVED,
          entityType: AuditEntityType.CHANNEL,
          entityId: channel.id,
        }),
      );
    }

    return { success: true };
  }

  async joinChannel(userId: string, workspaceId: string, channelId: string) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
        isArchived: false,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.type !== ChannelType.public) {
      throw new BadRequestException(
        'Only public channels can be joined directly',
      );
    }

    const upserted = await this.prisma.channelMember.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
      update: {},
      create: {
        channelId,
        userId,
        role:
          membership.role === WorkspaceRole.owner
            ? ChannelMemberRole.admin
            : ChannelMemberRole.member,
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_CHANNEL_JOINED,
        entityType: AuditEntityType.CHANNEL_MEMBER,
        entityId: channelId,
        metadata: { channelId, userId: upserted.userId },
      }),
    );

    return { success: true };
  }

  async leaveChannel(userId: string, workspaceId: string, channelId: string) {
    await this.resolveViewerMembership(userId, workspaceId);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const existingMembership = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    if (!existingMembership) {
      throw new NotFoundException('Channel membership not found');
    }

    await this.assertNotLastChannelAdmin(channelId, existingMembership);

    await this.prisma.$transaction(async (tx) => {
      await tx.channelMember.delete({
        where: {
          channelId_userId: {
            channelId,
            userId,
          },
        },
      });

      await tx.userChannelRead.deleteMany({
        where: {
          channelId,
          userId,
        },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_CHANNEL_LEFT,
        entityType: AuditEntityType.CHANNEL_MEMBER,
        entityId: channelId,
        metadata: { channelId, userId },
      }),
    );

    return { success: true };
  }

  async listChannelMembers(
    userId: string,
    workspaceId: string,
    channelId: string,
    query: ListChannelMembersQueryDto,
  ) {
    const membership = await this.resolveViewerMembership(userId, workspaceId);
    const includeArchived = query.includeArchived ?? false;
    const limit = this.normalizeLimit(query.limit);

    if (includeArchived) {
      this.assertCanViewArchived(membership.role);
    }

    const channel = await this.findVisibleChannel({
      userId,
      workspaceId,
      channelId,
      includeArchived,
      membership,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const cursor = query.cursor ? this.decodeMembersCursor(query.cursor) : null;

    const where: Prisma.ChannelMemberWhereInput = {
      channelId,
      ...(cursor
        ? {
            OR: [
              { joinedAt: { gt: new Date(cursor.joinedAt) } },
              {
                joinedAt: new Date(cursor.joinedAt),
                userId: { gt: cursor.userId },
              },
            ],
          }
        : {}),
    };

    const members = await this.prisma.channelMember.findMany({
      where,
      orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
      take: limit + 1,
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            email: true,
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    const hasNext = members.length > limit;
    const pageItems = hasNext ? members.slice(0, limit) : members;
    const nextCursor = hasNext
      ? this.encodeMembersCursor(
          pageItems[pageItems.length - 1].joinedAt,
          pageItems[pageItems.length - 1].userId,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      members: pageItems.map((member) => ({
        userId: member.userId,
        email: member.user.email,
        fullName: member.user.fullName,
        displayName: member.user.displayName,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    };
  }

  async addChannelMember(
    actorUserId: string,
    workspaceId: string,
    channelId: string,
    dto: AddChannelMemberDto,
  ) {
    const membership = await this.resolveViewerMembership(
      actorUserId,
      workspaceId,
    );
    this.assertCanManagePrivateChannelMembers(membership.role);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      select: {
        id: true,
        type: true,
        isArchived: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.isArchived) {
      throw new BadRequestException(
        'Archived channel members cannot be managed',
      );
    }

    if (channel.type !== ChannelType.private) {
      throw new BadRequestException(
        'Member management endpoint is only for private channels',
      );
    }

    const targetWorkspaceMembership =
      await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.userId,
          },
        },
        select: {
          userId: true,
          isActive: true,
        },
      });

    if (!targetWorkspaceMembership || !targetWorkspaceMembership.isActive) {
      throw new BadRequestException(
        'Target user is not an active workspace member',
      );
    }

    const member = await this.prisma.channelMember.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId: dto.userId,
        },
      },
      update: {
        role: dto.role,
      },
      create: {
        channelId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
            displayName: true,
          },
        },
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId,
        action: AuditAction.WORKSPACE_CHANNEL_MEMBER_ADDED,
        entityType: AuditEntityType.CHANNEL_MEMBER,
        entityId: channelId,
        metadata: {
          channelId,
          userId: member.userId,
          role: member.role,
        },
      }),
    );

    return {
      userId: member.userId,
      email: member.user.email,
      fullName: member.user.fullName,
      displayName: member.user.displayName,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  async removeChannelMember(
    actorUserId: string,
    workspaceId: string,
    channelId: string,
    targetUserId: string,
  ) {
    const membership = await this.resolveViewerMembership(
      actorUserId,
      workspaceId,
    );
    this.assertCanManagePrivateChannelMembers(membership.role);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      select: {
        id: true,
        type: true,
        isArchived: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.isArchived) {
      throw new BadRequestException(
        'Archived channel members cannot be managed',
      );
    }

    if (channel.type !== ChannelType.private) {
      throw new BadRequestException(
        'Member management endpoint is only for private channels',
      );
    }

    const targetMembership = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Channel membership not found');
    }

    await this.assertNotLastChannelAdmin(channelId, targetMembership);

    await this.prisma.$transaction(async (tx) => {
      await tx.channelMember.delete({
        where: {
          channelId_userId: {
            channelId,
            userId: targetUserId,
          },
        },
      });

      await tx.userChannelRead.deleteMany({
        where: {
          channelId,
          userId: targetUserId,
        },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId,
        action: AuditAction.WORKSPACE_CHANNEL_MEMBER_REMOVED,
        entityType: AuditEntityType.CHANNEL_MEMBER,
        entityId: channelId,
        metadata: {
          channelId,
          targetUserId,
        },
      }),
    );

    return { success: true };
  }

  private async getChannelForResponse(
    channelId: string,
    workspaceId: string,
    userId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      include: {
        members: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.mapChannel(channel, userId);
  }

  private mapChannel(
    channel: {
      id: string;
      workspaceId: string;
      name: string;
      topic: string | null;
      description: string | null;
      type: ChannelType;
      isArchived: boolean;
      createdById: string;
      createdAt: Date;
      updatedAt: Date;
      members: Array<{ userId: string }>;
      _count: { members: number };
    },
    userId: string,
  ) {
    return {
      id: channel.id,
      workspaceId: channel.workspaceId,
      name: channel.name,
      topic: channel.topic,
      description: channel.description,
      type: channel.type,
      isArchived: channel.isArchived,
      createdById: channel.createdById,
      memberCount: channel._count.members,
      isMember: channel.members.some((member) => member.userId === userId),
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  private async resolveViewerMembership(userId: string, workspaceId: string) {
    return this.workspacePolicyService.resolveMembershipOrThrow(
      userId,
      workspaceId,
    );
  }

  private assertWorkspaceOwner(role: WorkspaceRole) {
    if (role !== WorkspaceRole.owner) {
      throw new ForbiddenException('Only workspace owner can manage channels');
    }
  }

  private assertCanManagePrivateChannelMembers(role: WorkspaceRole) {
    if (role !== WorkspaceRole.owner && role !== WorkspaceRole.admin) {
      throw new ForbiddenException(
        'Only workspace owner/admin can manage private channel members',
      );
    }
  }

  private assertCanViewArchived(role: WorkspaceRole) {
    if (role !== WorkspaceRole.owner && role !== WorkspaceRole.admin) {
      throw new ForbiddenException(
        'Only workspace owner/admin can include archived channels',
      );
    }
  }

  private buildChannelVisibilityWhere(
    userId: string,
    membership: ViewerMembership,
  ): Prisma.ChannelWhereInput {
    if (
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin
    ) {
      return {};
    }

    return {
      OR: [{ type: ChannelType.public }, { members: { some: { userId } } }],
    };
  }

  private async findVisibleChannel(input: {
    userId: string;
    workspaceId: string;
    channelId: string;
    includeArchived: boolean;
    membership: ViewerMembership;
  }) {
    return this.prisma.channel.findFirst({
      where: {
        id: input.channelId,
        workspaceId: input.workspaceId,
        ...(input.includeArchived ? {} : { isArchived: false }),
        ...this.buildChannelVisibilityWhere(input.userId, input.membership),
      },
      include: {
        members: {
          where: { userId: input.userId },
          select: { userId: true },
          take: 1,
        },
        _count: {
          select: { members: true },
        },
      },
    });
  }

  private normalizeLimit(limit?: number) {
    if (!limit) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(limit, MAX_LIMIT));
  }

  private normalizeChannelName(name: string) {
    const normalized = name.trim();
    if (normalized.length < 2 || normalized.length > 80) {
      throw new BadRequestException(
        'Channel name must be between 2 and 80 characters after trimming',
      );
    }

    return normalized;
  }

  private normalizeChannelDescription(description?: string) {
    if (description === undefined) {
      return undefined;
    }

    const normalized = description.trim();
    if (normalized.length === 0) {
      return null;
    }

    if (normalized.length > 500) {
      throw new BadRequestException(
        'Channel description must be at most 500 characters after trimming',
      );
    }

    return normalized;
  }

  private normalizeChannelTopic(topic?: string) {
    if (topic === undefined) {
      return undefined;
    }

    const normalized = topic.trim();
    if (normalized.length === 0) {
      return null;
    }

    if (normalized.length > 250) {
      throw new BadRequestException(
        'Channel topic must be at most 250 characters after trimming',
      );
    }

    return normalized;
  }

  private encodeChannelCursor(createdAt: Date, id: string) {
    return Buffer.from(
      JSON.stringify({
        createdAt: createdAt.toISOString(),
        id,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeChannelCursor(cursor: string): ChannelListCursor {
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(raw) as Partial<ChannelListCursor>;

      if (!parsed.createdAt || !parsed.id) {
        throw new Error('invalid');
      }

      return { createdAt: parsed.createdAt, id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid channel cursor');
    }
  }

  private encodeMembersCursor(joinedAt: Date, userId: string) {
    return Buffer.from(
      JSON.stringify({
        joinedAt: joinedAt.toISOString(),
        userId,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeMembersCursor(cursor: string): ChannelMembersCursor {
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(raw) as Partial<ChannelMembersCursor>;

      if (!parsed.joinedAt || !parsed.userId) {
        throw new Error('invalid');
      }

      return { joinedAt: parsed.joinedAt, userId: parsed.userId };
    } catch {
      throw new BadRequestException('Invalid channel members cursor');
    }
  }

  private async assertNotLastChannelAdmin(
    channelId: string,
    member: {
      role: ChannelMemberRole;
    },
  ) {
    if (member.role !== ChannelMemberRole.admin) {
      return;
    }

    const adminCount = await this.prisma.channelMember.count({
      where: {
        channelId,
        role: ChannelMemberRole.admin,
      },
    });

    if (adminCount <= 1) {
      throw new ConflictException(
        'Cannot remove or leave as the last channel admin. Promote another member first.',
      );
    }
  }

  private rethrowUniqueChannelNameError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException(
        'Channel name already exists in this workspace',
      );
    }

    throw error;
  }
}
