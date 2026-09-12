# ADR-003 — Multi-Tenancy

## Decision (validated, Phase 0)

Shared control-plane tables (public schema) + one isolated PostgreSQL schema per company for tenant-owned dynamic tables. Separate database per company is deferred.

## Validation notes

- **Security/isolation**: schema-per-company gives real catalog-level isolation (a bug can't leak columns from `information_schema` across tenants the way a shared-table `company_id` filter could if a `WHERE` clause were ever forgotten). Tenant schema is resolved server-side from the verified company membership — never from client input — and is set via `SET search_path` per request/transaction, never string-interpolated into the schema clause of a query.
- **Dynamic DDL**: isolated behind `SchemaManagementService`. All identifiers (schema, table, column names) go through a single allow-listed normalizer (lowercase, `[a-z0-9_]`, max length, reserved-word check) and are quoted with `pg-format`'s `%I` (or equivalent) before use in DDL — never concatenated raw. All values in DML remain parameterized.
- **Connections**: one Railway Postgres instance, one connection pool (via `pg`/Drizzle), `search_path` set per request from the resolved tenant — no per-tenant connection/pool needed at MVP scale (50–100 companies). Revisit pool sizing if concurrent tenant DDL volume grows.
- **Migrations**: control-plane schema uses normal Drizzle migrations. Tenant schemas have no shared "migration" in the traditional sense — their structure changes only through audited `SchemaManagementService` calls, so there is nothing to drift.
- **Backups**: a single `pg_dump`/Railway backup of the whole database covers control plane + all tenant schemas together; no per-schema backup tooling needed at this scale.
- **Observability/ops**: `audit_events` table records every schema-changing action (actor, company, action, resource) — sufficient for MVP-level traceability without extra infra.
- **Scaling to 1000+ companies**: PostgreSQL comfortably supports thousands of schemas in one database; the main future cost is `pg_dump` duration and catalog bloat, which would be the trigger to revisit (e.g. sharding across multiple Postgres instances) — not a concern for the 50–100 company MVP.

No serious problem was found with the documented direction, so it is adopted as-is rather than revised.
