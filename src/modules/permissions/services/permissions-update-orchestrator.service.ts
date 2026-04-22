import { Injectable } from '@nestjs/common';
import { PermissionPolicyRole } from '@prisma/client';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PermissionScope } from '../constants/permission-scope.constant';
import { PermissionsPolicyService } from './permissions-policy.service';

type PolicyUpdateInput = {
  workspaceId?: string;
  scope: PermissionScope;
  actor: AuthJwtPayload;
  role: PermissionPolicyRole;
  resource: string;
  mask: number;
};

type BulkPolicyUpdateInput = {
  workspaceId?: string;
  scope: PermissionScope;
  actor: AuthJwtPayload;
  updates: Array<{
    role: PermissionPolicyRole;
    resource: string;
    mask: number;
  }>;
};

@Injectable()
export class PermissionsUpdateOrchestratorService {
  constructor(
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async updateOne(input: PolicyUpdateInput) {
    const result = await this.permissionsPolicyService.updateOnePolicy({
      scope: input.scope,
      workspaceId: input.workspaceId,
      role: input.role,
      resource: input.resource,
      mask: input.mask,
      actorUserId: input.actor.sub,
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId: input.workspaceId,
        actorUserId: input.actor.sub,
        action:
          input.scope === PermissionScope.platform
            ? AuditAction.PERMISSION_PLATFORM_UPDATED
            : AuditAction.PERMISSION_ORGANIZATION_UPDATED,
        entityType: AuditEntityType.PERMISSION_POLICY,
        entityId: result.policy.id,
        metadata: {
          role: input.role,
          resource: input.resource,
          beforeMask: result.beforeMask,
          afterMask: result.afterMask,
        },
      }),
    );

    return result;
  }

  async updateBulk(input: BulkPolicyUpdateInput) {
    const result = await this.permissionsPolicyService.updateBulkPolicies({
      scope: input.scope,
      workspaceId: input.workspaceId,
      actorUserId: input.actor.sub,
      updates: input.updates,
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId: input.workspaceId,
        actorUserId: input.actor.sub,
        action:
          input.scope === PermissionScope.platform
            ? AuditAction.PERMISSION_PLATFORM_BULK_UPDATED
            : AuditAction.PERMISSION_ORGANIZATION_BULK_UPDATED,
        entityType: AuditEntityType.PERMISSION_POLICY,
        entityId: input.workspaceId ?? input.actor.sub,
        metadata: {
          count: result.count,
          updates: input.updates,
        },
      }),
    );

    return result;
  }
}
