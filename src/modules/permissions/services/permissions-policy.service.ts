import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  WorkspaceRole,
  PermissionPolicyRole,
  PermissionPolicyScope,
  Prisma,
  PlatformRole,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DEFAULT_PERMISSION_POLICIES,
  WORKSPACE_PERMISSION_RESOURCES,
  PLATFORM_PERMISSION_RESOURCES,
  PROTECTED_SUPERADMIN_PLATFORM_PERMISSIONS_MIN_MASK,
} from '../constants/permission-policies.constant';
import { PermissionScope } from '../constants/permission-scope.constant';
import type { PermissionMap } from '../types/permission-map.type';

type UpdatePolicyInput = {
  scope: PermissionScope;
  workspaceId?: string;
  role: PermissionPolicyRole;
  resource: string;
  mask: number;
  actorUserId: string;
};

type BulkUpdatePolicyInput = {
  scope: PermissionScope;
  workspaceId?: string;
  actorUserId: string;
  updates: Array<{
    role: PermissionPolicyRole;
    resource: string;
    mask: number;
  }>;
};

type PolicyClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PermissionsPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformPermissionMap(role: PlatformRole): Promise<PermissionMap> {
    const policyRole = this.toPolicyRoleFromPlatformRole(role);

    const persisted = await this.prisma.permissionPolicy.findMany({
      where: {
        scope: PermissionPolicyScope.platform,
        role: policyRole,
      },
      select: {
        resource: true,
        mask: true,
      },
    });

    return this.mergeWithDefaultMap(
      persisted,
      PermissionScope.platform,
      policyRole,
    );
  }

  async getWorkspacePermissionMap(
    workspaceId: string,
    role: WorkspaceRole,
  ): Promise<PermissionMap> {
    const policyRole = this.toPolicyRoleFromWorkspaceRole(role);

    const persisted = await this.prisma.permissionPolicy.findMany({
      where: {
        scope: PermissionPolicyScope.workspace,
        workspaceId,
        role: policyRole,
      },
      select: {
        resource: true,
        mask: true,
      },
    });

    return this.mergeWithDefaultMap(
      persisted,
      PermissionScope.workspace,
      policyRole,
    );
  }

  async initializeWorkspacePolicies(workspaceId: string) {
    const defaults = DEFAULT_PERMISSION_POLICIES.filter(
      (item) => item.scope === PermissionScope.workspace,
    );

    for (const item of defaults) {
      await this.upsertPolicyRow(this.prisma, {
        scope: PermissionScope.workspace,
        workspaceId,
        role: item.role,
        resource: item.resource,
        mask: item.mask,
      });
    }
  }

  async listPlatformPolicies() {
    const policies = await this.prisma.permissionPolicy.findMany({
      where: {
        scope: PermissionPolicyScope.platform,
      },
      orderBy: [{ role: 'asc' }, { resource: 'asc' }],
    });

    return {
      count: policies.length,
      policies,
    };
  }

  async listWorkspacePolicies(workspaceId: string) {
    const policies = await this.prisma.permissionPolicy.findMany({
      where: {
        scope: PermissionPolicyScope.workspace,
        workspaceId,
      },
      orderBy: [{ role: 'asc' }, { resource: 'asc' }],
    });

    return {
      count: policies.length,
      policies,
    };
  }

  async updateOnePolicy(input: UpdatePolicyInput) {
    this.assertMaskRange(input.mask);
    this.assertPolicyChangeAllowed(
      input.scope,
      input.role,
      input.resource,
      input.mask,
    );

    return this.prisma.$transaction(async (tx) => {
      const before = await this.findPolicyRow(tx, {
        scope: input.scope,
        workspaceId: input.workspaceId,
        role: input.role,
        resource: input.resource,
      });

      const updated = await this.upsertPolicyRow(tx, {
        scope: input.scope,
        workspaceId: input.workspaceId,
        role: input.role,
        resource: input.resource,
        mask: input.mask,
      });

      const affectedUserIds = await this.resolveAffectedUserIds(tx, {
        scope: input.scope,
        workspaceId: input.workspaceId,
        role: input.role,
      });

      if (affectedUserIds.length > 0) {
        await tx.user.updateMany({
          where: {
            id: {
              in: Array.from(new Set(affectedUserIds)),
            },
          },
          data: {
            tokenVersion: { increment: 1 },
          },
        });
      }

      return {
        policy: updated,
        beforeMask: before?.mask ?? null,
        afterMask: updated.mask,
        actorUserId: input.actorUserId,
      };
    });
  }

  async updateBulkPolicies(input: BulkUpdatePolicyInput) {
    return this.prisma.$transaction(async (tx) => {
      const updates = [] as Array<{
        policy: Awaited<ReturnType<typeof this.upsertPolicyRow>>;
        beforeMask: number | null;
        afterMask: number;
      }>;
      const affectedUserIds = new Set<string>();

      for (const item of input.updates) {
        this.assertMaskRange(item.mask);
        this.assertPolicyChangeAllowed(
          input.scope,
          item.role,
          item.resource,
          item.mask,
        );

        const before = await this.findPolicyRow(tx, {
          scope: input.scope,
          workspaceId: input.workspaceId,
          role: item.role,
          resource: item.resource,
        });

        const policy = await this.upsertPolicyRow(tx, {
          scope: input.scope,
          workspaceId: input.workspaceId,
          role: item.role,
          resource: item.resource,
          mask: item.mask,
        });

        const users = await this.resolveAffectedUserIds(tx, {
          scope: input.scope,
          workspaceId: input.workspaceId,
          role: item.role,
        });
        for (const userId of users) {
          affectedUserIds.add(userId);
        }

        updates.push({
          policy,
          beforeMask: before?.mask ?? null,
          afterMask: policy.mask,
        });
      }

      const uniqueUserIds = Array.from(affectedUserIds);
      if (uniqueUserIds.length > 0) {
        await tx.user.updateMany({
          where: {
            id: {
              in: uniqueUserIds,
            },
          },
          data: {
            tokenVersion: { increment: 1 },
          },
        });
      }

      return {
        count: updates.length,
        updates,
      };
    });
  }

  async assertWorkspaceOwnerCanManagePolicies(
    actorUserId: string,
    workspaceId: string,
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
      include: {
        workspace: {
          select: {
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Workspace not found');
    }

    if (!membership.workspace.isActive || membership.workspace.deletedAt) {
      throw new ForbiddenException('Workspace not found');
    }

    if (membership.role !== WorkspaceRole.owner) {
      throw new ForbiddenException('Only workspace owner can manage policies');
    }
  }

  toPolicyRoleFromPlatformRole(role: PlatformRole): PermissionPolicyRole {
    return role === PlatformRole.superadmin
      ? PermissionPolicyRole.superadmin
      : PermissionPolicyRole.user;
  }

  toPolicyRoleFromWorkspaceRole(role: WorkspaceRole): PermissionPolicyRole {
    switch (role) {
      case WorkspaceRole.owner:
        return PermissionPolicyRole.owner;
      case WorkspaceRole.admin:
        return PermissionPolicyRole.admin;
      case WorkspaceRole.member:
        return PermissionPolicyRole.member;
      case WorkspaceRole.guest:
        return PermissionPolicyRole.guest;
      default:
        return PermissionPolicyRole.guest;
    }
  }

  private assertPolicyChangeAllowed(
    scope: PermissionScope,
    role: PermissionPolicyRole,
    resource: string,
    mask: number,
  ) {
    if (
      scope === PermissionScope.platform &&
      role === PermissionPolicyRole.superadmin &&
      resource === 'platform.permissions' &&
      (mask & PROTECTED_SUPERADMIN_PLATFORM_PERMISSIONS_MIN_MASK) !==
        PROTECTED_SUPERADMIN_PLATFORM_PERMISSIONS_MIN_MASK
    ) {
      throw new BadRequestException(
        'Cannot remove required superadmin platform permission controls',
      );
    }

    if (
      scope === PermissionScope.workspace &&
      role === PermissionPolicyRole.owner
    ) {
      throw new BadRequestException('Owner role policies are protected');
    }
  }

  private assertMaskRange(mask: number) {
    if (!Number.isInteger(mask) || mask < 0 || mask > 15) {
      throw new BadRequestException('Mask must be an integer between 0 and 15');
    }
  }

  private async findPolicyRow(
    client: PolicyClient,
    input: {
      scope: PermissionScope;
      workspaceId?: string;
      role: PermissionPolicyRole;
      resource: string;
    },
  ) {
    return client.permissionPolicy.findFirst({
      where: {
        scope:
          input.scope === PermissionScope.platform
            ? PermissionPolicyScope.platform
            : PermissionPolicyScope.workspace,
        workspaceId:
          input.scope === PermissionScope.workspace ? input.workspaceId : null,
        role: input.role,
        resource: input.resource,
      },
    });
  }

  private async upsertPolicyRow(
    client: PolicyClient,
    input: {
      scope: PermissionScope;
      workspaceId?: string;
      role: PermissionPolicyRole;
      resource: string;
      mask: number;
    },
  ) {
    const existing = await this.findPolicyRow(client, input);

    if (existing) {
      return client.permissionPolicy.update({
        where: { id: existing.id },
        data: {
          mask: input.mask,
        },
      });
    }

    return client.permissionPolicy.create({
      data: {
        scope:
          input.scope === PermissionScope.platform
            ? PermissionPolicyScope.platform
            : PermissionPolicyScope.workspace,
        workspaceId:
          input.scope === PermissionScope.workspace
            ? (input.workspaceId ?? null)
            : null,
        role: input.role,
        resource: input.resource,
        mask: input.mask,
      },
    });
  }

  private mergeWithDefaultMap(
    persisted: Array<{ resource: string; mask: number }>,
    scope: PermissionScope,
    role: PermissionPolicyRole,
  ): PermissionMap {
    const defaultMap: PermissionMap = {};
    const resourceKeys =
      scope === PermissionScope.platform
        ? PLATFORM_PERMISSION_RESOURCES
        : WORKSPACE_PERMISSION_RESOURCES;

    for (const resource of resourceKeys) {
      const defaultItem = DEFAULT_PERMISSION_POLICIES.find(
        (item) =>
          item.scope === scope &&
          item.role === role &&
          item.resource === String(resource),
      );
      defaultMap[resource] = defaultItem?.mask ?? 0;
    }

    for (const row of persisted) {
      defaultMap[row.resource] = row.mask;
    }

    return defaultMap;
  }

  private async resolveAffectedUserIds(
    client: PolicyClient,
    input: {
      scope: PermissionScope;
      workspaceId?: string;
      role: PermissionPolicyRole;
    },
  ) {
    if (input.scope === PermissionScope.platform) {
      const platformRole =
        input.role === PermissionPolicyRole.superadmin
          ? PlatformRole.superadmin
          : PlatformRole.user;

      const users = await client.user.findMany({
        where: {
          platformRole,
        },
        select: {
          id: true,
        },
      });

      return users.map((user) => user.id);
    }

    if (!input.workspaceId) {
      return [];
    }

    const workspaceRole = this.toWorkspaceRole(input.role);
    if (!workspaceRole) {
      return [];
    }

    const memberships = await client.workspaceMember.findMany({
      where: {
        workspaceId: input.workspaceId,
        role: workspaceRole,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    return memberships.map((membership) => membership.userId);
  }

  private toWorkspaceRole(role: PermissionPolicyRole) {
    switch (role) {
      case PermissionPolicyRole.owner:
        return WorkspaceRole.owner;
      case PermissionPolicyRole.admin:
        return WorkspaceRole.admin;
      case PermissionPolicyRole.member:
        return WorkspaceRole.member;
      case PermissionPolicyRole.guest:
        return WorkspaceRole.guest;
      default:
        return null;
    }
  }
}
