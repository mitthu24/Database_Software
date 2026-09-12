import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*.schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Set DATABASE_URL in apps/api/.env — never commit real credentials.
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config;
