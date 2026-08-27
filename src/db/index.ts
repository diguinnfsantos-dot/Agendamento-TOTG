import * as dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

export const isDbConfigured = (): boolean => {
  return Boolean(
    process.env.SQL_HOST &&
    (process.env.SQL_ADMIN_USER || process.env.SQL_USER) &&
    (process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD) &&
    process.env.SQL_DB_NAME
  );
};

export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST;
    const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
    const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
    const database = process.env.SQL_DB_NAME;
    const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;

    global._postgresPool = new Pool({
      host: host || 'localhost',
      port,
      user: user || 'postgres',
      password: password || '',
      database: database || 'postgres',
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

