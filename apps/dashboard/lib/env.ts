import { z } from 'zod';

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().default('development-secret-change-me'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  DATABASE_URL: z
    .string()
    .default('postgres://postgres:postgres@localhost:5432/fumadocs_dashboard'),
  DASHBOARD_S3_BUCKET: z.string().default('fumadocs-dashboard-dev'),
  DASHBOARD_S3_ENDPOINT: z.string().optional(),
  DASHBOARD_S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DASHBOARD_S3_PUBLIC_BASE_URL: z.string().url().optional(),
  HOCUSPOCUS_PORT: z.coerce.number().int().positive().default(1234),
  NEXT_PUBLIC_HOCUSPOCUS_URL: z.string().url().default('ws://localhost:1234'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
