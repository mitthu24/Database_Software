# Multi-Tenancy

Evaluate:
A. Shared tables + company_id
B. PostgreSQL schema per company
C. Separate database per company

Compare security, operational complexity, migrations, backups, dynamic DDL, connections, observability, cost, 50–100 companies and future 1000+ companies.

Validated (Phase 0) direction: shared control-plane tables plus PostgreSQL schema-per-company for tenant-owned dynamic tables. Separate databases per company are deferred. See ADR-003 for the full validation notes (security, dynamic DDL, connections, migrations, backups, scaling to 1000+ companies).

Never authorize using only a client-supplied company ID.
