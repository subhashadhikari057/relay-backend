# Messages Module

## Overview

The `messages` module powers workspace chat messaging for mobile APIs.

Base route families:
- `/api/mobile/workspaces/:workspaceId/channels/:channelId/messages/*`
- `/api/mobile/workspaces/:workspaceId/messages/*`

Current v1 scope:
- top-level messages
- single-level thread replies
- file message support through upload-path references
- mention metadata validation
- channel read state
- unread count APIs
- one-reaction-per-user toggle model
- pinned messages
- workspace message search
- system messages for workspace/channel lifecycle events

This module is mobile-only in v1.

---

## Module Structure

- `src/modules/messages/messages.module.ts`
  - Wires controllers and message-domain services
- `src/modules/messages/mobile/messages.mobile.controller.ts`
  - Main message CRUD, thread, and mark-read transport layer
- `src/modules/messages/mobile/message-reactions.mobile.controller.ts`
  - Reaction toggle transport layer
- `src/modules/messages/mobile/message-pins.mobile.controller.ts`
  - Pin toggle + pinned list transport layer
- `src/modules/messages/mobile/message-read-state.mobile.controller.ts`
  - Unread count transport layer
- `src/modules/messages/mobile/message-search.mobile.controller.ts`
  - Workspace message search transport layer

### Core services

- `src/modules/messages/mobile/messages.mobile.service.ts`
  - Write orchestration for create/update/delete and thread mutations
- `src/modules/messages/mobile/services/message-query.service.ts`
  - Read-side queries for list/detail/thread/pins
- `src/modules/messages/mobile/services/message-read-state.service.ts`
  - Channel read pointer + unread count logic
- `src/modules/messages/mobile/services/message-search.service.ts`
  - Workspace-scoped content search
- `src/modules/messages/mobile/services/message-reaction.service.ts`
  - Reaction toggle logic
- `src/modules/messages/mobile/services/message-pin.service.ts`
  - Pin toggle logic
- `src/modules/messages/mobile/services/message-engagement.service.ts`
  - Batch reaction/pin enrichment for message responses
- `src/modules/messages/mobile/services/message-access.service.ts`
  - Channel visibility, membership, archive, and mutation access checks
- `src/modules/messages/mobile/services/message-validation.service.ts`
  - Payload normalization, cursor helpers, attachment checks, mention validation
- `src/modules/messages/mobile/services/message-presenter.service.ts`
  - Shapes final message API response

### System message integration

- `src/modules/system-messages/system-message.service.ts`
  - Publishes best-effort `MessageType.system` rows into channels

---

## Data Model

Prisma models used:
- `Message`
- `MessageAttachment`
- `UserChannelRead`
- `MessageReaction`
- `MessagePin`

Enums used:
- `MessageType`: `text | file | system`

### Message

Fields:
- `id` UUID
- `workspaceId` UUID
- `channelId` UUID
- `senderUserId` UUID
- `type` (`text | file | system`)
- `content` nullable text
- `metadata` nullable JSONB
- `parentMessageId` nullable UUID
- `editedAt` nullable timestamp
- `deletedAt` nullable timestamp
- `createdAt`, `updatedAt`

Relations:
- belongs to workspace
- belongs to channel
- belongs to sender user
- optional parent message for thread reply
- child thread replies
- attachments
- reactions
- optional pin

### MessageAttachment

Fields:
- `id` UUID
- `messageId` UUID
- `path`
- `originalName`
- `mimeType`
- `size`
- `sortOrder`
- optional `width`, `height`, `durationMs`
- `createdAt`

### UserChannelRead

Fields:
- `userId`
- `channelId`
- `lastReadMessageId` nullable
- `lastReadAt` nullable
- `updatedAt`

This is the current source of truth for channel-level read progress.

### MessageReaction

Design:
- one reaction row per `(messageId, userId)`
- user can only have one active reaction per message

Fields:
- `messageId`
- `userId`
- `emoji`
- `createdAt`
- `updatedAt`

### MessagePin

Design:
- one pin row per message
- a message is either pinned or not pinned

Fields:
- `messageId`
- `pinnedByUserId` nullable
- `createdAt`

---

## Constraints and Indexes

### Messages

Current important indexes:
- `(channel_id, created_at, id)`
- `(parent_message_id, created_at, id)`
- `(sender_user_id, created_at)`
- `(workspace_id, channel_id, deleted_at)`
- `(workspace_id, deleted_at, created_at, id)`
- `(channel_id, deleted_at, created_at, id)`

Why they exist:
- channel timeline pagination
- thread reply pagination
- sender history support later
- deleted filtering
- workspace-wide search/read ordering support

### Reactions

- PK `(message_id, user_id)`
- index `(message_id, emoji)`
- index `(user_id, created_at)`

### Pins

- PK `message_id`
- index `(pinned_by_user_id, created_at)`

### Read state

- PK `(user_id, channel_id)`
- index `(channel_id)`

---

## Route Surface

### Main Messages

Base: `/api/mobile/workspaces/:workspaceId/channels/:channelId/messages`

- `POST /`
  - create top-level message
- `GET /`
  - list top-level timeline messages
