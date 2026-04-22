# Auth Module

## Overview

The `auth` module handles platform authentication and session security for two audiences:

- Admin API: `/api/admin/auth/*`
- Mobile API: `/api/mobile/auth/*`

Current design goals:

- Keep passwords secure with **Argon2id**
- Use short-lived **RS256 access JWT**
- Use **opaque refresh token** in HttpOnly cookie
- Bind access token to DB session via `sessionId`
- Support immediate revocation through session checks
- Enforce env-driven session limits with auto-eviction

---

## Current Auth Design

### Token model

1. Access token
- RS256 signed JWT
- Sent in `Authorization: Bearer <token>`
- Payload includes:
  - `sub` (user id)
  - `email`
  - `platformRole`
  - `sessionId`

2. Refresh/session cookies
- `relay_refresh_token`: opaque random refresh token (HttpOnly)
- `relay_sid`: session id (HttpOnly)
- Used by refresh/logout endpoints

3. Persistence
- `sessions.token_hash` stores SHA-256 hash of refresh token
- Session row includes metadata and lifecycle fields:
  - `expires_at`, `revoked_at`, `created_at`, `last_active_at`

### Session validation

- Every protected route using `AccessTokenGuard`:
  1. Verifies RS256 JWT
  2. Loads session by `sessionId`
  3. Rejects if revoked/expired/missing/mismatch
  4. Touches `last_active_at`

This makes logout/revocation effective immediately even if access token has not expired.

### Session limit behavior

Env variable:
- `AUTH_MAX_ACTIVE_SESSIONS_PER_USER`
  - `0` => unlimited
  - `> 0` => max concurrent active sessions

When login happens and max is reached:
1. Oldest active session by `last_active_at` is revoked
2. Session eviction notification hook is triggered
3. New session is created and login succeeds normally

### Collision safety

If refresh token hash collides on unique key:
- Session create/rotate retries with a new refresh token
- Prevents rapid-login race failures

---

## Endpoints

### Admin

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`

### Mobile

- `POST /api/mobile/auth/signup`
- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/refresh`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`
- `POST /api/mobile/auth/verify-email/request`
- `POST /api/mobile/auth/verify-email/confirm`

### Mobile Session Management

- `GET /api/mobile/auth/sessions`
  - List active sessions with `currentSession` flag
- `DELETE /api/mobile/auth/sessions/:sessionId`
  - Revoke one selected session
- `DELETE /api/mobile/auth/sessions`
  - Revoke all sessions except current

---

## File Responsibilities

### Module wiring

- `src/modules/auth/auth.module.ts`
  - Registers controllers, guards, and shared auth services

### Controllers

- `src/modules/auth/admin/auth.admin.controller.ts`
  - Admin auth transport layer + Swagger contract
- `src/modules/auth/mobile/auth.mobile.controller.ts`
  - Mobile auth transport layer + Swagger contract

### Shared services

- `src/modules/auth/shared/services/auth.service.ts`
  - Core auth orchestration:
    - login/signup/refresh/logout
    - session limit + auto-eviction
    - session management APIs
- `src/modules/auth/shared/services/token.service.ts`
  - RS256 access token sign/verify
  - opaque refresh token generation
  - TTL utilities
- `src/modules/auth/shared/services/session.service.ts`
  - Session DB operations, rotation, revoke, activity tracking
- `src/modules/auth/shared/services/auth-cookie.service.ts`
  - Refresh + sid cookie set/clear/read with env-driven cookie policy
- `src/modules/auth/shared/services/password.service.ts`
  - Argon2id hash/verify
- `src/modules/auth/shared/services/email-verification.service.ts`
  - Verification token lifecycle and user verification
- `src/modules/auth/shared/services/email-delivery.service.ts`
  - Current dev fallback (logs verification link)
- `src/modules/auth/shared/services/session-notification.service.ts`
  - Session eviction notification hook (current placeholder logger)

### Guards/decorators

- `src/modules/auth/shared/guards/access-token.guard.ts`
  - JWT + DB session validation on protected routes
- `src/modules/auth/shared/guards/platform-role.guard.ts`
  - Platform role gating for admin routes
- `src/modules/auth/shared/decorators/platform-roles.decorator.ts`
  - Role metadata decorator
- `src/common/decorators/current-user.decorator.ts`
  - Extracts JWT payload from request

### DTOs/contracts

- Request DTOs in:
  - `src/modules/auth/admin/dto/*`
  - `src/modules/auth/mobile/dto/*`
- Response DTOs in:
  - `src/modules/auth/shared/dto/*`

---

## Config and Environment

### JWT/session

- `JWT_PRIVATE_KEY_BASE64`
- `JWT_PUBLIC_KEY_BASE64`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `REFRESH_COOKIE_NAME`
- `SESSION_COOKIE_NAME`
- `AUTH_MAX_ACTIVE_SESSIONS_PER_USER`

### Cookie policy

- `AUTH_COOKIE_SAME_SITE`
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_PATH`
- `AUTH_COOKIE_DOMAIN` (optional)

### Email verification

- `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN`
- `EMAIL_VERIFICATION_URL_BASE`

---

## Leftouts / Next Implementations

Planned next auth milestones:

1. Forgot password (request reset)
- Add endpoint to request reset token
- Store hashed reset token with expiry and one-time use
- Send email with reset link

2. Reset password (confirm token + new password)
- Validate token hash/expiry/used state
- Update password hash with Argon2id
- Mark reset token as used

3. Invalidate all other sessions after successful reset
- Revoke all active sessions except current (or optionally all)
- Force re-auth on other devices

4. Real email provider integration
- Replace dev log-only delivery with SMTP/provider implementation
- Keep dev fallback option for local/testing

5. Google login / account linking
- Add `auth_accounts` linkage flow
- Support login/link/unlink rules
- Handle local+google coexistence safely

---

## Notes

- Migration for `last_active_at` must be applied manually as per project workflow.
- WebSocket push for eviction is not yet implemented; `SessionNotificationService` is the integration hook for it.
