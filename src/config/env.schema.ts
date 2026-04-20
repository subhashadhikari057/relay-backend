import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
});
