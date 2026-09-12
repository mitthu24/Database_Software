import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { companies } from '../db/schema/control-plane.schema';
import { AuditService } from '../audit/audit.service';

export type CompanyRow = typeof companies.$inferSelect;
export type CompanyStatus = 'active' | 'suspended';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly auditService: AuditService,
  ) {}

  async create(actorUserId: string, name: string): Promise<CompanyRow> {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new ConflictException('Company name must be at least 2 characters');
    }

    const baseSlug = slugify(trimmedName);
    if (!baseSlug) {
      throw new ConflictException('Company name must contain at least one letter or number');
    }

    // Append a short suffix on collision rather than failing outright —
    // company names are not required to be globally unique, only slugs are.
    let slug = baseSlug;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await this.db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.slug, slug))
        .limit(1);
      if (existing.length === 0) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const [created] = await this.db
      .insert(companies)
      .values({ name: trimmedName, slug })
      .returning();

    await this.auditService.record({
      actorUserId,
      companyId: created.id,
      action: 'company.created',
      resourceType: 'company',
      resourceId: created.id,
      metadata: { name: created.name, slug: created.slug },
    });

    return created;
  }

  async list(): Promise<CompanyRow[]> {
    return this.db.select().from(companies).orderBy(companies.createdAt);
  }

  async getOrThrow(companyId: string): Promise<CompanyRow> {
    const rows = await this.db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    const company = rows[0];
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async rename(actorUserId: string, companyId: string, name: string): Promise<CompanyRow> {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new ConflictException('Company name must be at least 2 characters');
    }

    await this.getOrThrow(companyId); // 404s before we attempt the update

    const [updated] = await this.db
      .update(companies)
      .set({ name: trimmedName, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    await this.auditService.record({
      actorUserId,
      companyId,
      action: 'company.renamed',
      resourceType: 'company',
      resourceId: companyId,
      metadata: { name: trimmedName },
    });

    return updated;
  }

  async setStatus(
    actorUserId: string,
    companyId: string,
    status: CompanyStatus,
  ): Promise<CompanyRow> {
    await this.getOrThrow(companyId);

    const [updated] = await this.db
      .update(companies)
      .set({ status, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    await this.auditService.record({
      actorUserId,
      companyId,
      action: status === 'active' ? 'company.activated' : 'company.suspended',
      resourceType: 'company',
      resourceId: companyId,
    });

    return updated;
  }
}
