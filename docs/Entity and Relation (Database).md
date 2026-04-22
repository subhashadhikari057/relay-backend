# Entity and Relation (Database)

# Slack-Like App — Database Design

> **Version:** 1.0 · **Phase:** Planning · **Target DB:** PostgreSQL · **ID Strategy:** UUID v7
> 

---

## Column Legend

| Marker | Meaning |
| --- | --- |
| 🔑 | Primary Key |
| 🔗 | Foreign Key |
| ⚠️ | Important constraint or design note |

---

# Part 1 — Entity Definitions

---

## 1.1 `users`

Global account entity. One user can belong to many workspaces. Never hard-delete users — use `is_active = false`.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` | UUIDv7 generated at application/service layer |
| `email` | `CITEXT` | `NOT NULL UNIQUE` | Case-insensitive unique email at DB level |
| `password_hash` | `TEXT` | `NULLABLE` | Required for `local` auth users, nullable for Google-only users |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | Legal or preferred full name |
| `display_name` | `VARCHAR(80)` | `NULLABLE` | Short name shown in UI — falls back to `full_name` |
| `avatar_url` | `TEXT` | `NULLABLE` | URL to profile image |
| `status` | `VARCHAR(100)` | `NULLABLE` | User-set status text e.g. "In a meeting" |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Soft deactivation flag — set to false instead of hard delete |
| `email_verified_at` | `TIMESTAMPTZ` | `NULLABLE` | Null until email verification completes |
| `last_login_at` | `TIMESTAMPTZ` | `NULLABLE` | Updated on successful login (local or Google) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Updated via trigger on row change |

---

## 1.2 `sessions`

Refresh token sessions. Access tokens are stateless JWT and never stored here — only refresh tokens.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `token_hash` | `TEXT` | `NOT NULL UNIQUE` | SHA-256 hash of the raw token sent to client |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Rolling 30-day expiry recommended |
| `revoked_at` | `TIMESTAMPTZ` | `NULLABLE` | Set on logout or token rotation |
| `device_info` | `TEXT` | `NULLABLE` | User-agent or device label |
| `ip_address` | `INET` | `NULLABLE` | Client IP at login time |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ Sessions with `revoked_at` set must be rejected even if `expires_at` is still in the future.
> 

---

## 1.2.1 `auth_accounts`

External identity provider links for a user. Supports local + Google coexistence on the same account.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` | UUIDv7 generated at application/service layer |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `provider` | `VARCHAR(20)` | `NOT NULL` | Enum: `local` \| `google` |
| `provider_account_id` | `VARCHAR(255)` | `NOT NULL` | Unique provider-side identifier |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Updated via trigger on row change |

> ⚠️ `UNIQUE (provider, provider_account_id)` — prevents duplicate provider identity links.
> 

---

## 1.2.2 `email_verification_tokens`

One-time verification tokens for confirming ownership of an email address. Store only token hashes.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` | UUIDv7 generated at application/service layer |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `token_hash` | `TEXT` | `NOT NULL UNIQUE` | SHA-256 hash of raw verification token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Token expiry window |
| `used_at` | `TIMESTAMPTZ` | `NULLABLE` | Set immediately when token is redeemed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ Verification tokens are single-use. Reject if expired or `used_at` is already set.
> 

---

## 1.2.3 `password_reset_tokens`

One-time reset tokens for forgot-password flow. Store only token hashes.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` | UUIDv7 generated at application/service layer |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `token_hash` | `TEXT` | `NOT NULL UNIQUE` | SHA-256 hash of raw reset token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Short expiry window recommended |
| `used_at` | `TIMESTAMPTZ` | `NULLABLE` | Set immediately after successful password reset |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ Reset tokens are single-use. Reject if expired or `used_at` is already set.
> 

---

## 1.3 `workspaces`

Top-level multi-tenant container. All data is scoped to a workspace.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| `name` | `VARCHAR(100)` | `NOT NULL` | Display name |
| `slug` | `VARCHAR(60)` | `NOT NULL UNIQUE` | URL-safe identifier e.g. `acme-corp` |
| `logo_url` | `TEXT` | `NULLABLE` |  |
| 🔗 `owner_user_id` | `UUID` | `FK NOT NULL` | → `users.id` — must also be a workspace member |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

