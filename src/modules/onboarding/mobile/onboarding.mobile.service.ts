import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  ChannelMemberRole,
  ChannelType,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from 'src/modules/audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import { AuthService } from 'src/modules/auth/shared/services/auth.service';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PermissionsPolicyService } from 'src/modules/permissions/services/permissions-policy.service';
import { SystemMessageEvent } from 'src/modules/system-messages/system-message.constants';
import { SystemMessageService } from 'src/modules/system-messages/system-message.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { WorkspaceInviteResponseDto } from 'src/modules/workspaces/shared/dto/workspace-invite-response.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class OnboardingMobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly systemMessageService: SystemMessageService,
  ) {}

  async completeOnboarding(user: AuthJwtPayload, dto: CompleteOnboardingDto) {
    const activeMemberships = await this.prisma.workspaceMember.count({
      where: {
        userId: user.sub,
        isActive: true,
        workspace: {
          isActive: true,
          deletedAt: null,
        },
      },
    });

    if (activeMemberships > 0) {
      throw new ConflictException('User has already completed onboarding');
    }

    const normalizedInvites = this.normalizeInvites(dto.invites ?? [], user);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.updateUserProfile(tx, user.sub, dto);

      const workspaceName = dto.workspace.name.trim();
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: await this.generateUniqueSlug(tx, workspaceName),
          description: dto.workspace.description?.trim(),
          avatarUrl: dto.workspace.avatarUrl?.trim(),
          avatarColor: dto.workspace.avatarColor?.trim(),
          createdById: user.sub,
          isActive: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.sub,
          role: WorkspaceRole.owner,
          isActive: true,
        },
      });

      const channel = await tx.channel.create({
        data: {
          workspaceId: workspace.id,
          createdById: user.sub,
          name: dto.firstChannel.name.trim(),
          topic: dto.firstChannel.topic?.trim(),
          description: dto.firstChannel.description?.trim(),
          type: dto.firstChannel.type ?? ChannelType.public,
        },
        include: {
          members: {
            select: { userId: true },
          },
          _count: {
            select: { members: true },
          },
        },
      });

      await tx.channelMember.create({
        data: {
          channelId: channel.id,
          userId: user.sub,
          role: ChannelMemberRole.admin,
        },
      });

      const channelForResponse = await tx.channel.findUniqueOrThrow({
        where: { id: channel.id },
        include: {
          members: {
            select: { userId: true },
          },
          _count: {
            select: { members: true },
          },
        },
      });

      const invites: WorkspaceInviteResponseDto[] = [];
      for (const invite of normalizedInvites) {
        const inviteToken = this.generateRawToken();
        const created = await tx.workspaceInvite.create({
          data: {
            workspaceId: workspace.id,
            email: invite.email,
            role: invite.role,
            tokenHash: this.hashToken(inviteToken),
            invitedById: user.sub,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        invites.push({
          inviteId: created.id,
          inviteToken,
          expiresAt: created.expiresAt,
        });
      }

      return {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          avatarUrl: workspace.avatarUrl,
          avatarColor: workspace.avatarColor,
          role: WorkspaceRole.owner,
        },
        firstChannel: this.mapChannel(channelForResponse, user.sub),
        invites,
      };
    });

    await this.permissionsPolicyService.initializeWorkspacePolicies(
      result.workspace.id,
    );

    await Promise.all([
      this.auditService.recordSafe(
        this.auditEventFactory.build({
          workspaceId: result.workspace.id,
          actorUserId: user.sub,
          action: AuditAction.WORKSPACE_CREATED,
          entityType: AuditEntityType.WORKSPACE,
          entityId: result.workspace.id,
          metadata: { source: 'onboarding' },
        }),
      ),
      this.auditService.recordSafe(
        this.auditEventFactory.build({
          workspaceId: result.workspace.id,
          actorUserId: user.sub,
          action: AuditAction.WORKSPACE_CHANNEL_CREATED,
          entityType: AuditEntityType.CHANNEL,
          entityId: result.firstChannel.id,
          metadata: {
            source: 'onboarding',
            name: result.firstChannel.name,
            type: result.firstChannel.type,
          },
        }),
      ),
      ...result.invites.map((invite) =>
        this.auditService.recordSafe(
          this.auditEventFactory.build({
            workspaceId: result.workspace.id,
            actorUserId: user.sub,
            action: AuditAction.WORKSPACE_INVITE_CREATED,
            entityType: AuditEntityType.WORKSPACE_INVITE,
            entityId: invite.inviteId,
            metadata: { source: 'onboarding' },
          }),
        ),
      ),
    ]);

    await this.systemMessageService.publishToChannelSafe({
      workspaceId: result.workspace.id,
      channelId: result.firstChannel.id,
      actorUserId: user.sub,
      event: SystemMessageEvent.WORKSPACE_CREATED,
      metadata: { source: 'onboarding' },
    });

    const auth = await this.authService.switchActiveWorkspace(
      user.sub,
      'mobile',
      user.sessionId,
      result.workspace.id,
    );

    return {
      accessToken: auth.accessToken,
      user: auth.user,
      activeWorkspaceId: result.workspace.id,
      workspace: result.workspace,
      firstChannel: result.firstChannel,
      invites: result.invites,
    };
  }

  private updateUserProfile(
    tx: Tx,
    userId: string,
    dto: CompleteOnboardingDto,
  ) {
    const data: Prisma.UserUpdateInput = {};

    if (dto.userProfile?.displayName !== undefined) {
      data.displayName = dto.userProfile.displayName.trim();
    }
    if (dto.userProfile?.avatarUrl !== undefined) {
      data.avatarUrl = dto.userProfile.avatarUrl.trim();
    }
    if (dto.userProfile?.avatarColor !== undefined) {
      data.avatarColor = dto.userProfile.avatarColor.trim();
    }

    if (Object.keys(data).length === 0) {
      return Promise.resolve();
    }

    return tx.user.update({
      where: { id: userId },
      data,
    });
  }

  private normalizeInvites(
    invites: NonNullable<CompleteOnboardingDto['invites']>,
    user: AuthJwtPayload,
  ) {
    const seen = new Set<string>();

    return invites.map((invite) => {
      const email = invite.email.trim().toLowerCase();
      if (email === user.email.trim().toLowerCase()) {
        throw new BadRequestException('You cannot invite yourself');
      }
      if (seen.has(email)) {
        throw new BadRequestException(`Duplicate invite email: ${email}`);
      }
      seen.add(email);

      const role = invite.role ?? WorkspaceRole.member;
      if (role === WorkspaceRole.owner) {
        throw new BadRequestException('Owner role cannot be invited directly');
      }

      return { email, role };
    });
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

  private async generateUniqueSlug(tx: Tx, name: string) {
    const base = this.slugify(name);
    let attempt = 0;

    while (attempt < 20) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await tx.workspace.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      attempt += 1;
    }

    return `${base}-${randomBytes(2).toString('hex')}`;
  }

  private slugify(input: string) {
    const normalized = input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    if (!normalized) {
      throw new BadRequestException('Workspace name is invalid');
    }

    return normalized.slice(0, 80);
  }

  private generateRawToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
