# Channels Module

## Overview

The `channels` module provides workspace-scoped channel management for mobile APIs.

Base route:
- `/api/mobile/workspaces/:workspaceId/channels/*`

Current scope:
- mobile-only (no admin channels API in v1)
- strict workspace nesting for all routes
- cursor pagination for channel list and member list
- role/permission guarded + domain invariants enforced in service layer

---

## Module Structure

- `src/modules/channels/channels.module.ts`
  - Wires mobile controller and service
- `src/modules/channels/mobile/channels.mobile.controller.ts`
  - HTTP transport layer + Swagger annotations
- `src/modules/channels/mobile/channels.mobile.service.ts`
  - Business logic, invariants, pagination, and audit writes
- `src/modules/channels/mobile/dto/*`
  - Request/response contracts (no inline DTOs in controller)

---

## Data Model

Prisma models:
- `Channel`
- `ChannelMember`
- `UserChannelRead`

Enums:
- `ChannelType`: `public | private`
- `ChannelMemberRole`: `admin | member`

### Channel fields

- `id` UUID
- `workspaceId` UUID
- `createdById` UUID (`onDelete: Restrict`)
- `name` `CITEXT` (case-insensitive unique inside workspace)
- `topic` nullable `VARCHAR(250)`
- `description` nullable `VARCHAR(500)`
- `type` (`public | private`)
- `isArchived` boolean
- `createdAt`, `updatedAt`

### Constraints and indexes

- unique `(workspace_id, name)`
- index `(workspace_id, is_archived, type)`
- index `(workspace_id, created_at)`
- index `(created_by_id)`

`channel_members`:
- PK `(channel_id, user_id)`
- index `(user_id)`
- index `(channel_id, joined_at)`

`user_channel_reads`:
- PK `(user_id, channel_id)`
- index `(channel_id)`
- `last_read_message_id` is nullable non-FK by design (safe until message lifecycle is finalized)

---

## Route Surface

Base: `/api/mobile/workspaces/:workspaceId/channels`

- `POST /`
  - create channel
- `GET /`
  - list channels (cursor pagination)
- `GET /:channelId`
  - channel detail
- `PATCH /:channelId`
  - update channel
- `DELETE /:channelId`
  - archive channel
- `POST /:channelId/join`
  - join public channel
- `DELETE /:channelId/leave`
  - leave channel
- `GET /:channelId/members`
  - list channel members (cursor pagination)
- `POST /:channelId/members`
  - add/update member for private channel
- `DELETE /:channelId/members/:userId`
  - remove member from private channel

---

## Security and Permission Model

Guards:
- `AccessTokenGuard`
- `PermissionGuard`

Decorator-based permission checks use `@RequirePermission(...)` with `PermissionScope.workspace`.

### Channel resources

- `workspace.channel`
- `workspace.channel_member`

### Default policy masks

- owner:
  - `workspace.channel = ALL`
  - `workspace.channel_member = ALL`
- admin:
  - `workspace.channel = READ | WRITE`
  - `workspace.channel_member = ALL`
- member:
  - `workspace.channel = READ | WRITE`
  - `workspace.channel_member = READ`
- guest:
  - `workspace.channel = READ`
  - `workspace.channel_member = READ`

Important: permission bits are capability gates, but service-layer invariants can still block action.

---

## Domain Invariants

Enforced in `ChannelsMobileService`:

- Create/update/archive channel: workspace `owner` only.
- Private channel member add/remove: workspace `owner` or `admin` only.
- Join endpoint allowed only for `public` channels.
- Last channel admin cannot leave/remove without promoting another admin first.
- Archived channels cannot be updated.
- `includeArchived=true` allowed only for workspace owner/admin.
- Non-owner/admin visibility for channel list/detail is restricted to:
  - public channels
  - private channels where user is already a member

---

## Pagination Contracts

### Channel list

- Query:
  - `cursor?: string`
  - `limit?: number` (default `20`, max `100`)
  - `includeArchived?: boolean` (default `false`)
- Sort order:
  - `createdAt desc`, `id desc`
- Cursor payload (opaque/base64url):
  - `{ createdAt, id }`

### Channel member list

- Query:
  - `cursor?: string`
  - `limit?: number` (default `20`, max `100`)
  - `includeArchived?: boolean` (default `false`)
- Sort order:
  - `joinedAt asc`, `userId asc`
- Cursor payload (opaque/base64url):
  - `{ joinedAt, userId }`

---

## Input Normalization Rules

- `name`:
  - trimmed
  - must be length `2..80` after trim
- `topic`:
  - trimmed
  - empty string clears to `null`
  - max `250` chars after trim
- `description`:
  - trimmed
  - empty string clears to `null`
  - max `500` chars after trim

Whitespace-only name is rejected.

---

## Workspace Bootstrap Integration

When workspace is created, module integration auto-creates:
- `general` channel (`public`)
- creator membership in that channel as `ChannelMemberRole.admin`

This is done in the same transaction as workspace/member creation to avoid partial state.

---

## Join/Leave Semantics

- `join` is idempotent (safe no-op if already a member).
- `leave` removes channel membership and related `user_channel_reads` row for that user/channel.

---

## Audit Events

Channel flows emit audit events via `AuditService.recordSafe`:

- `workspace.channel.created`
- `workspace.channel.updated`
- `workspace.channel.archived`
- `workspace.channel.joined`
- `workspace.channel.left`
- `workspace.channel.member.added`
- `workspace.channel.member.removed`

Entity types used:
- `channel`
- `channel_member`

---

## Swagger Standards

All channel endpoints include:
- stable `operationId`
- summary + description
- request DTO docs via `@ApiBody` where required
- response DTO docs via `@ApiOkResponse`
- bearer auth metadata

Since routes are mobile-prefixed, these endpoints appear in `/api/mobile-docs` only.

---

## Seed Behavior

`prisma/seed.cjs` seeds workspace default channel data:
- channel name: `general`
- channel topic: `General updates and team discussions`
- channel description: `Default workspace channel for announcements and collaboration.`
- creator added as `channel admin`

---

## Validation Checklist

Recommended gates after channel changes:
- `pnpm db:generate`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`

For local reset flows:
- `pnpm prisma migrate reset --force`
- `pnpm db:seed`