---

## 1.4 `workspace_members`

Join table between users and workspaces. The backbone of multi-tenancy.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` | Or use composite PK `(workspace_id, user_id)` |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` ON DELETE CASCADE |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `role` | `VARCHAR(20)` | `NOT NULL DEFAULT 'member'` | Enum: `owner` | `admin` | `member` |
| 🔗 `invited_by` | `UUID` | `FK NULLABLE` | → `users.id` — who sent the invite |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `UNIQUE (workspace_id, user_id)` — enforced at DB level, not just application level.
> 

---

## 1.5 `workspace_invites`

Invite flow. Tokens are stored as hashes — raw token sent in email only, single use.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` ON DELETE CASCADE |
| `email` | `VARCHAR(255)` | `NOT NULL` | Invited email address |
| `role` | `VARCHAR(20)` | `NOT NULL DEFAULT 'member'` | Role to assign on accept |
| 🔗 `invited_by` | `UUID` | `FK NOT NULL` | → `users.id` |
| `token_hash` | `TEXT` | `NOT NULL UNIQUE` | SHA-256 of raw token — never store raw token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Recommended: 7 days from creation |
| `accepted_at` | `TIMESTAMPTZ` | `NULLABLE` | Set when user accepts |
| `revoked_at` | `TIMESTAMPTZ` | `NULLABLE` | Admin can revoke before acceptance |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

---

## 1.6 `channels`

Conversation spaces inside a workspace. Use `is_archived` instead of hard delete.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` ON DELETE CASCADE |
| `name` | `VARCHAR(80)` | `NOT NULL` | Lowercase slug-style e.g. `general` |
| `description` | `TEXT` | `NULLABLE` |  |
| `topic` | `VARCHAR(255)` | `NULLABLE` | Short pinned topic shown in channel header |
| `type` | `VARCHAR(10)` | `NOT NULL DEFAULT 'public'` | Enum: `public` | `private` |
| 🔗 `created_by` | `UUID` | `FK NOT NULL` | → `users.id` |
| `is_archived` | `BOOLEAN` | `NOT NULL DEFAULT false` | Archived channels remain readable |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `UNIQUE (workspace_id, name)` — no duplicate channel names per workspace.
> 

---

## 1.7 `channel_members`

Explicit membership for all channels — both public (on join) and private (on invite). Required for unread tracking and access control.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔗 `channel_id` | `UUID` | `FK NOT NULL` | → `channels.id` ON DELETE CASCADE |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `role` | `VARCHAR(20)` | `NOT NULL DEFAULT 'member'` | Enum: `admin` | `member` |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `PRIMARY KEY (channel_id, user_id)` — composite PK.
> 

> ⚠️ Design decision locked: **explicit membership for all channels** (both public and private). Insert a `channel_members` row when a user joins a public channel. This is required to support unread counts, per-channel notification preferences, and sidebar ordering.
> 

---

## 1.8 `direct_conversations`

