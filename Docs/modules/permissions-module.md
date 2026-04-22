# Permissions Module

## Overview

The `permissions` module implements dynamic, bitmask-based authorization for:
- Platform scope (`/api/admin/*`)
- Workspace scope (`/api/mobile/workspaces/:workspaceId/*`)

Current design goals:
- Store editable policies in DB (`permission_policies`)
- Keep request-time checks fast using JWT permission maps
- Protect sensitive policy controls from lockout
- Invalidate stale JWTs using `tokenVersion`

---

## Bitmask Model

Actions and bits:
- `read = 1`
- `write = 2`
- `update = 4`
- `delete = 8`

Combined masks:
- full CRUD = `15`
- no access = `0`

---

## Module Structure

- `src/modules/permissions/permissions.module.ts`
  - Wires controllers, guard, and services
- `src/modules/permissions/guards/permission.guard.ts`
  - Enforces `@RequirePermission(...)` metadata
- `src/modules/permissions/decorators/require-permission.decorator.ts`
  - Route-level permission requirement decorator
- `src/modules/permissions/services/permissions-policy.service.ts`
  - Policy reads/updates/default merge/protection logic
- `src/modules/permissions/services/permissions-update-orchestrator.service.ts`
  - Shared update orchestration + audit integration hooks
- `src/modules/permissions/constants/*`
  - actions/resources/scopes/default policies
- `src/modules/permissions/admin/permissions.admin.controller.ts`
  - Platform policy APIs
- `src/modules/permissions/mobile/permissions.mobile.controller.ts`
  - Workspace policy APIs

---

## Security Model

### Request-time check order

1. `AccessTokenGuard`
2. `TokenVersionService.assertTokenVersionOrThrow(...)`
3. `PermissionGuard` bitmask check
4. Org scope: active-workspace route match check

If token version mismatches, API returns:
- `401`
- code: `TOKEN_VERSION_MISMATCH`

### Policy update protections

- Platform superadmin permissions control cannot be fully removed.
- Workspace `owner` role policies are protected from edits.
- Workspace policy management is owner-only (`assertWorkspaceOwnerCanManagePolicies`).

### Token version bump behavior

When policies are changed, affected users’ `tokenVersion` increments in DB so old access tokens are invalidated on next request.

---

## Endpoints

### Admin (platform policies)

Base route: `/api/admin/permissions/platform`

- `GET /`
  - list platform policies
- `PATCH /`
  - update one platform policy
- `PATCH /bulk`
  - bulk update platform policies

### Mobile (workspace policies)

Base route: `/api/mobile/workspaces/:workspaceId/permissions`

- `GET /`
  - list workspace policies (owner-only)
- `PATCH /`
  - update one workspace policy (owner-only)
- `PATCH /bulk`
  - bulk update workspace policies (owner-only)

---

## Default Policy Baseline

Defined in:
- `src/modules/permissions/constants/permission-policies.constant.ts`

Includes defaults for:
- Platform roles: `superadmin`, `user`
- Workspace roles: `owner`, `admin`, `member`, `guest`
- Resource families:
  - platform: `auth`, `workspaces`, `audit`, `upload`, `permissions`
  - org: `workspace`, `invite`, `member`, `activity`, `permissions`

Runtime behavior merges persisted rows with defaults, so missing DB rows still resolve predictably.

---

## Data Model

Table: `permission_policies`

Core fields:
- `scope` (`platform | workspace`)
- `workspace_id` (nullable for platform)
- `role`
- `resource`
- `mask`

Policy uniqueness is enforced by scope/workspace/role/resource combination.

---

## Notes

- Permission checks do not replace domain invariants.
- Service-layer business rules (e.g., last-owner protection) remain enforced independently.
