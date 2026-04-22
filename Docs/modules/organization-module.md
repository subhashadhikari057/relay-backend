# Organization Module

## Overview

The `organizations` module manages tenant creation, membership, invites, ownership transfer, and platform-owner controls.

API split:
- Mobile: `/api/mobile/organizations/*`
- Admin: `/api/admin/organizations/*`

Current architecture split:
- `OrganizationMobileService`: all user-facing organization workflows
- `OrganizationAdminService`: superadmin operational workflows
- `OrganizationPolicyService`: shared role/security/business-rule checks

---

## Module Structure

- `src/modules/organizations/organizations.module.ts`
  - Wires controllers, services, guards
- `src/modules/organizations/mobile/organization.mobile.controller.ts`
  - Mobile transport layer + Swagger docs
- `src/modules/organizations/mobile/organization.mobile.service.ts`
  - Mobile business logic
- `src/modules/organizations/admin/organization.admin.controller.ts`
  - Admin transport layer + Swagger docs
- `src/modules/organizations/admin/organization.admin.service.ts`
  - Admin business logic
- `src/modules/organizations/shared/services/organization-policy.service.ts`
  - Shared role and security policy checks
- `src/modules/organizations/shared/guards/organization-role.guard.ts`
  - Organization membership + role guard
- `src/modules/organizations/shared/decorators/org-roles.decorator.ts`
  - Organization role metadata
- `src/modules/organizations/shared/decorators/current-organization.decorator.ts`
  - Current organization request-context accessor

---

## Security Model

### Auth and Guarding

- All organization endpoints require authenticated user (`AccessTokenGuard`) except none currently public.
- Mobile organization routes with organization-scoped access use `OrganizationRoleGuard`.
- Admin organization routes use:
  - `AccessTokenGuard`
  - `PlatformRoleGuard`
  - `@PlatformRoles(superadmin)`

### Organization Enumeration Protection

For mobile scoped routes, unresolved/inactive membership returns `Organization not found` behavior from policy layer to avoid resource enumeration.

### Organization and Membership State Rules

Organization access is valid only when:
- `organizations.is_active = true`
- `organizations.deleted_at IS NULL`

Membership access is valid only when:
- `organization_members.is_active = true`

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

- Permanent unique `(organization_id, email)` is intentionally removed.
- Re-invites are supported using a partial unique index for pending invites only (migration SQL).

Expected partial index SQL:

```sql
CREATE UNIQUE INDEX "organization_invites_pending_email_unique"
ON "organization_invites" ("organization_id", "email")
WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
```

### Soft Delete and Activation

Organization fields have different meaning and both are required:
- `deletedAt`: lifecycle soft delete marker
- `isActive`: operational enable/disable

Membership lifecycle uses:
- `organization_members.is_active`

### User Deletion Policy

- `organizations.createdById` uses `onDelete: Restrict`.
- User hard delete is not supported in normal product flow.
- User deactivation (`users.isActive = false`) is the supported policy.

---

## Mobile Endpoints

Base: `/api/mobile/organizations`

- `POST /`
  - create organization and auto-create owner membership for current user
- `GET /`
  - list organizations where current user is active member
- `GET /slug/:slug`
  - get organization by slug (member-only visibility)
- `GET /:organizationId`
  - get organization by id (member-only visibility)
- `PATCH /:organizationId`
  - update org profile (owner/admin)
- `POST /:organizationId/invites`
  - create invite (owner/admin)
- `GET /:organizationId/invites`
  - list invites (owner/admin)
- `DELETE /:organizationId/invites/:inviteId`
  - revoke invite (owner/admin)
- `POST /invites/accept`
  - accept invite token (token tied to authenticated user email)
- `GET /:organizationId/members`
  - list members (owner/admin/member/guest)
- `GET /:organizationId/me`
  - current membership + effective capabilities
- `GET /:organizationId/activity`
  - recent org timeline events
- `PATCH /:organizationId/members/:memberUserId/role`
  - update member role (owner/admin with policy restrictions)
- `DELETE /:organizationId/members/:memberUserId`
  - remove member (owner/admin)
- `POST /:organizationId/transfer-ownership`
  - transfer ownership (owner only)
- `POST /:organizationId/leave`
  - leave organization (all roles; last-owner protection applies)

---

## Admin Endpoints

Base: `/api/admin/organizations` (superadmin-only)

- `GET /`
  - list/search organizations with filters (`q`, `isActive`, `deleted`, pagination)
- `GET /:organizationId`
  - organization details + active member count + pending invite count
- `PATCH /:organizationId/status`
  - activate/deactivate organization
- `PATCH /:organizationId/delete`
  - soft-delete/restore deleted timestamp
- `POST /:organizationId/restore`
  - explicit restore and activate helper
- `POST /:organizationId/invites/:inviteId/revoke`
  - force revoke invite
- `POST /:organizationId/members/:memberUserId/revoke`
  - force revoke membership
- `GET /:organizationId/invites`
  - inspect all invites and statuses
- `GET /:organizationId/members`
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

All organization endpoints follow project Swagger rules:
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
- `OrganizationRoleGuard`
- `OrganizationPolicyService` role matrix and last-owner rules

---

## Known Leftouts

These are not implemented yet but are natural next increments:
- email delivery integration for organization invites (currently token returned to caller)
- persistent audit/event table integration for organization activity feed
- broader e2e test suite for full multi-user org scenarios
- service-level split into smaller domain services if module grows further (invites/members/ownership/activity)