DM container scoped to a workspace. Supports 2-person and group DMs.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` ON DELETE CASCADE |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Updated on every new message — used for sidebar sorting |

> ⚠️ For 2-person DMs: application must check for an existing conversation before creating a new one. Lookup by sorting the two `user_id` values and querying `direct_conversation_members`.
> 

---

## 1.9 `direct_conversation_members`

Join table for DM participants.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔗 `direct_conversation_id` | `UUID` | `FK NOT NULL` | → `direct_conversations.id` ON DELETE CASCADE |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `PRIMARY KEY (direct_conversation_id, user_id)` — composite PK.
> 

---

## 1.10 `messages`

The central entity. Handles channel messages, DM messages, and thread replies via `parent_message_id`.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` — denormalized for query performance |
| 🔗 `sender_user_id` | `UUID` | `FK NOT NULL` | → `users.id` |
| 🔗 `channel_id` | `UUID` | `FK NULLABLE` | → `channels.id` ON DELETE CASCADE |
| 🔗 `direct_conversation_id` | `UUID` | `FK NULLABLE` | → `direct_conversations.id` ON DELETE CASCADE |
| 🔗 `parent_message_id` | `UUID` | `FK NULLABLE` | → `messages.id` — self-reference for thread replies |
| `content` | `TEXT` | `NOT NULL` | Message body — supports markdown |
| `is_system_message` | `BOOLEAN` | `NOT NULL DEFAULT false` | True for join/leave/rename/archive events |
| `edited_at` | `TIMESTAMPTZ` | `NULLABLE` | Set on first edit — shows "Edited" label in UI |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE` | Soft delete — content replaced with `[deleted]` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ **DB CHECK constraint — must be added at migration time:**
> 

```sql
ALTER TABLE messages ADD CONSTRAINT chk_message_container
CHECK (
  (channel_id IS NOT NULL AND direct_conversation_id IS NULL)
  OR
  (channel_id IS NULL AND direct_conversation_id IS NOT NULL)
);
```

> ⚠️ Thread replies: a reply has `parent_message_id` set AND still has `channel_id` or `direct_conversation_id` set to the same container as the parent. Do not nest replies beyond one level.
> 

---

## 1.11 `message_reactions`

Emoji reactions on messages. One reaction per emoji per user per message.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔗 `message_id` | `UUID` | `FK NOT NULL` | → `messages.id` ON DELETE CASCADE |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| `emoji` | `VARCHAR(10)` | `NOT NULL` | Unicode emoji e.g. `👍` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `PRIMARY KEY (message_id, user_id, emoji)` — prevents duplicate reactions.
> 

---

## 1.12 `message_attachments`

File metadata only. Never store file bytes in the database — use S3, R2, or GCS.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `message_id` | `UUID` | `FK NOT NULL` | → `messages.id` ON DELETE CASCADE |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | Original filename from upload |
| `storage_key` | `TEXT` | `NOT NULL` | S3/R2 object key — used to generate signed URLs |
| `mime_type` | `VARCHAR(100)` | `NOT NULL` | e.g. `image/png`, `application/pdf` |
| `file_size` | `BIGINT` | `NOT NULL` | Bytes — used for quota checks |
| 🔗 `uploaded_by` | `UUID` | `FK NOT NULL` | → `users.id` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

---

## 1.13 `user_channel_reads`

Tracks last-read position per user per channel. Used to compute unread message counts.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| 🔗 `channel_id` | `UUID` | `FK NOT NULL` | → `channels.id` ON DELETE CASCADE |
| 🔗 `last_read_message_id` | `UUID` | `FK NULLABLE` | → `messages.id` — last message the user saw |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Updated on every channel visit |

> ⚠️ `PRIMARY KEY (user_id, channel_id)` — upsert on every channel visit.
> 

**Unread count query:**

```sql
SELECT COUNT(*)
FROM messages
WHERE channel_id = :channel_id
  AND id > :last_read_message_id
  AND sender_user_id != :current_user_id
  AND deleted_at IS NULL;
```

> For this query to be efficient, message `id` must be orderable. Use UUIDv7 or add a separate `sequence_number BIGSERIAL` column per channel.
> 

---

## 1.14 `user_dm_reads`

Same pattern as `user_channel_reads` but for DM conversations.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| 🔗 `direct_conversation_id` | `UUID` | `FK NOT NULL` | → `direct_conversations.id` ON DELETE CASCADE |
| 🔗 `last_read_message_id` | `UUID` | `FK NULLABLE` | → `messages.id` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `PRIMARY KEY (user_id, direct_conversation_id)`.
> 

---

## 1.15 `notifications`

User-specific notification records. Each notification points to the entity that triggered it.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE — recipient |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` ON DELETE CASCADE |
| `type` | `VARCHAR(40)` | `NOT NULL` | Enum: `mention` | `thread_reply` | `dm` | `invite` | `reaction` |
| 🔗 `actor_user_id` | `UUID` | `FK NULLABLE` | → `users.id` — who triggered the notification |
| `entity_type` | `VARCHAR(40)` | `NOT NULL` | Enum: `message` | `direct_conversation` | `workspace_invite` |
| `entity_id` | `UUID` | `NOT NULL` | ID in the corresponding table (no DB-level FK — polymorphic) |
| `is_read` | `BOOLEAN` | `NOT NULL DEFAULT false` |  |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

