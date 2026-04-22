# Product Requirements Document (PRD)

# Slack-Like App — Feature Specification

> **Version:** 1.0 · **Phase:** Planning · **Status:** MVP Scope Defined
> 

---

## Tier Legend

| Tier | Meaning |
| --- | --- |
| `CORE` | Must ship in MVP |
| `SECONDARY` | Post-MVP sprint |
| `LATER` | Future roadmap |

---

## 1. Authentication

Handles all user identity, session management, and access control.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /auth/signup` | Register a new global user account with email and password | `CORE` |
| `POST /auth/login` | Authenticate and return access + refresh tokens | `CORE` |
| `POST /auth/logout` | Revoke the current session token | `CORE` |
| `POST /auth/refresh` | Exchange a refresh token for a new access token | `CORE` |
| `GET /auth/me` | Return the currently authenticated user profile | `CORE` |

---

## 2. Workspace

Multi-tenant workspace management. Every piece of data lives inside a workspace.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /workspaces` | Create a new workspace with name, slug, and logo | `CORE` |
| `PATCH /workspaces/:id` | Update workspace name, logo, or settings | `CORE` |
| `GET /workspaces` | List all workspaces the current user belongs to | `CORE` |
| `POST /workspaces/:id/switch` | Switch active workspace context in session | `CORE` |
| `DELETE /workspaces/:id/leave` | Leave a workspace (non-owner) | `CORE` |
| `DELETE /workspaces/:id` | Delete workspace — owner only | `CORE` |

---

## 3. Members

Workspace membership, invitations, and role management.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /workspaces/:id/invites` | Send invite email with secure token to a new member | `CORE` |
| `POST /invites/:token/accept` | Accept invite and join workspace | `CORE` |
| `GET /workspaces/:id/members` | List all members in a workspace with roles | `CORE` |
| `PATCH /workspaces/:id/members/:uid` | Update member role (admin/member) | `CORE` |
| `DELETE /workspaces/:id/members/:uid` | Remove a member from the workspace | `CORE` |

---

## 4. Channels

Public and private channel management within a workspace.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /workspaces/:id/channels` | Create a public or private channel | `CORE` |
| `PATCH /channels/:id` | Update channel name, description, or topic | `CORE` |
| `DELETE /channels/:id` | Archive/soft-delete a channel | `CORE` |
| `GET /workspaces/:id/channels` | List all accessible channels in workspace | `CORE` |
| `POST /channels/:id/join` | Join a public channel (creates ChannelMember row) | `CORE` |
| `DELETE /channels/:id/leave` | Leave a channel | `CORE` |
| `POST /channels/:id/members` | Add member to private channel | `CORE` |
| `DELETE /channels/:id/members/:uid` | Remove member from private channel | `CORE` |

---

## 5. Messaging

Core message sending, editing, deletion, and pagination within channels.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /channels/:id/messages` | Send a message to a channel | `CORE` |
| `GET /channels/:id/messages` | Paginated list of channel messages (cursor-based) | `CORE` |
| `PATCH /messages/:id` | Edit own message content — stores `edited_at` | `CORE` |
| `DELETE /messages/:id` | Soft-delete own message — content replaced with `[deleted]` | `CORE` |
| `POST /channels/:id/messages` (system) | System messages for join/leave/rename events | `CORE` |

---

## 6. Threads

Threaded replies on any channel message via `parent_message_id`.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /messages/:id/replies` | Reply to a message — sets `parent_message_id` | `CORE` |
| `GET /messages/:id/replies` | List all replies in a thread, paginated | `CORE` |

---

## 7. Reactions

Emoji reactions on any message.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /messages/:id/reactions` | Add an emoji reaction to a message | `CORE` |
| `DELETE /messages/:id/reactions/:emoji` | Remove own emoji reaction from a message | `CORE` |

---

## 8. Direct Messages

1-to-1 and group DM conversations scoped to a workspace.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /workspaces/:id/dms` | Open or retrieve existing DM conversation | `CORE` |
| `POST /dms/:id/messages` | Send a message in a DM conversation | `CORE` |
| `GET /dms/:id/messages` | Paginated list of DM messages (cursor-based) | `CORE` |

---

## 9. Notifications

Unread counts, mention alerts, thread replies, and DM notifications.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `GET /workspaces/:id/notifications` | List user notifications in workspace | `CORE` |
| `PATCH /notifications/:id/read` | Mark a notification as read | `CORE` |
| `PATCH /notifications/read-all` | Mark all notifications as read | `CORE` |
| `GET /workspaces/:id/unread` | Get unread counts per channel and DM | `CORE` |

---

## 10. Attachments

File metadata attached to messages. Actual file storage handled by S3/R2/GCS — never stored in the database.

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /messages/:id/attachments` | Attach file metadata to a message | `CORE` |
| `GET /messages/:id/attachments` | List attachments for a message | `CORE` |

---

## Secondary Features — Post-MVP Sprint

| Endpoint / Action | Description | Tier |
| --- | --- | --- |
| `POST /messages/:id/pin` | Pin a message in a channel | `SECONDARY` |
| `DELETE /messages/:id/pin` | Unpin a message | `SECONDARY` |
| `POST /messages/:id/save` | Save/bookmark a message for current user | `SECONDARY` |
| `GET /users/me/saved` | List saved messages for current user | `SECONDARY` |
| `GET /workspaces/:id/search/messages` | Full-text search across messages | `SECONDARY` |
| `GET /workspaces/:id/search/channels` | Search channels by name or topic | `SECONDARY` |
| `GET /workspaces/:id/search/users` | Search workspace members by name | `SECONDARY` |
| `WS typing indicator` | Real-time typing indicator per channel/DM via WebSocket | `SECONDARY` |
| `WS presence` | Online / away / offline status via WebSocket heartbeat | `SECONDARY` |
| `read receipts` | Per-message seen tracking for DMs | `SECONDARY` |
| `PATCH /channels/:id` (topic) | Set/update channel topic | `SECONDARY` |
| `GET /workspaces/:id/activity` | Member activity log for workspace admins | `SECONDARY` |

---

## Later — Future Roadmap

| Feature | Description | Tier |
| --- | --- | --- |
| Voice / Video calls | WebRTC-based voice and video within channels or DMs | `LATER` |
| Bots & Apps | Slash commands, webhooks, and third-party integrations | `LATER` |
| Enterprise SSO | SAML 2.0 / OIDC single sign-on for enterprise workspaces | `LATER` |
| Moderation dashboard | Admin panel for message moderation and user management | `LATER` |
| Retention policy | Auto-delete messages older than a configurable period | `LATER` |
| Analytics dashboard | Usage metrics and workspace health reports | `LATER` |
| Shared channels | Cross-workspace channel sharing | `LATER` |

---

## ⚡ Real-Time Architecture — Decision Required Before Coding

This decision affects backend infrastructure significantly. Must be locked before writing any message-send or presence logic.

| Option | Best For | Tradeoff |
| --- | --- | --- |
| **WebSockets + Redis Pub/Sub** ✅ Recommended | Full duplex: messages, typing, presence — everything Slack needs | More complex infra, need Redis |
| **SSE (Server-Sent Events)** | Simpler — good for notifications only, one-way server push | No client→server push, limited |
| **Polling** | Simplest possible — fine for prototype only | Not viable for production |

**Recommendation:** WebSockets with Redis Pub/Sub. Write to DB first, then publish event to Redis channel. Subscribers (WS handlers) push to connected clients. Handle DB write failures before publishing.