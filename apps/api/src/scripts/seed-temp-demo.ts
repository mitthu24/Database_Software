/**
 * TEMPORARY (see docs/HANDOFF.md "temporary email/password auth") — seeds
 * two demo accounts for testing the deployed site without a live Firebase
 * project. Idempotent: safe to run more than once (upserts by email).
 *
 * Usage: node dist/scripts/seed-temp-demo.js
 * (requires DATABASE_URL in the environment — run inside the deployed
 * container, e.g. `railway ssh --service api -- node dist/scripts/seed-temp-demo.js`,
 * since DATABASE_URL there points at Railway's internal Postgres hostname)
 *
 * Delete this file when the temporary auth path is removed.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema/control-plane.schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function upsertUserWithPassword(
  db: Db,
  email: string,
  password: string,
  displayName: string,
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(schema.users)
      .set({ passwordHash, displayName, updatedAt: new Date() })
      .where(eq(schema.users.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(schema.users)
    .values({ firebaseUid: `temp:${randomUUID()}`, email, displayName, passwordHash })
    .returning();
  return created;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const admin = await upsertUserWithPassword(
    db,
    'demo-admin@example.com',
    'DemoAdmin123!',
    'Demo Super Admin',
  );
  const existingPlatformAdmin = await db
    .select()
    .from(schema.platformAdmins)
    .where(eq(schema.platformAdmins.userId, admin.id))
    .limit(1);
  if (!existingPlatformAdmin[0]) {
    await db.insert(schema.platformAdmins).values({ userId: admin.id });
  }

  const companyAdmin = await upsertUserWithPassword(
    db,
    'demo-company@example.com',
    'DemoCompany123!',
    'Demo Company Admin',
  );
  let [company] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.slug, 'demo-company'))
    .limit(1);
  if (!company) {
    [company] = await db
      .insert(schema.companies)
      .values({ name: 'Demo Company', slug: 'demo-company' })
      .returning();
  }
  const existingMembership = await db
    .select()
    .from(schema.companyMemberships)
    .where(
      and(
        eq(schema.companyMemberships.companyId, company.id),
        eq(schema.companyMemberships.userId, companyAdmin.id),
      ),
    )
    .limit(1);
  if (!existingMembership[0]) {
    await db
      .insert(schema.companyMemberships)
      .values({ companyId: company.id, userId: companyAdmin.id, role: 'COMPANY_ADMIN', status: 'active' });
  }

  // eslint-disable-next-line no-console
  console.log('Seeded demo accounts:');
  // eslint-disable-next-line no-console
  console.log('  Super Admin:   demo-admin@example.com / DemoAdmin123!');
  // eslint-disable-next-line no-console
  console.log(`  Company Admin: demo-company@example.com / DemoCompany123! (company: ${company.name}, id: ${company.id})`);

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