> ⚠️ `entity_type` must be enforced as a CHECK constraint or DB enum — invalid types must not be insertable.
> 

**Entity type reference:**

| `entity_type` | `entity_id` points to |
| --- | --- |
| `message` | `messages.id` |
| `direct_conversation` | `direct_conversations.id` |
| `workspace_invite` | `workspace_invites.id` |

---

## 1.16 `notification_preferences`

Per-user, per-workspace notification settings. Optional for MVP — add when notification volume becomes a concern.

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `user_id` | `UUID` | `FK NOT NULL` | → `users.id` ON DELETE CASCADE |
| 🔗 `workspace_id` | `UUID` | `FK NOT NULL` | → `workspaces.id` ON DELETE CASCADE |
| `mentions_enabled` | `BOOLEAN` | `NOT NULL DEFAULT true` |  |
| `dm_enabled` | `BOOLEAN` | `NOT NULL DEFAULT true` |  |
| `thread_replies_enabled` | `BOOLEAN` | `NOT NULL DEFAULT true` |  |
| `email_enabled` | `BOOLEAN` | `NOT NULL DEFAULT false` | Email digest — LATER feature |

> ⚠️ `UNIQUE (user_id, workspace_id)`.
> 

---

## 1.17 `audit_logs`

Immutable event log. Never update or delete audit records. `workspace_id` is only nullable for global auth-level events (signup, login).

| Column | Type | Constraint | Notes |
| --- | --- | --- | --- |
| 🔑 `id` | `UUID` | `PK NOT NULL` |  |
| 🔗 `workspace_id` | `UUID` | `FK NULLABLE` | → `workspaces.id` SET NULL on delete — null only for global auth events |
| 🔗 `actor_user_id` | `UUID` | `FK NULLABLE` | → `users.id` — null for system/automated events |
| `action` | `VARCHAR(80)` | `NOT NULL` | e.g. `member.removed`, `channel.deleted`, `message.deleted` |
| `entity_type` | `VARCHAR(40)` | `NOT NULL` | e.g. `workspace` | `channel` | `message` | `user` |
| `entity_id` | `UUID` | `NOT NULL` | ID of the affected record |
| `metadata` | `JSONB` | `NULLABLE` | Extra context — old values, reason, IP, etc. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |  |

---

# Part 2 — Relation Map

| From | Cardinality | To | Via / FK | Rule |
| --- | --- | --- | --- | --- |
| `users` | 1 → N | `sessions` | `sessions.user_id` | CASCADE on hard delete; deactivation uses `is_active = false` |
| `users` | 1 → N | `auth_accounts` | `auth_accounts.user_id` | CASCADE delete |
| `users` | 1 → N | `email_verification_tokens` | `email_verification_tokens.user_id` | CASCADE delete |
| `users` | 1 → N | `password_reset_tokens` | `password_reset_tokens.user_id` | CASCADE delete |
| `users` | M → N | `workspaces` | `workspace_members` | UNIQUE `(workspace_id, user_id)` |
| `workspaces` | 1 → N | `channels` | `channels.workspace_id` | CASCADE delete |
| `workspaces` | 1 → N | `workspace_members` | `workspace_members.workspace_id` | CASCADE delete |
| `workspaces` | 1 → N | `workspace_invites` | `workspace_invites.workspace_id` | CASCADE delete |
| `workspaces` | 1 → N | `direct_conversations` | `direct_conversations.workspace_id` | CASCADE delete |
| `workspaces` | 1 → N | `notifications` | `notifications.workspace_id` | CASCADE delete |
| `workspaces` | 1 → N | `audit_logs` | `audit_logs.workspace_id` | SET NULL on workspace delete |
| `channels` | M → N | `users` | `channel_members` | Explicit join — both public and private |
| `channels` | 1 → N | `messages` | `messages.channel_id` | CASCADE delete |
| `direct_conversations` | M → N | `users` | `direct_conversation_members` | Composite PK |
| `direct_conversations` | 1 → N | `messages` | `messages.direct_conversation_id` | CASCADE delete |
| `messages` | 1 → N | `messages` | `messages.parent_message_id` | Self-reference for thread replies |
| `messages` | 1 → N | `message_reactions` | `message_reactions.message_id` | CASCADE delete |
| `messages` | 1 → N | `message_attachments` | `message_attachments.message_id` | CASCADE delete |
| `users` | 1 → N | `user_channel_reads` | `user_channel_reads.user_id` | Upsert on channel visit |
| `users` | 1 → N | `user_dm_reads` | `user_dm_reads.user_id` | Upsert on DM visit |
| `users` | 1 → N | `notifications` | `notifications.user_id` | CASCADE delete |

