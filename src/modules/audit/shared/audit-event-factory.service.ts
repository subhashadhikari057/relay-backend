import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntityType } from './audit.constants';

type BuildAuditEventInput = {
  workspaceId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditEventFactory {
  build(input: BuildAuditEventInput) {
    return {
      workspaceId: input.workspaceId ?? undefined,
      actorUserId: input.actorUserId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? undefined,
    };
  }
}
