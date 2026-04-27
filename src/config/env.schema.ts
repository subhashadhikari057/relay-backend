import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().default('3000'),
  FRONTEND_ORIGINS: z
    .string()
    .default('http://localhost:8080,http://127.0.0.1:8080'),
  DATABASE_URL: z.string(),
  JWT_PRIVATE_KEY_BASE64: z.string(),
  JWT_PUBLIC_KEY_BASE64: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('relay_refresh_token'),
  SESSION_COOKIE_NAME: z.string().default('relay_sid'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  AUTH_COOKIE_PATH: z.string().default('/'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_MAX_ACTIVE_SESSIONS_PER_USER: z.string().default('0'),
  AUTH_SESSION_TOUCH_INTERVAL_SECONDS: z.string().default('300'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.string().default('20m'),
  EMAIL_VERIFICATION_URL_BASE: z.string().url(),
  MESSAGE_EDIT_WINDOW_MINUTES: z.string().default('30'),
  BACKEND_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  UPLOAD_LOCAL_ROOT: z.string().default('uploads'),
  UPLOAD_ENABLE_SCAN: z.enum(['true', 'false']).default('false'),

  INVITE_URL_BASE: z.string().url().default('http://localhost:8080'),
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('resend'),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});
