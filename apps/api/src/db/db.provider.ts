import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/control-plane.schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';

export type Database = NodePgDatabase<typeof schema>;

/**
 * A single shared connection pool for the control plane (public schema).
 * Tenant-schema queries (Phase 5+) reuse this same pool but set
 * `search_path` per request/transaction — they do NOT get their own pool
 * per company. See ADR-003-MULTI-TENANCY.md for the reasoning.
 */
export const drizzleProvider: Provider = {
  provide: DRIZZLE_DB,
  useFactory: (): Database => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL. Set it in apps/api/.env');
    }

    const pool = new Pool({ connectionString });
    return drizzle(pool, { schema });
  },
};
