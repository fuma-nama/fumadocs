import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

loadEnvConfig('');

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
