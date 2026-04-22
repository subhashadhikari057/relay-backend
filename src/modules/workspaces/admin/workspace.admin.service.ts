import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toSkipTake } from 'src/common/utils/pagination.util';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminWorkspaceDeleteDto } from './dto/admin-workspace-delete.dto';
import { AdminWorkspaceStatusDto } from './dto/admin-workspace-status.dto';
import { ListAdminWorkspacesDto } from './dto/list-admin-workspaces.dto';
import { WorkspacePolicyService } from '../shared/services/workspace-policy.service';
import { toWorkspaceInviteDto } from '../shared/utils/invite-mapper.util';

@Injectable()
export class WorkspaceAdminService {
  private readonly logger = new Logger(WorkspaceAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacePolicyService: WorkspacePolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async listWorkspacesForAdmin(query: ListAdminWorkspacesDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const where: Prisma.WorkspaceWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.deleted !== undefined
        ? query.deleted
          ? { deletedAt: { not: null } }
          : { deletedAt: null }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const workspaces = await this.prisma.workspace.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
      },
    });

    return {
      count: workspaces.length,
      workspaces,
    };
  }

  async getWorkspaceDetailsForAdmin(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const [activeMembersCount, pendingInvitesCount] = await Promise.all([
      this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          isActive: true,
        },
      }),
      this.prisma.workspaceInvite.count({
        where: {
          workspaceId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      ...workspace,
      activeMembersCount,
      pendingInvitesCount,
    };
  }

  async setWorkspaceStatus(
    workspaceId: string,
    dto: AdminWorkspaceStatusDto,
    actor: AuthJwtPayload,
  ) {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        isActive: true,
      },
    });

    this.logger.log(
      `Admin status update by user=${actor.sub} org=${workspaceId} isActive=${dto.isActive}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_STATUS_UPDATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: workspaceId,
        metadata: { isActive: dto.isActive },
      }),
    );

    return {
      success: true,
      workspace,
    };
  }

  async setWorkspaceDeleted(
    workspaceId: string,
    dto: AdminWorkspaceDeleteDto,
    actor: AuthJwtPayload,
  ) {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        deletedAt: dto.deleted ? new Date() : null,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    this.logger.log(
      `Admin delete toggle by user=${actor.sub} org=${workspaceId} deleted=${dto.deleted}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_SOFT_DELETE_UPDATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: workspaceId,
        metadata: { deleted: dto.deleted },
      }),
    );

    return {
      success: true,
      workspace,
    };
  }

  async revokeInviteByAdmin(
    workspaceId: string,
    inviteId: string,
    actor: AuthJwtPayload,
  ) {
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

    await this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(
      `Admin revoked invite by user=${actor.sub} org=${workspaceId} invite=${inviteId}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_INVITE_REVOKED_BY_ADMIN,
        entityType: AuditEntityType.ORGANIZATION_INVITE,
        entityId: invite.id,
      }),
    );

    return { success: true };
  }

  async revokeMembershipByAdmin(
    workspaceId: string,
    memberUserId: string,
    actor: AuthJwtPayload,
  ) {
    const membership = await this.findActiveMembershipOrThrow(
      workspaceId,
      memberUserId,
    );

    await this.workspacePolicyService.assertNotLastActiveOwner(
      workspaceId,
      membership,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { id: membership.id },
        data: { isActive: false },
      });

      await tx.user.update({
        where: { id: memberUserId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });
    });

    this.logger.log(
      `Admin revoked membership by user=${actor.sub} org=${workspaceId} targetUser=${memberUserId}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_MEMBER_REVOKED_BY_ADMIN,
        entityType: AuditEntityType.ORGANIZATION_MEMBER,
        entityId: membership.id,
        metadata: { targetUserId: memberUserId },
      }),
    );

    return { success: true };
  }

  async listInvitesForAdmin(workspaceId: string) {
    await this.findWorkspaceOrThrow(workspaceId);

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

  async listMembersForAdmin(workspaceId: string) {
    await this.findWorkspaceOrThrow(workspaceId);

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
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
      orderBy: [{ isActive: 'desc' }, { joinedAt: 'asc' }],
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

  async restoreWorkspace(workspaceId: string, actor: AuthJwtPayload) {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        deletedAt: true,
        isActive: true,
      },
    });

    this.logger.log(`Admin restore by user=${actor.sub} org=${workspaceId}`);

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_RESTORED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: workspaceId,
      }),
    );

    return {
      success: true,
      workspace,
    };
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

  private async findWorkspaceOrThrow(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }
}
