import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { workspaces } from '../db/schema/control-plane.schema';
import { AuditService } from '../audit/audit.service';
import { assertSafeIdentifier, quoteIdentifier } from '../common/sql-identifier.util';

export type WorkspaceRow = typeof workspaces.$inferSelect;

/**
 * Implements the "create workspace/schema if required" step of
 * docs/flows/COMPANY-FLOW.md. The tenant schema name is ALWAYS derived
 * server-side from the company's own (already-validated) id — never
 * accepted from a client — and is re-validated with `assertSafeIdentifier`
 * before being used in `CREATE SCHEMA`, per ADR-003.
 */
@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly auditService: AuditService,
  ) {}

  private schemaNameForCompany(companyId: string): string {
    // Deterministic and collision-safe: companyId is already a unique UUID,
    // so a fixed 1:1 mapping needs no collision-retry logic.
    const schemaName = `tenant_${companyId.replace(/-/g, '')}`;
    assertSafeIdentifier(schemaName);
    return schemaName;
  }

  async getForCompany(companyId: string): Promise<WorkspaceRow | undefined> {
    const rows = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.companyId, companyId))
      .limit(1);
    return rows[0];
  }

  /**
   * Idempotent: returns the existing workspace if one exists, otherwise
   * creates the Postgres schema and the control-plane row for it inside a
   * single transaction (so a failed schema creation never leaves an
   * orphaned `workspaces` row, and vice versa).
   */
  async getOrCreateForCompany(actorUserId: string, companyId: string): Promise<WorkspaceRow> {
    const existing = await this.getForCompany(companyId);
    if (existing) {
      return existing;
    }

    const schemaName = this.schemaNameForCompany(companyId);

    const created = await this.db.transaction(async (tx) => {
      await tx.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`));
      const [row] = await tx
        .insert(workspaces)
        .values({ companyId, schemaName })
        .returning();
      return row;
    });

    await this.auditService.record({
      actorUserId,
      companyId,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: created.id,
      metadata: { schemaName },
    });

    return created;
  }
}
