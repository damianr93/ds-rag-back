import pg from 'pg';
import { envs } from '../../config';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      host: envs.PG_HOST,
      port: envs.PG_PORT,
      user: envs.PG_USER,
      password: envs.PG_PASSWORD,
      database: envs.PG_DB,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

