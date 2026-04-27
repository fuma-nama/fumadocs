import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/lib/env';

import * as schema from './schema';

const globalForDb = globalThis as typeof globalThis & {
  dashboardSql?: postgres.Sql;
};

export const sql =
  globalForDb.dashboardSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dashboardSql = sql;
}

export const db = drizzle(sql, { schema });
