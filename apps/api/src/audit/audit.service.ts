import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { auditEvents } from '../db/schema/control-plane.schema';

export interface RecordAuditEventInput {
  actorUserId: string;
  companyId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Per AGENTS.md rule 8: "Schema-changing actions must be audited." This
 * service is the single write path into `audit_events`. Phase 5's
 * SchemaManagementService (table/column DDL) and Phase 4's company/admin
 * management must both call this rather than inserting directly.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    await this.db.insert(auditEvents).values({
      actorUserId: input.actorUserId,
      companyId: input.companyId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
    });
  }

  /**
   * Basic audit view for the Super Admin panel (docs/product/PRD.md —
   * "basic audit activity"). Not paginated beyond a hard limit; a real
   * paging UI is a future-roadmap concern, not MVP.
   */
  async listRecent(params: { companyId?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const query = this.db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);

    if (params.companyId) {
      return query.where(eq(auditEvents.companyId, params.companyId));
    }
    return query;
  }
}
