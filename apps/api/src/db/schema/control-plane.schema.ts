import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// Control-plane tables live in the default `public` schema.
// See docs/database/CONTROL-SCHEMA.md and DATABASE-ARCHITECTURE.md.
// Tenant-owned dynamic tables live in per-company schemas and are NOT
// modeled here — they are managed at runtime by SchemaManagementService
// (Phase 5), not by Drizzle migrations.

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('active'), // active | suspended
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('companies_slug_unique').on(table.slug),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firebaseUid: text('firebase_uid').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    firebaseUidUnique: uniqueIndex('users_firebase_uid_unique').on(table.firebaseUid),
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const platformAdmins = pgTable(
  'platform_admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Separate from company_memberships by design — see ADR-006. This is
    // the ONLY table Super Admin authorization may be derived from.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('platform_admins_user_id_unique').on(table.userId),
  }),
);

export const companyMemberships = pgTable(
  'company_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // COMPANY_ADMIN | COMPANY_USER only. SUPER_ADMIN is never stored here —
    // see platform_admins above and ADR-006-SUPER-ADMIN-MODEL.md.
    role: text('role').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUserUnique: uniqueIndex('company_memberships_company_user_unique').on(
      table.companyId,
      table.userId,
    ),
    companyIdx: index('company_memberships_company_idx').on(table.companyId),
    userIdx: index('company_memberships_user_idx').on(table.userId),
  }),
);

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    // Normalized, validated Postgres schema name for this company's tenant schema.
    schemaName: text('schema_name').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUnique: uniqueIndex('workspaces_company_unique').on(table.companyId),
    schemaNameUnique: uniqueIndex('workspaces_schema_name_unique').on(table.schemaName),
  }),
);

// Postgres catalogs (information_schema) are authoritative for actual
// table/column structure — this table stores ONLY the one thing catalogs
// can't express: display order for columns (Postgres has no
// `ALTER TABLE ... MOVE COLUMN`). See docs/database/TENANT-SCHEMA.md.
export const tenantColumnDisplay = pgTable(
  'tenant_column_display',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    tableName: text('table_name').notNull(),
    columnName: text('column_name').notNull(),
    displayOrder: integer('display_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    columnUnique: uniqueIndex('tenant_column_display_column_unique').on(
      table.workspaceId,
      table.tableName,
      table.columnName,
    ),
    tableIdx: index('tenant_column_display_table_idx').on(table.workspaceId, table.tableName),
  }),
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('audit_events_company_idx').on(table.companyId),
    actorIdx: index('audit_events_actor_idx').on(table.actorUserId),
  }),
);
