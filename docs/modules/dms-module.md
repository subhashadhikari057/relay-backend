# DMs Module

The `dms` module provides workspace-scoped direct messaging for:

- one-to-one conversations
- group conversations
- DM message timelines
- single-level thread replies
- read state and unread counts
- DM search
- reactions and pins
- system messages for core DM membership events

Base route: `/api/mobile/workspaces/:workspaceId/dms`

## Purpose

DMs are private conversations between active members of the same workspace.

This module is intentionally built on top of the shared `messages` table instead of introducing a second message storage system. That keeps message behavior consistent across channels and DMs:

- same message payload structure
- same attachment reference model
- same reactions and pins model
- same thread rule
- same edit/delete window behavior
- same presenter shape for frontend

## Architecture

- `src/modules/dms/dms.module.ts`
  - wires DM controllers and services
- `src/modules/dms/mobile/dms.mobile.controller.ts`
  - conversation management, DM search, unread count routes
- `src/modules/dms/mobile/dm-messages.mobile.controller.ts`
  - DM message CRUD, thread, and read-state routes
- `src/modules/dms/mobile/dm-message-reactions.mobile.controller.ts`
  - DM reaction toggle transport
- `src/modules/dms/mobile/dm-message-pins.mobile.controller.ts`
  - DM pin toggle and pin list transport
- `src/modules/dms/mobile/services/dm-access.service.ts`
  - validates workspace membership and DM membership
- `src/modules/dms/mobile/services/dm-conversation.service.ts`
  - create/open/list/update/add/remove/leave conversation flows
- `src/modules/dms/mobile/services/dm-messages.service.ts`
  - DM message creation, reads, edits, deletes, and thread flows
- `src/modules/dms/mobile/services/dm-read-state.service.ts`
  - mark-read and unread-count logic
- `src/modules/dms/mobile/services/dm-search.service.ts`
  - DM-scoped search
- `src/modules/dms/mobile/services/dm-reaction.service.ts`
  - one-reaction-per-user toggle logic
- `src/modules/dms/mobile/services/dm-pin.service.ts`
  - pin toggle and pinned-message listing

Shared dependencies reused from messages module:

- `MessageValidationService`
- `MessagePresenterService`
- `MessageEngagementService`

Shared system-message publisher:

- `src/modules/system-messages/system-message.service.ts`

## Data Model

Main Prisma entities used by this module:

- `DirectConversation`
- `DirectConversationMember`
- `UserDmRead`
- `Message`
- `MessageAttachment`
- `MessageReaction`
- `MessagePin`

### Container Rule

DM messages use the shared `messages` table and set:

- `directConversationId = <dm-id>`
- `channelId = null`

Channel messages do the opposite:

- `channelId = <channel-id>`
- `directConversationId = null`

Recommended migration-level DB safety:

- add a raw SQL check so a message belongs to exactly one container

Example rule:

- message must have either `channel_id` or `direct_conversation_id`
- message must never have both

## Important Indexes

These indexes were added specifically to keep DM queries fast:

- `direct_conversations(workspace_id, updated_at)`
- `direct_conversations(workspace_id, last_message_at)`
- `direct_conversations(created_by_id)`
- `direct_conversation_members(user_id, joined_at)`
- `direct_conversation_members(direct_conversation_id, joined_at)`
- `direct_conversation_members(left_at)`
- `user_dm_reads(direct_conversation_id)`
- `messages(direct_conversation_id, created_at, id)`
- `messages(workspace_id, direct_conversation_id, deleted_at)`
- `messages(direct_conversation_id, deleted_at, created_at, id)`

These support:

- DM sidebar list
- DM timeline fetch
- DM unread counts
- thread reads
- scoped search

## Access Rules

DM access is membership-based, not permission-policy-based.

A user can access a DM only if:

- they are an active workspace member
- they are an active DM member (`leftAt = null`)

### Conversation Types

#### One-to-One

- created between exactly 2 workspace members
- opening same 2-person DM again is idempotent
- existing conversation is returned instead of creating duplicate
- title is always `null`
- group-only mutation routes are blocked

#### Group

- 3 or more members
- title is required at creation
- supports:
  - title update
  - add member
  - remove member
  - leave conversation

Current rule in v1:

- any active group member can add/remove/leave

There is no separate DM admin role in v1.

## APIs

### Conversation Routes

- `POST /api/mobile/workspaces/:workspaceId/dms`
  - open existing one-to-one DM or create new conversation
- `GET /api/mobile/workspaces/:workspaceId/dms`
  - list current user conversations with cursor pagination
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId`
  - get DM detail
- `PATCH /api/mobile/workspaces/:workspaceId/dms/:directConversationId`
  - update group DM title
- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/members`
  - add member to group DM
- `DELETE /api/mobile/workspaces/:workspaceId/dms/:directConversationId/members/:userId`
  - remove member from group DM
- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/leave`
  - leave group DM

### DM Message Routes

- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages`
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages`
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId`
- `PATCH /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId`
- `DELETE /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId`

### Thread Routes

- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/thread`
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/thread`
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/thread/:replyId`
- `PATCH /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/thread/:replyId`
- `DELETE /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/thread/:replyId`

### Read / Unread Routes

- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/read`
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/unread-count`
- `GET /api/mobile/workspaces/:workspaceId/dms/unread-counts`

### Search

- `GET /api/mobile/workspaces/:workspaceId/dms/search`

Optional filters:

- `directConversationId`
- `cursor`
- `limit`

### Reactions

- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/reaction/toggle`

Allowed emoji set in v1:

- `👍`
- `❤️`
- `😂`
- `🎉`
- `🔥`

Behavior:

- no reaction yet -> create
- same reaction again -> remove
- different reaction -> replace

One user can have only one reaction per message.

### Pins

- `POST /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/pin/toggle`
- `GET /api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/pins`

## Message Behavior

DM messages follow the same core rules as channel messages.

### Supported Message Types

- `text`
- `file`
- `system`

### Attachments

DM attachments reuse the upload module.

Frontend flow:

1. upload file using upload API
2. get relative `path`
3. send DM message with attachment metadata referencing that path

DM message APIs do not upload files directly.

### Mentions

Mentions are stored inside `metadata.mentions`.

Validation rules:

- mentions must be an array
- every value must be UUID
- mentioned users must be active workspace members
- mentioned users must also be active DM members

### Threads

DMs support single-level threads only.

Allowed:

- message -> reply

Blocked:

- reply -> reply

Timeline list excludes replies by default.

### Edit / Delete

Same rule as channel messages:

- only author can edit/delete
- system messages cannot be edited/deleted
- edit/delete window is bounded by `MESSAGE_EDIT_WINDOW_MINUTES`

Delete is soft delete:

- `isDeleted = true`
- `deletedAt` set
- content and metadata hidden

## Read State and Unread Counts

Read state is DM-level, not per-message receipt tracking.

Stored in `user_dm_reads`:

- `lastReadMessageId`
- `lastReadAt`

Meaning:

- user has read up to this message in this DM

Unread counts:

- exclude deleted messages
- exclude user’s own messages
- compare against the saved last-read pointer

Frontend expectation:

- when user opens DM and reaches latest visible message, call mark-read API

## Search Behavior

DM search is workspace-scoped and membership-aware.

Current v1 search behavior:

- searches message `content`
- excludes deleted messages
- only returns messages from DMs where current user is active member
- optional filter by single `directConversationId`

Search result includes:

- message payload
- conversation title
- match preview

## Response Shape

DM message responses reuse the shared message presenter shape.

Important fields:

- `id`
- `workspaceId`
- `channelId` = `null` for DM messages
- `directConversationId`
- `senderUserId`
- `type`
- `content`
- `metadata`
- `parentMessageId`
- `isDeleted`
- `deletedAt`
- `editedAt`
- `createdAt`
- `updatedAt`
- `author`
- `attachments`
- `threadReplyCount`
- `canEdit`
- `canDelete`
- `reactionSummary`
- `myReaction`
- `isPinned`
- `pinnedAt`
- `pinnedByUserId`

## System Messages

The DM module now emits system messages for key conversation events.

Current v1 events:

- DM created
- DM member added
- DM member removed
- DM member left

These are written as normal `messages` rows with:

- `type = system`
- `directConversationId = <dm-id>`

Why this is useful:

- membership changes stay visible in the DM timeline
- frontend can render lifecycle events without extra event feed API

System messages are best-effort:

- if publishing fails, the main business action still succeeds

## Frontend Notes

### Open DM Flow

For one-to-one DM:

1. call `POST /workspaces/:workspaceId/dms`
2. pass one participant user id
3. backend returns existing DM if already present

For group DM:

1. call same route
2. pass multiple participant ids
3. include title

### Sidebar

Use:

- `GET /api/mobile/workspaces/:workspaceId/dms`

Sort order is already based on latest activity:

- `lastMessageAt desc`
- `id desc`

### Message Composer

Recommended frontend flow:

1. upload file first if needed
2. send DM message with attachment references
3. optionally use `metadata.clientMessageId` for optimistic UI reconciliation

### Mentions

Frontend should only allow mentioning active DM participants to avoid avoidable validation failures.

### Read Tracking

When user enters a DM and reaches the latest message:

- call read endpoint with latest visible message id

### Reactions

Frontend only needs one endpoint:

- toggle with chosen emoji

UI can render:

- `reactionSummary`
- `myReaction`

### Pins

Frontend can:

- toggle pin on individual message
- use `/messages/pins` to render pinned message panel

## Invariants

- all DM members must be active workspace members
- one-to-one DMs are deduplicated
- group DMs require title
- only active DM members can read/write/search
- single-level replies only
- system messages are immutable via normal message APIs

## Future Work

The following are intentionally deferred:

- audit hooks for DM create/member/message flows
- DM-specific admin or moderator role rules
- websocket live delivery and typing events
- DM notifications
- richer search ranking
- archived/hidden conversation behavior
- migration-level DB check enforcing exactly one message container

Audit hooks are a good next hardening step later, but are intentionally not part of the current DM delivery.
