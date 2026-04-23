import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { MobileMyAuditQueryDto } from './dto/mobile-my-audit-query.dto';
import { MobileWorkspaceActivityQueryDto } from './dto/mobile-workspace-activity-query.dto';
import { AuditAction, AuditEntityType } from './shared/audit.constants';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_ORG_ACTIVITY_LIMIT = 25;

type RecordAuditInput = {
  workspaceId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
};

type AuditRow = {
  id: string;
  workspaceId: string | null;
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
};

type AuditListFilters = {
  workspaceId?: string;
  actorUserId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput) {
    await this.prisma.auditLog.create({
      data: {
        id: randomUUID(),
        workspaceId: input.workspaceId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async recordSafe(input: RecordAuditInput) {
    try {
      await this.record(input);
    } catch (error) {
      this.logger.error(
        `Failed to record audit event action=${input.action} entityType=${input.entityType} entityId=${input.entityId}`,
      );
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
    }
  }

  async listWorkspaceActivity(
    workspaceId: string,
    query: MobileWorkspaceActivityQueryDto,
  ) {
    const limit = query.limit ?? DEFAULT_ORG_ACTIVITY_LIMIT;

    const items = await this.prisma.$queryRawUnsafe<AuditRow[]>(
      `SELECT
        id,
        workspace_id as "workspaceId",
        actor_user_id as "actorUserId",
        action,
        entity_type as "entityType",
        entity_id as "entityId",
        metadata,
        created_at as "createdAt"
      FROM "audit_logs"
      WHERE workspace_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      workspaceId,
      limit,
    );

    return {
      count: items.length,
      activities: items.map((item) => this.toAuditItemDto(item)),
    };
  }

  async listAdminAudit(query: AdminAuditQueryDto, workspaceId?: string) {
    if (workspaceId && query.workspaceId && workspaceId !== query.workspaceId) {
      const normalizedPage = query.page ?? DEFAULT_PAGE;
      const normalizedLimit = query.limit ?? DEFAULT_LIMIT;
      return {
        count: 0,
        page: normalizedPage,
        limit: normalizedLimit,
        items: [],
      };
    }

    return this.listAuditPage(
      {
        workspaceId: workspaceId ?? query.workspaceId,
        actorUserId: query.actorUserId,
        action: query.action,
        from: query.from,
        to: query.to,
      },
      query.page,
      query.limit,
    );
  }

  async listMyAudit(userId: string, query: MobileMyAuditQueryDto) {
    return this.listAuditPage(
      {
        actorUserId: userId,
        workspaceId: query.workspaceId,
        action: query.action,
        from: query.from,
        to: query.to,
      },
      query.page,
      query.limit,
    );
  }

  private async listAuditPage(
    filters: AuditListFilters,
    page?: number,
    limit?: number,
  ) {
    const normalizedPage = page ?? DEFAULT_PAGE;
    const normalizedLimit = limit ?? DEFAULT_LIMIT;
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    const pushParam = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.workspaceId) {
      whereClauses.push(`workspace_id = ${pushParam(filters.workspaceId)}`);
    }
    if (filters.actorUserId) {
      whereClauses.push(`actor_user_id = ${pushParam(filters.actorUserId)}`);
    }
    if (filters.action) {
      whereClauses.push(`action = ${pushParam(filters.action)}`);
    }
    if (filters.from) {
      whereClauses.push(`created_at >= ${pushParam(new Date(filters.from))}`);
    }
    if (filters.to) {
      whereClauses.push(`created_at <= ${pushParam(new Date(filters.to))}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (normalizedPage - 1) * normalizedLimit;
    const limitPlaceholder = pushParam(normalizedLimit);
    const offsetPlaceholder = pushParam(offset);
    const sql = `SELECT
      id,
      workspace_id as "workspaceId",
      actor_user_id as "actorUserId",
      action,
      entity_type as "entityType",
      entity_id as "entityId",
      metadata,
      created_at as "createdAt"
    FROM "audit_logs"
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}`;

    const items = await this.prisma.$queryRawUnsafe<AuditRow[]>(sql, ...params);

    return {
      count: items.length,
      page: normalizedPage,
      limit: normalizedLimit,
      items: items.map((item) => this.toAuditItemDto(item)),
    };
  }

  private toAuditItemDto(item: AuditRow) {
    return {
      id: item.id,
      workspaceId: item.workspaceId,
      actorUserId: item.actorUserId,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      metadata:
        item.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : null,
      createdAt: item.createdAt,
    };
  }
}
