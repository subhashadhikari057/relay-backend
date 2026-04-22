# Workspace Module

## Overview

The `workspaces` module manages tenant creation, membership, invites, ownership transfer, and platform-owner controls.

API split:
- Mobile: `/api/mobile/workspaces/*`
- Admin: `/api/admin/workspaces/*`

Current architecture split:
- `WorkspaceMobileService`: all user-facing workspace workflows
- `WorkspaceAdminService`: superadmin operational workflows
- `WorkspacePolicyService`: shared role/security/business-rule checks

---

## Module Structure

- `src/modules/workspaces/workspaces.module.ts`
  - Wires controllers, services, guards
- `src/modules/workspaces/mobile/workspace.mobile.controller.ts`
  - Mobile transport layer + Swagger docs
- `src/modules/workspaces/mobile/workspace.mobile.service.ts`
  - Mobile business logic
- `src/modules/workspaces/admin/workspace.admin.controller.ts`
  - Admin transport layer + Swagger docs
- `src/modules/workspaces/admin/workspace.admin.service.ts`
  - Admin business logic
- `src/modules/workspaces/shared/services/workspace-policy.service.ts`
  - Shared role and security policy checks
- `src/modules/workspaces/shared/guards/workspace-role.guard.ts`
  - Workspace membership + role guard
- `src/modules/workspaces/shared/decorators/org-roles.decorator.ts`
  - Workspace role metadata
- `src/modules/workspaces/shared/decorators/current-workspace.decorator.ts`
  - Current workspace request-context accessor

---

## Security Model

### Auth and Guarding

- All workspace endpoints require authenticated user (`AccessTokenGuard`) except none currently public.
- Mobile workspace routes with workspace-scoped access use `WorkspaceRoleGuard`.
- Admin workspace routes use:
  - `AccessTokenGuard`
  - `PlatformRoleGuard`
  - `@PlatformRoles(superadmin)`

### Workspace Enumeration Protection

For mobile scoped routes, unresolved/inactive membership returns `Workspace not found` behavior from policy layer to avoid resource enumeration.

### Workspace and Membership State Rules

Workspace access is valid only when:
- `workspaces.is_active = true`
- `workspaces.deleted_at IS NULL`

Membership access is valid only when:
- `workspace_members.is_active = true`

### Guest Role Behavior

`guest` capabilities:
- allowed: read org, read members, view own membership (`/me`), view activity, leave
- denied: invite, revoke invite, update org profile, role changes, member removal, ownership transfer

---

## Data and Integrity Decisions

### Email

- `users.email` is `CITEXT` with unique constraint.
- Case-insensitive uniqueness is DB-enforced.

### Invite Uniqueness

- Permanent unique `(workspace_id, email)` is intentionally removed.
- Re-invites are supported using a partial unique index for pending invites only (migration SQL).

Expected partial index SQL:

```sql
CREATE UNIQUE INDEX "workspace_invites_pending_email_unique"
ON "workspace_invites" ("workspace_id", "email")
WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
```

### Soft Delete and Activation

Workspace fields have different meaning and both are required:
- `deletedAt`: lifecycle soft delete marker
- `isActive`: operational enable/disable

Membership lifecycle uses:
- `workspace_members.is_active`

### User Deletion Policy

- `workspaces.createdById` uses `onDelete: Restrict`.
- User hard delete is not supported in normal product flow.
- User deactivation (`users.isActive = false`) is the supported policy.

---

## Mobile Endpoints

Base: `/api/mobile/workspaces`

- `POST /`
  - create workspace and auto-create owner membership for current user
- `GET /`
  - list workspaces where current user is active member
- `GET /slug/:slug`
  - get workspace by slug (member-only visibility)
- `GET /:workspaceId`
  - get workspace by id (member-only visibility)
- `PATCH /:workspaceId`
  - update org profile (owner/admin)
- `POST /:workspaceId/invites`
  - create invite (owner/admin)
- `GET /:workspaceId/invites`
  - list invites (owner/admin)
- `DELETE /:workspaceId/invites/:inviteId`
  - revoke invite (owner/admin)
- `POST /invites/accept`
  - accept invite token (token tied to authenticated user email)
- `GET /:workspaceId/members`
  - list members (owner/admin/member/guest)
- `GET /:workspaceId/me`
  - current membership + effective capabilities
- `GET /:workspaceId/activity`
  - recent org timeline events
- `PATCH /:workspaceId/members/:memberUserId/role`
  - update member role (owner/admin with policy restrictions)
- `DELETE /:workspaceId/members/:memberUserId`
  - remove member (owner/admin)
- `POST /:workspaceId/transfer-ownership`
  - transfer ownership (owner only)
- `POST /:workspaceId/leave`
  - leave workspace (all roles; last-owner protection applies)

---

## Admin Endpoints

Base: `/api/admin/workspaces` (superadmin-only)

- `GET /`
  - list/search workspaces with filters (`q`, `isActive`, `deleted`, pagination)
- `GET /:workspaceId`
  - workspace details + active member count + pending invite count
- `PATCH /:workspaceId/status`
  - activate/deactivate workspace
- `PATCH /:workspaceId/delete`
  - soft-delete/restore deleted timestamp
- `POST /:workspaceId/restore`
  - explicit restore and activate helper
- `POST /:workspaceId/invites/:inviteId/revoke`
  - force revoke invite
- `POST /:workspaceId/members/:memberUserId/revoke`
  - force revoke membership
- `GET /:workspaceId/invites`
  - inspect all invites and statuses
- `GET /:workspaceId/members`
  - inspect all members (active + inactive)

---

## Key Business Rules

- Last active owner cannot be removed, demoted, or leave without ownership transfer.
- Admin cannot manage owner/admin members.
- Admin can assign only `member` or `guest` in role updates.
- Owner cannot be invited directly by invite flow.
- Invite token is one-time, hashed at rest, and checked for:
  - exists
  - not expired
  - not revoked
  - not already accepted
- Invite acceptance requires authenticated user email to match invite email.

---

## Swagger Standards

All workspace endpoints follow project Swagger rules:
- explicit `operationId`
- summary + description
- request DTO `@ApiBody` where applicable
- response DTO `@ApiOkResponse`
- bearer auth metadata on protected endpoints

Docs visibility split:
- mobile routes only appear in `/api/mobile-docs`
- admin routes only appear in `/api/api-docs`

---

## Tests and Verification

Current validation gates used in this module:
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`

Current focused unit coverage exists for:
- `WorkspaceRoleGuard`
- `WorkspacePolicyService` role matrix and last-owner rules

---

## Known Leftouts

These are not implemented yet but are natural next increments:
- email delivery integration for workspace invites (currently token returned to caller)
- persistent audit/event table integration for workspace activity feed
- broader e2e test suite for full multi-user org scenarios
- service-level split into smaller domain services if module grows further (invites/members/ownership/activity)
