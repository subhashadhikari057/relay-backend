export const MAX_SINGLE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_MULTIPLE_FILES_COUNT = 10;

export const UPLOAD_STORAGE_PROVIDER = Symbol('UPLOAD_STORAGE_PROVIDER');

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
] as const;
