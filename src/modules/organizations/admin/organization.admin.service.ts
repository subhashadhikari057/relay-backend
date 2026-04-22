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
import { AdminOrganizationDeleteDto } from './dto/admin-organization-delete.dto';
import { AdminOrganizationStatusDto } from './dto/admin-organization-status.dto';
import { ListAdminOrganizationsDto } from './dto/list-admin-organizations.dto';
import { OrganizationPolicyService } from '../shared/services/organization-policy.service';
import { toOrganizationInviteDto } from '../shared/utils/invite-mapper.util';

@Injectable()
export class OrganizationAdminService {
  private readonly logger = new Logger(OrganizationAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationPolicyService: OrganizationPolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async listOrganizationsForAdmin(query: ListAdminOrganizationsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const where: Prisma.OrganizationWhereInput = {
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

    const organizations = await this.prisma.organization.findMany({
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
      count: organizations.length,
      organizations,
    };
  }

  async getOrganizationDetailsForAdmin(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const [activeMembersCount, pendingInvitesCount] = await Promise.all([
      this.prisma.organizationMember.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
      this.prisma.organizationInvite.count({
        where: {
          organizationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      ...organization,
      activeMembersCount,
      pendingInvitesCount,
    };
  }

  async setOrganizationStatus(
    organizationId: string,
    dto: AdminOrganizationStatusDto,
    actor: AuthJwtPayload,
  ) {
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        isActive: true,
      },
    });

    this.logger.log(
      `Admin status update by user=${actor.sub} org=${organizationId} isActive=${dto.isActive}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_STATUS_UPDATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        metadata: { isActive: dto.isActive },
      }),
    );

    return {
      success: true,
      organization,
    };
  }

  async setOrganizationDeleted(
    organizationId: string,
    dto: AdminOrganizationDeleteDto,
    actor: AuthJwtPayload,
  ) {
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        deletedAt: dto.deleted ? new Date() : null,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    this.logger.log(
      `Admin delete toggle by user=${actor.sub} org=${organizationId} deleted=${dto.deleted}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_SOFT_DELETE_UPDATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        metadata: { deleted: dto.deleted },
      }),
    );

    return {
      success: true,
      organization,
    };
  }

  async revokeInviteByAdmin(
    organizationId: string,
    inviteId: string,
    actor: AuthJwtPayload,
  ) {
    const invite = await this.prisma.organizationInvite.findFirst({
      where: {
        id: inviteId,
        organizationId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Invite is already accepted');
    }

    await this.prisma.organizationInvite.update({
      where: { id: invite.id },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(
      `Admin revoked invite by user=${actor.sub} org=${organizationId} invite=${inviteId}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_INVITE_REVOKED_BY_ADMIN,
        entityType: AuditEntityType.ORGANIZATION_INVITE,
        entityId: invite.id,
      }),
    );

    return { success: true };
  }

  async revokeMembershipByAdmin(
    organizationId: string,
    memberUserId: string,
    actor: AuthJwtPayload,
  ) {
    const membership = await this.findActiveMembershipOrThrow(
      organizationId,
      memberUserId,
    );

    await this.organizationPolicyService.assertNotLastActiveOwner(
      organizationId,
      membership,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.update({
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
      `Admin revoked membership by user=${actor.sub} org=${organizationId} targetUser=${memberUserId}`,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_MEMBER_REVOKED_BY_ADMIN,
        entityType: AuditEntityType.ORGANIZATION_MEMBER,
        entityId: membership.id,
        metadata: { targetUserId: memberUserId },
      }),
    );

    return { success: true };
  }

  async listInvitesForAdmin(organizationId: string) {
    await this.findOrganizationOrThrow(organizationId);

    const invites = await this.prisma.organizationInvite.findMany({
      where: { organizationId },
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
      invites: invites.map((invite) => toOrganizationInviteDto(invite)),
    };
  }

  async listMembersForAdmin(organizationId: string) {
    await this.findOrganizationOrThrow(organizationId);

    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
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

  async restoreOrganization(organizationId: string, actor: AuthJwtPayload) {
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
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

    this.logger.log(`Admin restore by user=${actor.sub} org=${organizationId}`);

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: actor.sub,
        action: AuditAction.ORGANIZATION_RESTORED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
      }),
    );

    return {
      success: true,
      organization,
    };
  }

  private async findActiveMembershipOrThrow(
    organizationId: string,
    userId: string,
  ) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Member not found');
    }

    return membership;
  }

  private async findOrganizationOrThrow(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }
}
