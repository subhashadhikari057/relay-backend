import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationMember, OrganizationRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrganizationRequestContext } from '../interfaces/organization-request-context.interface';

type MembershipWithOrganization = OrganizationMember & {
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    deletedAt: Date | null;
  };
};

@Injectable()
export class OrganizationPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMembershipOrThrow(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
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
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Organization not found');
    }

    if (
      !membership.organization.isActive ||
      membership.organization.deletedAt
    ) {
      throw new NotFoundException('Organization not found');
    }

    return membership;
  }

  toOrganizationContext(
    membership: MembershipWithOrganization,
  ): OrganizationRequestContext {
    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      description: membership.organization.description,
      avatarUrl: membership.organization.avatarUrl,
      role: membership.role,
    };
  }

  assertCanInviteRole(
    actorRole: OrganizationRole,
    targetRole: OrganizationRole,
  ) {
    if (actorRole === OrganizationRole.guest) {
      throw new ForbiddenException('Guest role cannot send invites');
    }

    if (targetRole === OrganizationRole.owner) {
      throw new ForbiddenException('Owner role cannot be invited directly');
    }

    if (actorRole === OrganizationRole.owner) {
      return;
    }

    if (
      actorRole === OrganizationRole.admin &&
      (targetRole === OrganizationRole.member ||
        targetRole === OrganizationRole.guest)
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient organization role');
  }

  assertCanManageMember(
    actorRole: OrganizationRole,
    targetRole: OrganizationRole,
    nextRole?: OrganizationRole,
  ) {
    if (actorRole === OrganizationRole.guest) {
      throw new ForbiddenException('Guest role cannot manage members');
    }

    if (actorRole === OrganizationRole.owner) {
      return;
    }

    if (actorRole !== OrganizationRole.admin) {
      throw new ForbiddenException('Insufficient organization role');
    }

    if (
      targetRole === OrganizationRole.owner ||
      targetRole === OrganizationRole.admin
    ) {
      throw new ForbiddenException('Admin cannot manage owner/admin members');
    }

    if (
      nextRole &&
      nextRole !== OrganizationRole.member &&
      nextRole !== OrganizationRole.guest
    ) {
      throw new ForbiddenException('Admin can only assign member/guest role');
    }
  }

  async assertNotLastActiveOwner(
    organizationId: string,
    membership: Pick<OrganizationMember, 'id' | 'role' | 'isActive'>,
  ) {
    if (!membership.isActive || membership.role !== OrganizationRole.owner) {
      return;
    }

    const activeOwnersCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        role: OrganizationRole.owner,
        isActive: true,
      },
    });

    if (activeOwnersCount <= 1) {
      throw new ConflictException('Cannot remove or demote the last owner');
    }
  }

  normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
