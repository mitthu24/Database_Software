import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { platformAdmins } from '../db/schema/control-plane.schema';

@Injectable()
export class PlatformAdminsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * The ONLY function allowed to answer "is this user a Super Admin?".
   * Reads exclusively from platform_admins — see ADR-006-SUPER-ADMIN-MODEL.md.
   */
  async isPlatformAdmin(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ status: platformAdmins.status })
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, userId))
      .limit(1);

    return rows[0]?.status === 'active';
  }
}
