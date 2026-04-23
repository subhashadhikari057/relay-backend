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
  WorkspaceRole,
  Prisma,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { toSkipTake } from 'src/common/utils/pagination.util';
import { AuditService } from 'src/modules/audit/audit.service';
import { MobileWorkspaceActivityQueryDto } from 'src/modules/audit/dto/mobile-workspace-activity-query.dto';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionsPolicyService } from 'src/modules/permissions/services/permissions-policy.service';
import { SystemMessageEvent } from 'src/modules/system-messages/system-message.constants';
import { SystemMessageService } from 'src/modules/system-messages/system-message.service';
import { WorkspacePolicyService } from '../shared/services/workspace-policy.service';
import { toWorkspaceInviteDto } from '../shared/utils/invite-mapper.util';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { ListMyWorkspacesDto } from './dto/list-my-workspaces.dto';
import { TransferWorkspaceOwnershipDto } from './dto/transfer-workspace-ownership.dto';
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspaceMobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacePolicyService: WorkspacePolicyService,
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly systemMessageService: SystemMessageService,
  ) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const name = dto.name.trim();
    const slug = await this.generateUniqueSlug(name);

    const workspace = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name,
          slug,
          description: dto.description?.trim(),
          avatarUrl: dto.avatarUrl?.trim(),
          avatarColor: dto.avatarColor?.trim(),
          createdById: userId,
          isActive: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: created.id,
          userId,
          role: WorkspaceRole.owner,
          isActive: true,
        },
      });

      const generalChannel = await tx.channel.upsert({
        where: {
          workspaceId_name: {
            workspaceId: created.id,
            name: 'general',
          },
        },
        update: {},
        create: {
          workspaceId: created.id,
          createdById: userId,
          name: 'general',
          type: ChannelType.public,
        },
      });

      await tx.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId: generalChannel.id,
            userId,
          },
        },
        update: {
          role: ChannelMemberRole.admin,
        },
        create: {
          channelId: generalChannel.id,
          userId,
          role: ChannelMemberRole.admin,
        },
      });

      return created;
    });

    await this.permissionsPolicyService.initializeWorkspacePolicies(
      workspace.id,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId: workspace.id,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_CREATED,
        entityType: AuditEntityType.WORKSPACE,
        entityId: workspace.id,
      }),
    );

    await this.systemMessageService.publishToWorkspaceGeneralSafe({
      workspaceId: workspace.id,
      actorUserId: userId,
      event: SystemMessageEvent.WORKSPACE_CREATED,
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      avatarUrl: workspace.avatarUrl,
      avatarColor: workspace.avatarColor,
      role: WorkspaceRole.owner,
    };
  }

  async listMyWorkspaces(userId: string, query: ListMyWorkspacesDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        isActive: true,
        workspace: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatarUrl: true,
            avatarColor: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
      skip,
      take,
    });

    return {
      count: memberships.length,
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        description: membership.workspace.description,
        avatarUrl: membership.workspace.avatarUrl,
        avatarColor: membership.workspace.avatarColor,
        role: membership.role,
      })),
    };
  }

  async getWorkspaceByIdForMember(userId: string, workspaceId: string) {
    const membership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    const activeMembersCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      description: membership.workspace.description,
      avatarUrl: membership.workspace.avatarUrl,
      avatarColor: membership.workspace.avatarColor,
      role: membership.role,
      membersCount: activeMembersCount,
    };
  }

  async getWorkspaceBySlugForMember(userId: string, slug: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        isActive: true,
        workspace: {
          slug,
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatarUrl: true,
            avatarColor: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    const activeMembersCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId: membership.workspaceId,
        isActive: true,
      },
    });

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      description: membership.workspace.description,
      avatarUrl: membership.workspace.avatarUrl,
      avatarColor: membership.workspace.avatarColor,
      role: membership.role,
      membersCount: activeMembersCount,
    };
  }

  async updateWorkspaceProfile(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ) {
    const membership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    this.workspacePolicyService.assertCanManageMember(
      membership.role,
      WorkspaceRole.member,
    );

    const data: Prisma.WorkspaceUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl.trim();
    }
    if (dto.avatarColor !== undefined) {
      data.avatarColor = dto.avatarColor.trim();
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_PROFILE_UPDATED,
        entityType: AuditEntityType.WORKSPACE,
        entityId: workspaceId,
      }),
    );

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      avatarUrl: updated.avatarUrl,
      avatarColor: updated.avatarColor,
      role: membership.role,
    };
  }

  async inviteMember(
    user: AuthJwtPayload,
    workspaceId: string,
    dto: InviteWorkspaceMemberDto,
  ) {
    const actorMembership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        user.sub,
        workspaceId,
      );

    this.workspacePolicyService.assertCanInviteRole(
      actorMembership.role,
      dto.role,
    );

    const normalizedEmail = this.workspacePolicyService.normalizeEmail(
      dto.email,
    );
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership?.isActive) {
        throw new ConflictException('User is already an active member');
      }
    }

    const pendingInvite = await this.prisma.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });

    if (pendingInvite) {
      throw new ConflictException(
        'Pending invite already exists for this email',
      );
    }

    const inviteToken = this.generateRawToken();
    const tokenHash = this.hashToken(inviteToken);
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role: dto.role,
        tokenHash,
        invitedById: user.sub,
        expiresAt,
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: user.sub,
        action: AuditAction.WORKSPACE_INVITE_CREATED,
        entityType: AuditEntityType.WORKSPACE_INVITE,
        entityId: invite.id,
        metadata: {
          email: normalizedEmail,
          role: invite.role,
        },
      }),
    );

    return {
      inviteId: invite.id,
      inviteToken,
      expiresAt: invite.expiresAt,
    };
  }

  async listInvitesForMember(userId: string, workspaceId: string) {
    const actorMembership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    this.workspacePolicyService.assertCanInviteRole(
      actorMembership.role,
      WorkspaceRole.member,
    );

    const invites = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId },
      include: {
        invitedBy: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      count: invites.length,
      invites: invites.map((invite) => toWorkspaceInviteDto(invite)),
    };
  }

  async revokeInviteForMember(
    userId: string,
    workspaceId: string,
    inviteId: string,
  ) {
    const actorMembership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    this.workspacePolicyService.assertCanInviteRole(
      actorMembership.role,
      WorkspaceRole.member,
    );

    const invite = await this.prisma.workspaceInvite.findFirst({
      where: {
        id: inviteId,
        workspaceId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Invite is already accepted');
    }

    if (invite.revokedAt) {
      return { success: true };
    }

    await this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_INVITE_REVOKED,
        entityType: AuditEntityType.WORKSPACE_INVITE,
        entityId: invite.id,
      }),
    );

    return { success: true };
  }

  async acceptInvite(user: AuthJwtPayload, token: string) {
    const tokenHash = this.hashToken(token);

    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { tokenHash },
      include: {
        workspace: {
          select: {
            id: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!invite.workspace.isActive || invite.workspace.deletedAt) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.revokedAt) {
      throw new BadRequestException('Invite has been revoked');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Invite has already been used');
    }

    if (invite.expiresAt <= new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true },
    });

    if (!userRecord) {
      throw new NotFoundException('User not found');
    }

    if (
      this.workspacePolicyService.normalizeEmail(userRecord.email) !==
      this.workspacePolicyService.normalizeEmail(invite.email)
    ) {
      throw new ForbiddenException(
        'Invite does not match authenticated user email',
      );
    }

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: user.sub,
        },
      },
    });

    if (existingMembership?.isActive) {
      throw new ConflictException('User is already an active member');
    }

    await this.prisma.$transaction(async (tx) => {
      if (existingMembership) {
        await tx.workspaceMember.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            role: invite.role,
            invitedById: invite.invitedById,
            joinedAt: new Date(),
          },
        });
      } else {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.sub,
            role: invite.role,
            invitedById: invite.invitedById,
            isActive: true,
          },
        });
      }

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId: invite.workspaceId,
        actorUserId: user.sub,
        action: AuditAction.WORKSPACE_INVITE_ACCEPTED,
        entityType: AuditEntityType.WORKSPACE_INVITE,
        entityId: invite.id,
      }),
    );

    await this.systemMessageService.publishToWorkspaceGeneralSafe({
      workspaceId: invite.workspaceId,
      actorUserId: user.sub,
      targetUserId: user.sub,
      event: SystemMessageEvent.WORKSPACE_MEMBER_JOINED,
      metadata: {
        inviteId: invite.id,
        role: invite.role,
      },
    });

    return {
      success: true,
      workspaceId: invite.workspaceId,
      role: invite.role,
    };
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.workspacePolicyService.resolveMembershipOrThrow(
      userId,
      workspaceId,
    );

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return {
      count: members.length,
      members: members.map((member) => ({
        membershipId: member.id,
        userId: member.user.id,
        email: member.user.email,
        fullName: member.user.fullName,
        displayName: member.user.displayName,
        role: member.role,
        joinedAt: member.joinedAt,
        invitedById: member.invitedById,
        isActive: member.isActive,
      })),
    };
  }

  async getMyMembership(userId: string, workspaceId: string) {
    const membership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    const role = membership.role;
    const canInvite =
      role === WorkspaceRole.owner || role === WorkspaceRole.admin;
    const canManageMembers = canInvite;
    const canEditWorkspace = canInvite;

    return {
      workspaceId,
      userId,
      role,
      isActive: true,
      joinedAt: membership.joinedAt,
      canInvite,
      canManageMembers,
      canEditWorkspace,
    };
  }

  async getWorkspaceActivity(
    userId: string,
    workspaceId: string,
    query: MobileWorkspaceActivityQueryDto,
  ) {
    await this.workspacePolicyService.resolveMembershipOrThrow(
      userId,
      workspaceId,
    );
    return this.auditService.listWorkspaceActivity(workspaceId, query);
  }

  async updateMemberRole(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateWorkspaceMemberRoleDto,
  ) {
    const actorMembership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    const targetMembership = await this.findActiveMembershipOrThrow(
      workspaceId,
      targetUserId,
    );

    this.workspacePolicyService.assertCanManageMember(
      actorMembership.role,
      targetMembership.role,
      dto.role,
    );

    if (targetMembership.role === WorkspaceRole.owner) {
      await this.workspacePolicyService.assertNotLastActiveOwner(
        workspaceId,
        targetMembership,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextMembership = await tx.workspaceMember.update({
        where: { id: targetMembership.id },
        data: {
          role: dto.role,
        },
      });

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });

      return nextMembership;
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MEMBER_ROLE_UPDATED,
        entityType: AuditEntityType.WORKSPACE_MEMBER,
        entityId: updated.id,
        metadata: { targetUserId, role: updated.role },
      }),
    );

    return {
      success: true,
      role: updated.role,
    };
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ) {
    const actorMembership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    const targetMembership = await this.findActiveMembershipOrThrow(
      workspaceId,
      targetUserId,
    );

    this.workspacePolicyService.assertCanManageMember(
      actorMembership.role,
      targetMembership.role,
    );

    await this.workspacePolicyService.assertNotLastActiveOwner(
      workspaceId,
      targetMembership,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { id: targetMembership.id },
        data: { isActive: false },
      });

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MEMBER_REMOVED,
        entityType: AuditEntityType.WORKSPACE_MEMBER,
        entityId: targetMembership.id,
        metadata: { targetUserId },
      }),
    );

    await this.systemMessageService.publishToWorkspaceGeneralSafe({
      workspaceId,
      actorUserId: userId,
      targetUserId,
      event: SystemMessageEvent.WORKSPACE_MEMBER_REMOVED,
    });

    return {
      success: true,
    };
  }

  async transferOwnership(
    userId: string,
    workspaceId: string,
    dto: TransferWorkspaceOwnershipDto,
  ) {
    const actorMembership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        userId,
        workspaceId,
      );

    if (actorMembership.role !== WorkspaceRole.owner) {
      throw new ForbiddenException(
        'Only workspace owner can transfer ownership',
      );
    }

    if (dto.newOwnerUserId === userId) {
      throw new BadRequestException(
        'Target owner must be different from current owner',
      );
    }

    const targetMembership = await this.findActiveMembershipOrThrow(
      workspaceId,
      dto.newOwnerUserId,
    );

    if (targetMembership.role === WorkspaceRole.guest) {
      throw new BadRequestException('Guest cannot become workspace owner');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { id: actorMembership.id },
        data: { role: WorkspaceRole.admin },
      });

      await tx.workspaceMember.update({
        where: { id: targetMembership.id },
        data: { role: WorkspaceRole.owner },
      });

      await tx.user.updateMany({
        where: {
          id: {
            in: [userId, dto.newOwnerUserId],
          },
        },
        data: {
          tokenVersion: { increment: 1 },
        },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_OWNERSHIP_TRANSFERRED,
        entityType: AuditEntityType.WORKSPACE,
        entityId: workspaceId,
        metadata: { newOwnerUserId: dto.newOwnerUserId },
      }),
    );

    await this.systemMessageService.publishToWorkspaceGeneralSafe({
      workspaceId,
      actorUserId: userId,
      targetUserId: dto.newOwnerUserId,
      event: SystemMessageEvent.WORKSPACE_OWNERSHIP_TRANSFERRED,
    });

    return {
      success: true,
      previousOwnerUserId: userId,
      newOwnerUserId: dto.newOwnerUserId,
    };
  }

  async leaveWorkspace(userId: string, workspaceId: string) {
    const membership = await this.findActiveMembershipOrThrow(
      workspaceId,
      userId,
    );

    await this.workspacePolicyService.assertNotLastActiveOwner(
      workspaceId,
      membership,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { id: membership.id },
        data: {
          isActive: false,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MEMBER_LEFT,
        entityType: AuditEntityType.WORKSPACE_MEMBER,
        entityId: membership.id,
      }),
    );

    await this.systemMessageService.publishToWorkspaceGeneralSafe({
      workspaceId,
      actorUserId: userId,
      targetUserId: userId,
      event: SystemMessageEvent.WORKSPACE_MEMBER_LEFT,
    });

    return { success: true };
  }

  private async findActiveMembershipOrThrow(
    workspaceId: string,
    userId: string,
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Member not found');
    }

    return membership;
  }

  private async generateUniqueSlug(name: string) {
    const base = this.slugify(name);
    let attempt = 0;

    while (attempt < 20) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.workspace.findUnique({
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
