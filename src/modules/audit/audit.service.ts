import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { MobileMyAuditQueryDto } from './dto/mobile-my-audit-query.dto';
import { MobileOrganizationActivityQueryDto } from './dto/mobile-organization-activity-query.dto';
import { AuditAction, AuditEntityType } from './shared/audit.constants';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_ORG_ACTIVITY_LIMIT = 25;

type RecordAuditInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
};

type AuditRow = {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput) {
    const metadataJson = JSON.stringify(input.metadata ?? null);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "audit_logs"
      ("organization_id","actor_user_id","action","entity_type","entity_id","metadata")
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      input.organizationId ?? null,
      input.actorUserId ?? null,
      input.action,
      input.entityType,
      input.entityId,
      metadataJson,
    );
  }

  async recordSafe(input: RecordAuditInput) {
    try {
      await this.record(input);
    } catch (error) {
      this.logger.warn(
        `Failed to record audit event action=${input.action} entityType=${input.entityType} entityId=${input.entityId}`,
      );
      if (error instanceof Error) {
        this.logger.debug(error.message);
      }
    }
  }

  async listOrganizationActivity(
    organizationId: string,
    query: MobileOrganizationActivityQueryDto,
  ) {
    const limit = query.limit ?? DEFAULT_ORG_ACTIVITY_LIMIT;

    const items = await this.prisma.$queryRawUnsafe<AuditRow[]>(
      `SELECT
        id,
        organization_id as "organizationId",
        actor_user_id as "actorUserId",
        action,
        entity_type as "entityType",
        entity_id as "entityId",
        metadata,
        created_at as "createdAt"
      FROM "audit_logs"
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      organizationId,
      limit,
    );

    return {
      count: items.length,
      activities: items.map((item) => this.toAuditItemDto(item)),
    };
  }

  async listAdminAudit(query: AdminAuditQueryDto, organizationId?: string) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    const pushParam = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (organizationId) {
      whereClauses.push(`organization_id = ${pushParam(organizationId)}`);
    }
    if (query.organizationId) {
      whereClauses.push(`organization_id = ${pushParam(query.organizationId)}`);
    }
    if (query.actorUserId) {
      whereClauses.push(`actor_user_id = ${pushParam(query.actorUserId)}`);
    }
    if (query.action) {
      whereClauses.push(`action = ${pushParam(query.action)}`);
    }
    if (query.from) {
      whereClauses.push(`created_at >= ${pushParam(new Date(query.from))}`);
    }
    if (query.to) {
      whereClauses.push(`created_at <= ${pushParam(new Date(query.to))}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const offset = (page - 1) * limit;
    const limitPlaceholder = pushParam(limit);
    const offsetPlaceholder = pushParam(offset);

    const sql = `SELECT
      id,
      organization_id as "organizationId",
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
      page,
      limit,
      items: items.map((item) => this.toAuditItemDto(item)),
    };
  }

  async listMyAudit(userId: string, query: MobileMyAuditQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    const pushParam = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    whereClauses.push(`actor_user_id = ${pushParam(userId)}`);

    if (query.organizationId) {
      whereClauses.push(`organization_id = ${pushParam(query.organizationId)}`);
    }
    if (query.action) {
      whereClauses.push(`action = ${pushParam(query.action)}`);
    }
    if (query.from) {
      whereClauses.push(`created_at >= ${pushParam(new Date(query.from))}`);
    }
    if (query.to) {
      whereClauses.push(`created_at <= ${pushParam(new Date(query.to))}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const offset = (page - 1) * limit;
    const limitPlaceholder = pushParam(limit);
    const offsetPlaceholder = pushParam(offset);

    const sql = `SELECT
      id,
      organization_id as "organizationId",
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
      page,
      limit,
      items: items.map((item) => this.toAuditItemDto(item)),
    };
  }

  private toAuditItemDto(item: AuditRow) {
    return {
      id: item.id,
      organizationId: item.organizationId,
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
