import pg from 'pg';
import { envs } from '../../config';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    // Railway provee DATABASE_URL, local usa variables individuales
    if (envs.DATABASE_URL) {
      pool = new pg.Pool({
        connectionString: envs.DATABASE_URL,
      });
    } else {
      // Fallback para desarrollo local
      pool = new pg.Pool({
        host: envs.PG_HOST || 'localhost',
        port: envs.PG_PORT || 5432,
        user: envs.PG_USER || 'postgres',
        password: envs.PG_PASSWORD || 'postgres',
        database: envs.PG_DB || 'ia-rag',
      });
    }
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

