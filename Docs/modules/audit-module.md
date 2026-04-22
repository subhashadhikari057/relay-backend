# Audit Module

## Overview

The `audit` module provides a unified audit trail for both platform-level and workspace-level events.

API split:
- Admin: `/api/admin/audit/*`
- Mobile: `/api/mobile/audit/*`

Current design goals:
- Single source of truth table: `audit_logs`
- Non-blocking audit writes (`recordSafe`) for resiliency
- Filterable read APIs for admins and end users
- Reusable enum constants to avoid action/entity naming drift

---

## Module Structure

- `src/modules/audit/audit.module.ts`
  - Wires audit controllers and service
- `src/modules/audit/audit.service.ts`
  - Core write + query implementation
- `src/modules/audit/admin/audit.admin.controller.ts`
  - Admin read APIs
- `src/modules/audit/mobile/audit.mobile.controller.ts`
  - User self-audit API (`/me`)
- `src/modules/audit/dto/*`
  - Query and response DTO contracts
- `src/modules/audit/shared/audit.constants.ts`
  - `AuditAction` and `AuditEntityType` enums/constants

---

## Security Model

### Guards

- Admin endpoints use:
  - `AccessTokenGuard`
  - `PermissionGuard`
  - `@RequirePermission(platform.audit, read)`
- Mobile endpoint uses:
  - `AccessTokenGuard`

### Scope behavior

- Admin can query global logs or a specific workspace’s logs.
- Mobile user can only query events where `actor_user_id = current user`.

### Failure behavior

- `recordSafe()` catches write errors and logs them, so audit write failures do not break business APIs.

---

## Endpoints

Base admin route: `/api/admin/audit`

- `GET /api/admin/audit`
  - Global audit list with filters
- `GET /api/admin/audit/workspaces/:workspaceId`
  - Workspace-scoped audit list

Base mobile route: `/api/mobile/audit`

- `GET /api/mobile/audit/me`
  - Current user audit list

Workspace activity timeline is consumed in workspace APIs through `AuditService.listWorkspaceActivity(...)` and returned by:
- `GET /api/mobile/workspaces/:workspaceId/activity`

---

## Filters and Pagination

Supported filters (DTO dependent per endpoint):
- `workspaceId`
- `actorUserId`
- `action`
- `from`
- `to`
- `page`
- `limit`

Default pagination:
- page: `1`
- limit: `20`

Workspace activity default limit:
- `25`

---

## Data Model (Current)

Table: `audit_logs`

Core fields:
- `id`
- `workspace_id` (nullable)
- `actor_user_id` (nullable)
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `created_at`

Write path uses `prisma.auditLog.create(...)` with explicit `id` generation.

---

## Notes

- Audit events are best-effort by design today.
- For stricter compliance mode later, selected security events can be moved to fail-closed write strategy.
