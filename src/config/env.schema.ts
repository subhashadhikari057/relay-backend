import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_PRIVATE_KEY_BASE64: z.string(),
  JWT_PUBLIC_KEY_BASE64: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('relay_refresh_token'),
  SESSION_COOKIE_NAME: z.string().default('relay_sid'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  AUTH_COOKIE_PATH: z.string().default('/api'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_MAX_ACTIVE_SESSIONS_PER_USER: z.string().default('0'),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.string().default('20m'),
  EMAIL_VERIFICATION_URL_BASE: z.string().url(),
  UPLOAD_LOCAL_ROOT: z.string().default('uploads'),
});