- `GET /:messageId`
  - get one top-level message
- `PATCH /:messageId`
  - update top-level message
- `DELETE /:messageId`
  - soft-delete top-level message
- `POST /read`
  - update channel read pointer

### Threads

- `POST /:messageId/thread`
  - create one-level reply
- `GET /:messageId/thread`
  - list replies for one parent message
- `GET /:messageId/thread/:replyId`
  - get one reply
- `PATCH /:messageId/thread/:replyId`
  - update one reply
- `DELETE /:messageId/thread/:replyId`
  - soft-delete one reply

### Reactions

- `POST /:messageId/reaction/toggle`
  - toggle current user reaction on a message

### Pins

- `POST /:messageId/pin/toggle`
  - toggle pin/unpin on a message
- `GET /pins`
  - list pinned messages for the channel

### Unread Counts

Base: `/api/mobile/workspaces/:workspaceId`

- `GET /messages/unread-counts`
  - unread summary across visible, non-archived channels in workspace
- `GET /channels/:channelId/messages/unread-count`
  - unread count for one channel

### Search

Base: `/api/mobile/workspaces/:workspaceId/messages`

- `GET /search`
  - search message content across visible channels
  - optional `channelId` for in-channel search

---

## Security and Permission Model

Guards:
- `AccessTokenGuard`
- `PermissionGuard`

All message routes use workspace-scoped permission checks with:
- `scope = workspace`
- `resource = workspace.message`

### Permission usage

- `read`
  - list/get messages
  - list/get thread replies
  - mark read
  - unread counts
  - search
  - list pinned messages
- `write`
  - create message
  - create thread reply
  - toggle reaction
- `update`
  - update message
  - update reply
  - toggle pin
- `delete`
  - delete message
  - delete reply

### Important note

Permission bits are only capability gates.
Service-layer rules still apply.

Examples:
- having `write` does not let a user post in a channel they have not joined
- having `update` does not let a user edit someone else’s message
- system messages are never editable/deletable through normal message APIs

---

## Channel Access Rules

Enforced by `MessageAccessService`:

- user must be active workspace member
- private channel requires channel membership even for read
- posting/replying requires channel membership
- archived channels are read-only for writes

Implication:
- public channel non-member can read if route is visible and allowed by current rules
- public channel non-member cannot post until joined
- private channel non-member cannot read or post

---

## Message Types

### `text`

Used for normal textual chat messages.

Expected payload:
- `content` required after normalization
- `attachments` optional but usually empty in v1 text flow

### `file`

Used for attachment-first messages.

Expected payload:
- `attachments` usually present
- `content` optional caption

Attachments reference files already uploaded through upload module.
Stored value is relative path from upload provider result.

### `system`

Used only by backend publishers for lifecycle/system events.

Examples:
- workspace created
- workspace member joined
- channel member added
- channel archived

Frontend should treat system messages differently from normal chat messages.

---

## Message Creation Rules

### Top-level messages

Creation validates:
- channel access
- channel not archived
- payload normalization
- mention metadata validity
- attachment validity

### Thread replies

Only one level is allowed.

Rules:
- parent must exist in same workspace/channel
- parent must be top-level (`parentMessageId = null`)
- reply-to-reply is rejected
- deleted parent cannot be replied to

Main timeline query always excludes replies with:
- `parentMessageId = null`

---

## Update and Delete Rules

### Edit/Delete ownership

User can modify only their own messages.

### Edit/Delete time window

Controlled by env config:
- `messages.editWindowMinutes`

If window expires:
- edit/delete returns forbidden

### Soft delete behavior

Delete does not remove row.
It sets:
- `content = null`
- `metadata = null`
- `deletedAt = now()`

API response then shows:
- `isDeleted = true`
- `content = null`
- `metadata = null`

### System messages

System messages cannot be edited or deleted by message APIs.

---

## Mentions

Mentions are currently stored inside `metadata`.

Expected frontend shape:
```json
{
  "mentions": ["user-uuid-1", "user-uuid-2"]
}
```

Validation rules:
- `mentions` must be an array
- every item must be valid UUID
- every mentioned user must be active workspace member
- for private channels, every mentioned user must already be a channel member

### Why metadata for now

This is a practical v1 design:
- fast to ship
- enough for rendering and notifications later
- keeps schema simpler

If future requirements need analytics-heavy mention queries, a dedicated `message_mentions` table can be added later.

---

## Attachments and Upload Integration

Message attachments do not upload files themselves.
Frontend flow is:
1. call upload API
2. receive relative file path + metadata
3. send that path inside message attachments payload

Attachment fields include:
- `path`
- `originalName`
- `mimeType`
- `size`
- `sortOrder`
- optional `width`, `height`, `durationMs`

The message module stores attachment metadata only.

---

## Read State and Unread Counts

### Read pointer model

Current read tracking is channel-level, not per-message receipt history.

Meaning:
- user read state says “user has read up to message X in this channel”
- unread count means “messages after that pointer”

### Mark read API

`POST /read`

Body:
```json
{
  "lastReadMessageId": "message-uuid"
}
```

