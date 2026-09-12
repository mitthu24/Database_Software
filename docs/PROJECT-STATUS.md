# Project Status

STATUS: PHASE 5 — COMPANY WORKSPACE + DYNAMIC TABLE/COLUMN DDL SCAFFOLDED. Table **data** viewing/editing is out of MVP scope (see docs/ROADMAP.md "Later").

Approved MVP: Super Admin/company management plus company database/table/column structure management.

Phase 0 (multi-tenancy validation): DONE.
Phase 1 (repo foundation): DONE.
Phase 2 (Firebase token verification): DONE.
Phase 3 (control-plane database + roles): DONE.
Phase 4 (Super Admin panel): DONE (see below).

Phase 5 (company workspace + dynamic table/column DDL): scaffold added —

Backend (`apps/api`):
- `apps/api/src/workspaces`: `WorkspacesService.getOrCreateForCompany` lazily creates a company's tenant Postgres schema (`CREATE SCHEMA IF NOT EXISTS`, deterministic name `tenant_<companyId>`, never client-supplied) + its `workspaces` row in one transaction, audited as `workspace.created`.
- `apps/api/src/schema-management`: `SchemaManagementService` — create/rename/delete table, add/rename/delete column, change column type (allow-listed via `column-types.ts`), toggle NOT NULL/UNIQUE, reorder columns. Every identifier goes through `assertSafeIdentifier`/`quoteIdentifier`; schema+table always fully-qualified in one DDL statement; destructive ops require `confirm: true`; every mutating call is transactional and audited (success and failure).
- New control-plane table `tenant_column_display` (migration `0002_jittery_young_avengers.sql`) stores only column display order — Postgres has no `ALTER TABLE ... MOVE COLUMN`. Everything else (tables, columns, types, nullability, uniqueness) is read live from `information_schema`, never duplicated.
- `SchemaManagementController` routes under `/companies/:companyId/workspace/...` — the first real use of `CompanyRolesGuard`/`@RequireCompanyRole('COMPANY_ADMIN', 'COMPANY_USER')`. `:companyId` is only ever used to look up the caller's resolved membership, never trusted directly.
- Added Jest test infra (`ts-jest`) — none existed before this phase — with unit tests for `sql-identifier.util`, the column-type allow-list, and workspace schema-name generation. All pass.
- `npx tsc --noEmit` and `npx nest build` pass clean.

Frontend (`apps/web`):
- `/company/[companyId]` — workspace dashboard (list/create/delete tables) and `/company/[companyId]/tables/[tableName]` (column list/add/rename/delete/reorder/type-change), gated on an active company membership from `/auth/me`.
- Home page now lists the signed-in user's workspaces and only shows the Admin panel link to actual Super Admins.
- `npx tsc --noEmit` and `npm run build` pass clean.

Still not run against a real Postgres/Firebase project — this remains source-only, same evidence bar as Phase 4. Full DDL execution against a live database, cross-tenant isolation tests, and E2E flows are Phase 6.

Next: Phase 6 — security, tenant-isolation, integration and E2E tests (docs/implementation/TESTING-PLAN.md).

---

## Phase 4 (Super Admin panel): scaffold added —

Architecture correction (ADR-006, see docs/decisions/ADR-006-SUPER-ADMIN-MODEL.md): Super Admin is now modeled in a new, separate `platform_admins` table — NOT in `company_memberships` — per the security rule "Super Admin authorization must be separate from company authorization." `company_memberships.role` is narrowed to `COMPANY_ADMIN | COMPANY_USER`. Migration `0001_nice_jackpot.sql` adds this table.

Backend (`apps/api`):
- `PlatformAdminsService` + `PlatformAdminGuard` — the only code path allowed to answer "is this user a Super Admin?".
- `CompaniesModule` — `POST/GET/PATCH /companies`, `POST /companies/:id/activate|suspend`. Super-Admin-only, audited.
- `CompanyAdminsModule` — invite-only company admin flow: creates the Firebase user if needed (`firebase-admin`), provisions the app user, grants `COMPANY_ADMIN` membership, emails a password-setup link via Brevo. `GET/POST /companies/:companyId/admins`.
- `AuditModule` — `GET /audit` basic Super Admin audit view (`AuditService.listRecent`).
- `GET /auth/me` now also returns `isPlatformAdmin`.
- Verified end to end with a real (self-signed) service-account key: app boots, all routes map, `GET /health` returns 200, `GET /companies` without a token returns 401. `npx tsc --noEmit` and `npx nest build` both pass clean.
- Known NestJS gotcha documented in code comments: a guard class used via `@UseGuards(...)` needs its OWN constructor dependencies visible in the *consuming* module (not just exported from the guard's home module) — `AuthModule` is `@Global()` and re-exports `UsersModule`/`MembershipsModule`/`PlatformAdminsModule` specifically to make this work everywhere without every feature module re-importing them individually.

Frontend (`apps/web`):
- `/admin` layout — redirects to `/login` if signed out, shows "Not authorized" if `isPlatformAdmin` is false, otherwise renders the nav.
- `/admin/companies` — list + create.
- `/admin/companies/[companyId]` — rename, activate/suspend, list/invite company admins.
- `/admin/audit` — basic audit list.
- Fixed a real build-breaking bug: the Firebase client SDK was being initialized eagerly at module load, which crashed `next build`'s static prerendering with `auth/invalid-api-key` whenever real Firebase env vars aren't set. Fixed by making Firebase Auth initialize lazily, browser-only (`getFirebaseAuth()` in `apps/web/src/lib/firebase/client.ts`) — never call it at module top level.
- Bumped `next` to `14.2.35` (from `14.2.5`) to clear a known security advisory flagged by `npm install`.
- `npx tsc --noEmit` and `npm run build` both pass clean (all 8 routes prerender/compile successfully).

Still not run against a real Postgres/Firebase project as of Phase 4 — this was source only at the time. There is no self-signup; the first Super Admin must be seeded directly into `platform_admins` (see HANDOFF.md).

Never claim a feature is implemented without code, tests and deployment evidence.