---

### Message Container Rule — Enforced at DB Level

A message belongs to exactly one container — either a channel or a DM conversation. Never both. Never neither.

```sql
ALTER TABLE messages ADD CONSTRAINT chk_message_container
CHECK (
  (channel_id IS NOT NULL AND direct_conversation_id IS NULL)
  OR
  (channel_id IS NULL AND direct_conversation_id IS NOT NULL)
);
```

---

# Part 3 — Index Strategy

All primary keys automatically create a B-tree index. The table below lists **additional** indexes only.

| Table | Index Columns | Type | Reason |
| --- | --- | --- | --- |
| `users` | `email` (`CITEXT`) | `UNIQUE` | Case-insensitive login lookup by email |
| `sessions` | `token_hash` | `UNIQUE` | Token validation on every authenticated request |
| `sessions` | `user_id` | `B-TREE` | List sessions for a user (logout all devices) |
| `sessions` | `expires_at` | `B-TREE` | Cleanup job — purge expired sessions |
| `auth_accounts` | `(provider, provider_account_id)` | `UNIQUE` | Resolve linked provider account (local/google) |
| `auth_accounts` | `user_id` | `B-TREE` | List auth methods linked to a user |
| `email_verification_tokens` | `token_hash` | `UNIQUE` | Verification token redemption |
| `email_verification_tokens` | `user_id` | `B-TREE` | Revoke/list pending verification tokens per user |
| `email_verification_tokens` | `expires_at` | `B-TREE` | Cleanup expired verification tokens |
| `password_reset_tokens` | `token_hash` | `UNIQUE` | Password reset token redemption |
| `password_reset_tokens` | `user_id` | `B-TREE` | Revoke/list pending reset tokens per user |
| `password_reset_tokens` | `expires_at` | `B-TREE` | Cleanup expired reset tokens |
| `workspaces` | `slug` | `UNIQUE` | Workspace lookup by URL slug |
| `workspace_members` | `(workspace_id, user_id)` | `UNIQUE` | Core membership check — most frequent query |
| `workspace_members` | `user_id` | `B-TREE` | List all workspaces a user belongs to |
| `workspace_invites` | `token_hash` | `UNIQUE` | Invite token validation |
| `workspace_invites` | `(workspace_id, email)` partial unique | `B-TREE` | Prevent duplicate pending invites only (`accepted_at IS NULL AND revoked_at IS NULL`) |
| `channels` | `(workspace_id, name)` | `UNIQUE` | No duplicate names per workspace |
| `channels` | `workspace_id` | `B-TREE` | List all channels in a workspace |
| `channel_members` | `(channel_id, user_id)` | `UNIQUE` | Membership check for access control |
| `channel_members` | `user_id` | `B-TREE` | List all channels a user is in (sidebar) |
| `messages` | `(channel_id, created_at DESC)` | `B-TREE` | Paginate channel messages — **hottest index** |
| `messages` | `(direct_conversation_id, created_at DESC)` | `B-TREE` | Paginate DM messages |
| `messages` | `(parent_message_id, created_at ASC)` | `B-TREE` | Fetch thread replies in chronological order |
| `messages` | `workspace_id` | `B-TREE` | Workspace-scoped message queries |
| `messages` | `sender_user_id` | `B-TREE` | User message history |
| `message_reactions` | `(message_id, emoji)` | `B-TREE` | Count reactions per emoji on a message |
| `user_channel_reads` | `(user_id, channel_id)` | `UNIQUE` | Upsert on channel visit |
| `user_dm_reads` | `(user_id, direct_conversation_id)` | `UNIQUE` | Upsert on DM visit |
| `notifications` | `(user_id, is_read, created_at DESC)` | `B-TREE` | Fetch unread notifications — composite |
| `notifications` | `(user_id, workspace_id)` | `B-TREE` | Workspace-scoped notification list |
| `audit_logs` | `(workspace_id, created_at DESC)` | `B-TREE` | Admin audit log pagination |
| `audit_logs` | `(entity_type, entity_id)` | `B-TREE` | Find all events for a specific record |

