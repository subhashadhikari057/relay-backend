import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { WorkspaceRequestContext } from '../interfaces/workspace-request-context.interface';

type MembershipWithWorkspace = WorkspaceMember & {
  workspace: {
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
export class WorkspacePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMembershipOrThrow(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
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
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Workspace not found');
    }

    if (!membership.workspace.isActive || membership.workspace.deletedAt) {
      throw new NotFoundException('Workspace not found');
    }

    return membership;
  }

  toWorkspaceContext(
    membership: MembershipWithWorkspace,
  ): WorkspaceRequestContext {
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      description: membership.workspace.description,
      avatarUrl: membership.workspace.avatarUrl,
      role: membership.role,
    };
  }

  assertCanInviteRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole) {
    if (actorRole === WorkspaceRole.guest) {
      throw new ForbiddenException('Guest role cannot send invites');
    }

    if (targetRole === WorkspaceRole.owner) {
      throw new ForbiddenException('Owner role cannot be invited directly');
    }

    if (actorRole === WorkspaceRole.owner) {
      return;
    }

    if (
      actorRole === WorkspaceRole.admin &&
      (targetRole === WorkspaceRole.member ||
        targetRole === WorkspaceRole.guest)
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient workspace role');
  }

  assertCanManageMember(
    actorRole: WorkspaceRole,
    targetRole: WorkspaceRole,
    nextRole?: WorkspaceRole,
  ) {
    if (actorRole === WorkspaceRole.guest) {
      throw new ForbiddenException('Guest role cannot manage members');
    }

    if (actorRole === WorkspaceRole.owner) {
      return;
    }

    if (actorRole !== WorkspaceRole.admin) {
      throw new ForbiddenException('Insufficient workspace role');
    }

    if (
      targetRole === WorkspaceRole.owner ||
      targetRole === WorkspaceRole.admin
    ) {
      throw new ForbiddenException('Admin cannot manage owner/admin members');
    }

    if (
      nextRole &&
      nextRole !== WorkspaceRole.member &&
      nextRole !== WorkspaceRole.guest
    ) {
      throw new ForbiddenException('Admin can only assign member/guest role');
    }
  }

  async assertNotLastActiveOwner(
    workspaceId: string,
    membership: Pick<WorkspaceMember, 'id' | 'role' | 'isActive'>,
  ) {
    if (!membership.isActive || membership.role !== WorkspaceRole.owner) {
      return;
    }

    const activeOwnersCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId,
        role: WorkspaceRole.owner,
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
