# Upload Module

## Overview

The `upload` module handles authenticated file uploads for both mobile and admin APIs.

API split:
- Mobile: `/api/mobile/upload/*`
- Admin: `/api/admin/upload/*`

Current design goals:
- Local storage first with provider abstraction for future cloud migration
- Relative file path response contract
- Optional image optimization (`optimize=true`)
- Stronger upload safety checks (allowlist + basic content signature checks)

---

## Module Structure

- `src/modules/upload/upload.module.ts`
  - Registers controllers, service, and storage provider binding
- `src/modules/upload/mobile/upload.mobile.controller.ts`
  - Mobile upload transport layer
- `src/modules/upload/admin/upload.admin.controller.ts`
  - Admin upload transport layer
- `src/modules/upload/shared/services/upload.service.ts`
  - Validation/scanning orchestration + storage calls
- `src/modules/upload/shared/services/local-upload-storage.provider.ts`
  - Local disk storage implementation
- `src/modules/upload/shared/dto/*`
  - query/body/response DTO contracts
- `src/modules/upload/shared/constants/upload.constants.ts`
  - limits, allowlists, provider token

---

## Security Model

### Guards

- Mobile routes:
  - `AccessTokenGuard`
- Admin routes:
  - `AccessTokenGuard`
  - `PermissionGuard`
  - `@RequirePermission(platform.upload, write)`

### Validation rules

- Single upload max size: `10MB`
- Multiple upload max count: `10`
- Multiple upload per-file max size: `10MB`
- MIME allowlist + extension allowlist enforced
- Basic magic-byte/content checks for key file types
- Optional scan hook (`upload.enableScan`) before save

---

## Endpoints

### Mobile

Base route: `/api/mobile/upload`

- `POST /single`
  - Multipart field: `file`
  - Query: `optimize?: boolean`
  - Body context (optional): `workspaceId`, `channelId`, `messageId`
- `POST /multiple`
  - Multipart field: `files[]`
  - Query: `optimize?: boolean`
  - Body context (optional): `workspaceId`, `channelId`, `messageId`

### Admin

Base route: `/api/admin/upload`

- `POST /single`
- `POST /multiple`

Request shape is same as mobile, but admin route requires platform upload write permission.

---

## Storage and Response Contract

### Local path strategy

Saved path format:
- `uploads/YYYY/MM/DD/<uuid>.<ext>`

Response returns relative path only (not absolute disk path).

### Response item fields

- `path` (relative)
- `fileName`
- `originalName`
- `mimeType`
- `size`
- `optimized`
- `context` (`workspaceId`, `channelId`, `messageId`)

---

## Optimization Behavior

- If `optimize=true` and file is image:
  - system attempts JPEG optimization via `sips`
- If optimization fails:
  - original file is stored
  - `optimized=false`
- Non-image files are stored as-is even when `optimize=true`

---

## Configuration

Key config values:
- `UPLOAD_LOCAL_ROOT` (default `uploads`)
- `upload.enableScan` (scan hook flag)

---

## Notes

- Current implementation stores files locally only.
- Provider abstraction is already in place, so Cloudinary/S3 migration can be added without changing controller contracts.
- No media DB table in v1; context fields are metadata hints for future gallery/listing features.