---

# Part 4 — Business Rules

---

## Access Control

- A user can only read a **private channel's** messages if a `channel_members` row exists for them
- A user can only read a **DM conversation's** messages if a `direct_conversation_members` row exists for them
- Only the sender can edit or soft-delete their own message (`deleted_at` is set, content replaced with `[deleted]`)
- Only workspace `owner` or `admin` can remove members, delete channels, or revoke invites
- Workspace `owner` cannot leave their own workspace — must transfer ownership first
- Only workspace members can access any workspace-scoped resource

---

## Data Integrity

- `workspace_members.role` must be one of: `owner` | `admin` | `member`
- `channels.type` must be one of: `public` | `private`
- `notifications.type` must be one of: `mention` | `thread_reply` | `dm` | `invite` | `reaction`
- `auth_accounts.provider` must be one of: `local` | `google`
- `users.email` must be unique in a case-insensitive manner (prefer `citext`)
- `message.content` cannot be empty string — minimum 1 non-whitespace character (enforce via CHECK)
- Sessions with `revoked_at` set must be rejected regardless of `expires_at`
- Invite tokens must be cryptographically random and stored only as a hash
- Invite tokens are single-use — set `accepted_at` immediately on redemption
- Verification/reset tokens must be cryptographically random, stored only as hash, and single-use (`used_at`)
- Local-auth users must have non-null `password_hash`; social-only users may have null `password_hash`

---

## Cascade Rules

| Trigger | Cascades To |
| --- | --- |
| Delete workspace | channels, workspace_members, workspace_invites, direct_conversations, messages, notifications, audit_logs (SET NULL) |
| Delete channel | messages, channel_members, user_channel_reads |
| Delete direct_conversation | messages, direct_conversation_members, user_dm_reads |
| Delete message | message_reactions, message_attachments, thread replies (via parent_message_id) |
| Deactivate user | Set `is_active = false` — **do NOT cascade-delete messages**, use a placeholder sender name instead |

---

## Soft Delete Rules

| Entity | Soft Delete Column | Behavior |
| --- | --- | --- |
| `messages` | `deleted_at` | Content replaced with `[deleted]` in API response |
| `channels` | `is_archived` | Channel stays readable, no new messages |
| `users` | `is_active` | User cannot log in, appears as "Deactivated user" |
| `workspace_invites` | `revoked_at` / `accepted_at` | Token becomes invalid |

---

# Part 5 — MVP Entity Checklist

| Entity | Status |
| --- | --- |
| `users` | ✅ Must have |
| `sessions` | ✅ Must have |
| `auth_accounts` | ✅ Must have |
| `email_verification_tokens` | ✅ Must have |
| `password_reset_tokens` | ✅ Must have |
| `workspaces` | ✅ Must have |
| `workspace_members` | ✅ Must have |
| `workspace_invites` | ✅ Must have |
| `channels` | ✅ Must have |
| `channel_members` | ✅ Must have |
| `direct_conversations` | ✅ Must have |
| `direct_conversation_members` | ✅ Must have |
| `messages` | ✅ Must have |
| `message_reactions` | ✅ Must have |
| `user_channel_reads` | ✅ Must have |
| `user_dm_reads` | ✅ Must have |
| `notifications` | ✅ Must have |
| `audit_logs` | ✅ Must have |
| `message_attachments` | ⏳ Add slightly after MVP |
| `notification_preferences` | ⏳ Add slightly after MVP |
