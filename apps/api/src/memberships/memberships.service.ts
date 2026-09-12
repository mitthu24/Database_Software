import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { companyMemberships } from '../db/schema/control-plane.schema';

// Kept in sync manually with docs/architecture/AUTHORIZATION.md — there is
// no enum type at the DB level (role is `text`) so both places must agree.
export type CompanyRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER';

export interface CompanyMembership {
  companyId: string;
  role: CompanyRole;
  status: string;
}

@Injectable()
export class MembershipsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async getMembershipsForUser(userId: string): Promise<CompanyMembership[]> {
    const rows = await this.db
      .select({
        companyId: companyMemberships.companyId,
        role: companyMemberships.role,
        status: companyMemberships.status,
      })
      .from(companyMemberships)
      .where(eq(companyMemberships.userId, userId));

    return rows.map((row) => ({ ...row, role: row.role as CompanyRole }));
  }
}

/**
 * Pure helper (no DB access) so it's trivially unit-testable: given the
 * memberships already resolved for the caller, decide whether they hold one
 * of `allowedRoles` in `companyId`. Deny-by-default — returns false unless
 * an active, matching membership is found.
 */
export function hasCompanyRole(
  memberships: CompanyMembership[],
  companyId: string,
  allowedRoles: CompanyRole[],
): boolean {
  return memberships.some(
    (m) => m.companyId === companyId && m.status === 'active' && allowedRoles.includes(m.role),
  );
}
