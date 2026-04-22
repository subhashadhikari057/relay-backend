import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRole, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { toSkipTake } from 'src/common/utils/pagination.util';
import { AuditService } from 'src/modules/audit/audit.service';
import { MobileOrganizationActivityQueryDto } from 'src/modules/audit/dto/mobile-organization-activity-query.dto';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionsPolicyService } from 'src/modules/permissions/services/permissions-policy.service';
import { OrganizationPolicyService } from '../shared/services/organization-policy.service';
import { toOrganizationInviteDto } from '../shared/utils/invite-mapper.util';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteOrganizationMemberDto } from './dto/invite-organization-member.dto';
import { ListMyOrganizationsDto } from './dto/list-my-organizations.dto';
import { TransferOrganizationOwnershipDto } from './dto/transfer-organization-ownership.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationMobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationPolicyService: OrganizationPolicyService,
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const name = dto.name.trim();
    const slug = await this.generateUniqueSlug(name);

    const organization = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name,
          slug,
          description: dto.description?.trim(),
          avatarUrl: dto.avatarUrl?.trim(),
          createdById: userId,
          isActive: true,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId,
          role: OrganizationRole.owner,
          isActive: true,
        },
      });

      return created;
    });

    await this.permissionsPolicyService.initializeOrganizationPolicies(
      organization.id,
    );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId: organization.id,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_CREATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organization.id,
      }),
    );

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      avatarUrl: organization.avatarUrl,
      role: OrganizationRole.owner,
    };
  }

  async listMyOrganizations(userId: string, query: ListMyOrganizationsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        isActive: true,
        organization: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatarUrl: true,
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
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        description: membership.organization.description,
        avatarUrl: membership.organization.avatarUrl,
        role: membership.role,
      })),
    };
  }

  async getOrganizationByIdForMember(userId: string, organizationId: string) {
    const membership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    const activeMembersCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      description: membership.organization.description,
      avatarUrl: membership.organization.avatarUrl,
      role: membership.role,
      membersCount: activeMembersCount,
    };
  }

  async getOrganizationBySlugForMember(userId: string, slug: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        isActive: true,
        organization: {
          slug,
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    const activeMembersCount = await this.prisma.organizationMember.count({
      where: {
        organizationId: membership.organizationId,
        isActive: true,
      },
    });

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      description: membership.organization.description,
      avatarUrl: membership.organization.avatarUrl,
      role: membership.role,
      membersCount: activeMembersCount,
    };
  }

  async updateOrganizationProfile(
    userId: string,
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) {
    const membership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    this.organizationPolicyService.assertCanManageMember(
      membership.role,
      OrganizationRole.member,
    );

    const data: Prisma.OrganizationUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl.trim();
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data,
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_PROFILE_UPDATED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
      }),
    );

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      avatarUrl: updated.avatarUrl,
      role: membership.role,
    };
  }

  async inviteMember(
    user: AuthJwtPayload,
    organizationId: string,
    dto: InviteOrganizationMemberDto,
  ) {
    const actorMembership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        user.sub,
        organizationId,
      );

    this.organizationPolicyService.assertCanInviteRole(
      actorMembership.role,
      dto.role,
    );

    const normalizedEmail = this.organizationPolicyService.normalizeEmail(
      dto.email,
    );
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership =
        await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId,
              userId: existingUser.id,
            },
          },
        });

      if (existingMembership?.isActive) {
        throw new ConflictException('User is already an active member');
      }
    }

    const pendingInvite = await this.prisma.organizationInvite.findFirst({
      where: {
        organizationId,
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

    const invite = await this.prisma.organizationInvite.create({
      data: {
        organizationId,
        email: normalizedEmail,
        role: dto.role,
        tokenHash,
        invitedById: user.sub,
        expiresAt,
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: user.sub,
        action: AuditAction.ORGANIZATION_INVITE_CREATED,
        entityType: AuditEntityType.ORGANIZATION_INVITE,
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

  async listInvitesForMember(userId: string, organizationId: string) {
    const actorMembership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    this.organizationPolicyService.assertCanInviteRole(
      actorMembership.role,
      OrganizationRole.member,
    );

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

  async revokeInviteForMember(
    userId: string,
    organizationId: string,
    inviteId: string,
  ) {
    const actorMembership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    this.organizationPolicyService.assertCanInviteRole(
      actorMembership.role,
      OrganizationRole.member,
    );

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

    if (invite.revokedAt) {
      return { success: true };
    }

    await this.prisma.organizationInvite.update({
      where: { id: invite.id },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_INVITE_REVOKED,
        entityType: AuditEntityType.ORGANIZATION_INVITE,
        entityId: invite.id,
      }),
    );

    return { success: true };
  }

  async acceptInvite(user: AuthJwtPayload, token: string) {
    const tokenHash = this.hashToken(token);

    const invite = await this.prisma.organizationInvite.findUnique({
      where: { tokenHash },
      include: {
        organization: {
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

    if (!invite.organization.isActive || invite.organization.deletedAt) {
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
      this.organizationPolicyService.normalizeEmail(userRecord.email) !==
      this.organizationPolicyService.normalizeEmail(invite.email)
    ) {
      throw new ForbiddenException(
        'Invite does not match authenticated user email',
      );
    }

    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: user.sub,
        },
      },
    });

    if (existingMembership?.isActive) {
      throw new ConflictException('User is already an active member');
    }

    await this.prisma.$transaction(async (tx) => {
      if (existingMembership) {
        await tx.organizationMember.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            role: invite.role,
            invitedById: invite.invitedById,
            joinedAt: new Date(),
          },
        });
      } else {
        await tx.organizationMember.create({
          data: {
            organizationId: invite.organizationId,
            userId: user.sub,
            role: invite.role,
            invitedById: invite.invitedById,
            isActive: true,
          },
        });
      }

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        organizationId: invite.organizationId,
        actorUserId: user.sub,
        action: AuditAction.ORGANIZATION_INVITE_ACCEPTED,
        entityType: AuditEntityType.ORGANIZATION_INVITE,
        entityId: invite.id,
      }),
    );

    return {
      success: true,
      organizationId: invite.organizationId,
      role: invite.role,
    };
  }

  async listMembers(userId: string, organizationId: string) {
    await this.organizationPolicyService.resolveMembershipOrThrow(
      userId,
      organizationId,
    );

    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
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

  async getMyMembership(userId: string, organizationId: string) {
    const membership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    const role = membership.role;
    const canInvite =
      role === OrganizationRole.owner || role === OrganizationRole.admin;
    const canManageMembers = canInvite;
    const canEditOrganization = canInvite;

    return {
      organizationId,
      userId,
      role,
      isActive: true,
      joinedAt: membership.joinedAt,
      canInvite,
      canManageMembers,
      canEditOrganization,
    };
  }

  async getOrganizationActivity(
    userId: string,
    organizationId: string,
    query: MobileOrganizationActivityQueryDto,
  ) {
    await this.organizationPolicyService.resolveMembershipOrThrow(
      userId,
      organizationId,
    );
    return this.auditService.listOrganizationActivity(organizationId, query);
  }

  async updateMemberRole(
    userId: string,
    organizationId: string,
    targetUserId: string,
    dto: UpdateOrganizationMemberRoleDto,
  ) {
    const actorMembership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    const targetMembership = await this.findActiveMembershipOrThrow(
      organizationId,
      targetUserId,
    );

    this.organizationPolicyService.assertCanManageMember(
      actorMembership.role,
      targetMembership.role,
      dto.role,
    );

    if (targetMembership.role === OrganizationRole.owner) {
      await this.organizationPolicyService.assertNotLastActiveOwner(
        organizationId,
        targetMembership,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextMembership = await tx.organizationMember.update({
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
        organizationId,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_MEMBER_ROLE_UPDATED,
        entityType: AuditEntityType.ORGANIZATION_MEMBER,
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
    organizationId: string,
    targetUserId: string,
  ) {
    const actorMembership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    const targetMembership = await this.findActiveMembershipOrThrow(
      organizationId,
      targetUserId,
    );

    this.organizationPolicyService.assertCanManageMember(
      actorMembership.role,
      targetMembership.role,
    );

    await this.organizationPolicyService.assertNotLastActiveOwner(
      organizationId,
      targetMembership,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.update({
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
        organizationId,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_MEMBER_REMOVED,
        entityType: AuditEntityType.ORGANIZATION_MEMBER,
        entityId: targetMembership.id,
        metadata: { targetUserId },
      }),
    );

    return {
      success: true,
    };
  }

  async transferOwnership(
    userId: string,
    organizationId: string,
    dto: TransferOrganizationOwnershipDto,
  ) {
    const actorMembership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        userId,
        organizationId,
      );

    if (actorMembership.role !== OrganizationRole.owner) {
      throw new ForbiddenException(
        'Only organization owner can transfer ownership',
      );
    }

    if (dto.newOwnerUserId === userId) {
      throw new BadRequestException(
        'Target owner must be different from current owner',
      );
    }

    const targetMembership = await this.findActiveMembershipOrThrow(
      organizationId,
      dto.newOwnerUserId,
    );

    if (targetMembership.role === OrganizationRole.guest) {
      throw new BadRequestException('Guest cannot become organization owner');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.update({
        where: { id: actorMembership.id },
        data: { role: OrganizationRole.admin },
      });

      await tx.organizationMember.update({
        where: { id: targetMembership.id },
        data: { role: OrganizationRole.owner },
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
        organizationId,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_OWNERSHIP_TRANSFERRED,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        metadata: { newOwnerUserId: dto.newOwnerUserId },
      }),
    );

    return {
      success: true,
      previousOwnerUserId: userId,
      newOwnerUserId: dto.newOwnerUserId,
    };
  }

  async leaveOrganization(userId: string, organizationId: string) {
    const membership = await this.findActiveMembershipOrThrow(
      organizationId,
      userId,
    );

    await this.organizationPolicyService.assertNotLastActiveOwner(
      organizationId,
      membership,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.update({
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
        organizationId,
        actorUserId: userId,
        action: AuditAction.ORGANIZATION_MEMBER_LEFT,
        entityType: AuditEntityType.ORGANIZATION_MEMBER,
        entityId: membership.id,
      }),
    );

    return { success: true };
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

  private async generateUniqueSlug(name: string) {
    const base = this.slugify(name);
    let attempt = 0;

    while (attempt < 20) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.organization.findUnique({
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
      throw new BadRequestException('Organization name is invalid');
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
