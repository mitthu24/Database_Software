import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { users } from '../db/schema/control-plane.schema';

export type AppUserRow = typeof users.$inferSelect;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async findByFirebaseUid(firebaseUid: string): Promise<AppUserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Used only by the TEMPORARY email/password auth path — see docs/HANDOFF.md. */
  async findByEmail(email: string): Promise<AppUserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  /**
   * JIT-provisions a `users` row the first time a verified Firebase identity
   * is seen. This only establishes that the identity is KNOWN — it grants
   * no company access. A brand-new user has zero rows in
   * `company_memberships` and every company-scoped check must therefore
   * deny them by default (see docs/architecture/AUTHORIZATION.md).
   */
  async findOrCreateByFirebaseUid(firebaseUid: string, email: string): Promise<AppUserRow> {
    const existing = await this.findByFirebaseUid(firebaseUid);
    if (existing) return existing;

    const [created] = await this.db
      .insert(users)
      .values({ firebaseUid, email })
      .onConflictDoNothing({ target: users.firebaseUid })
      .returning();

    // Extremely rare race: two concurrent first-logins for the same uid.
    // If our insert lost the race, re-read the row that won.
    if (created) return created;
    const raceWinner = await this.findByFirebaseUid(firebaseUid);
    if (!raceWinner) {
      throw new Error(`Failed to provision or find user for firebaseUid=${firebaseUid}`);
    }
    return raceWinner;
  }
}
