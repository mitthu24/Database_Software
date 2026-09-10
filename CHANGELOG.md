# Changelog

## 0.2.0 — Phase 0 + Phase 1
- Validated multi-tenancy direction (ADR-003): shared control plane + schema-per-company confirmed, no changes.
- Added `apps/web` Next.js/TypeScript/Tailwind app shell.
- Added `apps/api` NestJS app shell with `/health` endpoint.
- Added Drizzle control-plane schema (companies, users, company_memberships, workspaces, audit_events).
- Added identifier validation/quoting utility for future dynamic DDL.

## 0.1.0 — Documentation baseline
- Defined MVP scope.
- Defined technology stack.
- Defined architecture and tenancy strategy to validate.
- Defined authentication, authorization, database and UX requirements.