Behavior:
- message must exist in same workspace + channel
- user read pointer is upserted in `user_channel_reads`

### Unread count semantics

Unread counts currently:
- exclude deleted messages
- exclude current user’s own messages
- use visible, non-archived channels only
- are based on message ordering by `createdAt`, then `id`

### Frontend implication

If user stops at message C and later 10 newer messages arrive:
- unread count becomes 10
- when frontend marks latest visible message as read, unread count resets accordingly

---

## Reactions

### Allowed reactions in v1

Only these are valid:
- `👍`
- `❤️`
- `😂`
- `🎉`
- `🔥`

### Toggle model

One user can have only one reaction per message.

Behavior:
- no reaction yet -> create
- same emoji tapped again -> remove
- different emoji tapped -> replace existing one

### Read shape in message response

Each message includes:
- `reactionSummary`
- `myReaction`

Example:
```json
{
  "reactionSummary": [
    { "emoji": "👍", "count": 3 },
    { "emoji": "🔥", "count": 1 }
  ],
  "myReaction": "👍"
}
```

### Frontend behavior

Frontend can directly toggle from message bubble tap.
Returned payload is enough to update UI immediately without refetching the whole timeline.

---

## Pins

### Pin model

A message is either pinned or not pinned.

### Current permission model

Pin toggle requires `workspace.message` `update` capability.

Default effect:
- owner/admin/member can pin if policy allows update
- guest usually cannot pin by default

### Response shape

Each message includes:
- `isPinned`
- `pinnedAt`
- `pinnedByUserId`

Pinned list endpoint returns pinned messages ordered by most recently pinned first.

---

## Search

### Scope

Search is workspace-scoped and searches visible channels only.

### Query parameters

- `query` required
- `channelId` optional
- `cursor` optional
- `limit` optional

### Search rules

- query is trimmed
- fewer than 2 non-space chars is rejected
- deleted messages are excluded
- archived channels are excluded
- private channel messages are returned only if current user can read that channel

### Response shape

Search result extends normal message payload with:
- `channelName`
- `channelType`
- `matchPreview`

This makes frontend global search easier because one API already tells which channel each hit belongs to.

---

## System Messages

### Purpose

System messages make important workspace/channel events visible in chat timeline, not only in audit logs.

### Current producers

Workspace events published to `general`:
- workspace created
- workspace member joined
- workspace member left
- workspace member removed
- ownership transferred

Channel events published to their own channel:
- channel created
- channel archived
- user joined channel
- user left channel
- member added
- member removed

### Delivery policy

System messages are best-effort.
If publish fails:
- main business action still succeeds
- publisher logs warning

### Frontend rendering guidance

Frontend should detect:
- `type === system`

Recommended UI treatment:
- center-aligned or subtle timeline card
- non-editable / non-deletable controls hidden
- render `metadata.event` if richer custom templates are needed later

---

## Response Shape Notes for Frontend

Every message response can include:
- message identity
- author object
- attachments
- thread reply count
- mutation capability flags (`canEdit`, `canDelete`)
- reaction data
- pin data

This payload is intentionally rich so frontend does not need extra round-trips just to render timeline items.

### Why this is okay

A slightly larger message response is usually better in chat systems because:
- timeline rendering is immediate
- fewer follow-up APIs
- easier optimistic UI reconciliation

If later payload size becomes a concern, compact variants can be added without changing the core model.

---

## Audit Integration

Message flows emit audit events for:
- message created
- message updated
- message deleted
- thread reply created
- thread reply updated
- thread reply deleted
- read pointer updated
- reaction toggled
- pin toggled

Audit is separate from system message publishing.
Audit is for investigation/history.
System messages are for user-facing timeline visibility.

---

## Swagger and Docs Visibility

All routes follow project Swagger rules:
- explicit `operationId`
- request/response DTOs in dedicated files
- summaries and descriptions on endpoints
- bearer auth metadata

Since all routes are mobile-prefixed, they appear in:
- `/api/mobile-docs`

---

## Frontend Integration Checklist

Recommended frontend flow:

1. Upload file if needed
- call upload API first
- keep returned relative path

2. Send message
- send `content`, `type`, `attachments`, `metadata`

3. Mark read when user reaches latest visible message
- call `/read` with latest seen `messageId`

4. Show unread badges
- use workspace unread summary or channel unread endpoint

5. Toggle reactions directly from bubble UI
- same endpoint handles add/remove/replace

6. Show pin state inline
- use `isPinned`
- use `/pins` for pinned panel/list

7. Search globally in workspace
- call `/api/mobile/workspaces/:workspaceId/messages/search`
- use `channelName` and `matchPreview`

8. Handle system messages separately in UI
- do not show edit/delete controls

---

## Validation and Quality Gates

Recommended checks after message-module changes:
- `pnpm db:generate`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`

If schema changes are made:
- `pnpm db:migrate`

---

## Future Enhancements

Message v1 is complete, but natural future improvements could include:
- normalized mention table for analytics/querying
- message edit history
- full-text search optimization with Postgres search indexes
- thread unread counts separate from channel unread counts
- websocket event fanout for live timeline updates
- outbox/event pipeline if notifications and realtime side effects grow
