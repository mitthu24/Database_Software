# Control Schema

### platform_admins
id, user_id (unique, FK users), status, created_at, updated_at

Separate from `company_memberships` by design — see ADR-006-SUPER-ADMIN-MODEL.md. This is the ONLY table `PlatformAdminGuard` reads. Super Admin authorization must never be derived from `company_memberships`.

### companies
id, name, slug, status, created_at, updated_at

### users
id, firebase_uid, email, display_name, status, created_at, updated_at

### company_memberships
id, company_id, user_id, role (`COMPANY_ADMIN` | `COMPANY_USER` — never `SUPER_ADMIN`), status, created_at, updated_at

### workspaces
id, company_id, schema/database identifier, status, created_at, updated_at

### tenant_column_display
id, workspace_id (FK workspaces), table_name, column_name, display_order, created_at, updated_at

Postgres catalogs (`information_schema`) remain authoritative for actual table/column structure — this table stores only what catalogs can't express: a display order for columns, since Postgres has no `ALTER TABLE ... MOVE COLUMN`. Written and read only by `SchemaManagementService`.

### audit_events
id, actor_user_id, company_id nullable, action, resource_type, resource_id nullable, metadata JSONB, created_at

Use stable application IDs and proper foreign keys/indexes. Final physical schema must be reviewed before implementation.
