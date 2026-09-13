# Changelog

## 0.6.1 — First deployment
- Deployed `apps/web` to Vercel (`smart-bi-studio/database-software-web`, GitHub-connected): https://database-software-web.vercel.app
- Deployed `apps/api` to a new, isolated Railway project `database-software-api` (Postgres plugin included, all three control-plane migrations applied): https://api-production-641b9.up.railway.app
- Fixed a crash found while deploying: `AuthProvider` (web) and `FirebaseAuthGuard`'s constructor injection (API) both initialized the Firebase SDK eagerly, which throws with no `FIREBASE_*`/`NEXT_PUBLIC_FIREBASE_*` env vars set — the exact state of both fresh deployments, since no live Firebase project exists yet. Added `isFirebaseConfigured()`/lazy `getFirebaseAuth()` on web and `FirebaseAdminService.getApp()` (replacing eager DI) on the API; both apps now boot and serve correctly without Firebase configured, with `/login` showing a clear notice instead of a generic crash page.
- Pushed the full Phase 0–5 codebase to the existing `mitthu24/Database_Software` GitHub repo (fast-forwarded on top of its prior partial-push history, no force-push).

## 0.6.0 — Phase 5
- Added `apps/api/src/workspaces`: `WorkspacesService.getOrCreateForCompany` — lazily provisions a company's tenant Postgres schema (`CREATE SCHEMA IF NOT EXISTS`) and its `workspaces` row in one transaction, per `docs/flows/COMPANY-FLOW.md`. Schema name is deterministic (`tenant_<companyId without dashes>`), never client-supplied, and re-validated with `assertSafeIdentifier`.
- Added `apps/api/src/schema-management`: `SchemaManagementService` — the sole path for dynamic tenant DDL (create/rename/delete table; add/rename/delete column; change column type; toggle NOT NULL/UNIQUE; reorder columns). Every identifier is normalized + `assertSafeIdentifier`/`quoteIdentifier`'d before use; column types are looked up through an allow-list (`column-types.ts`), never taken as a raw string; destructive operations require `confirm: true`; every mutating call is transactional and audited (success and failure).
- Added `tenant_column_display` control-plane table (migration `0002_jittery_young_avengers.sql`) — the only new persisted metadata; table/column structure itself is always read live from `information_schema` (`docs/database/TENANT-SCHEMA.md`).
- Added `SchemaManagementController` routes under `/companies/:companyId/workspace/...`, the first real consumer of `CompanyRolesGuard`/`@RequireCompanyRole('COMPANY_ADMIN', 'COMPANY_USER')`.
- Added `apps/web/src/app/company/[companyId]/**`: company workspace UI (table list/create/delete, per-table column list/add/rename/delete/reorder/type-change), gated on an active membership from `/auth/me`, mirroring the `/admin` layout pattern. Home page now lists the signed-in user's workspaces and only shows the Admin panel link to actual Super Admins (previously shown unconditionally).
- Added Jest test infra for `apps/api` (`ts-jest`, `@types/jest`) — none existed before Phase 5 — with unit tests for `sql-identifier.util`, the column-type allow-list, and workspace schema-name generation.

## 0.5.0 — Phase 4
- **Architecture correction (ADR-006)**: Super Admin moved to a new, separate `platform_admins` table — never `company_memberships` — per the "Super Admin authorization must be separate from company authorization" security rule. Added migration `0001_nice_jackpot.sql`.
- Added `apps/api/src/companies`: create/list/get/rename/activate/suspend, Super-Admin-only, audited.
- Added `apps/api/src/company-admins`: invite-only company admin flow (Firebase user creation, app-user provisioning, `COMPANY_ADMIN` membership, Brevo email with a password-setup link).
- Added `apps/api/src/brevo`: minimal transactional email client.
- Added `apps/api/src/audit/audit.controller.ts`: `GET /audit` basic Super Admin audit view.
- `GET /auth/me` now also returns `isPlatformAdmin`.
- Fixed a NestJS DI gotcha (guards used via `@UseGuards()` need their constructor deps visible in the *consuming* module) by making `AuthModule` `@Global()` and re-exporting `UsersModule`/`MembershipsModule`/`PlatformAdminsModule`.
- Fixed a Next.js build-breaking bug: Firebase client SDK was initializing eagerly at module load, crashing static prerendering (`auth/invalid-api-key`) without real env vars. Made it lazy/browser-only via `getFirebaseAuth()`.
- Bumped `next` 14.2.5 → 14.2.35 (security advisory).
- Added `apps/web/src/app/admin/**`: Super Admin panel UI (dashboard, companies list/create/detail, company-admin invite, audit view).
- Verified: `npx tsc --noEmit`, `npx nest build`, and a real bootstrap (with a self-signed test key) all pass for the API; `npx tsc --noEmit` and `npm run build` both pass for the web app (all 8 routes prerender).

## 0.4.0 — Phase 3
- Added `apps/api/src/db`: Drizzle + `pg` connection (`DbModule`) shared by control-plane and future tenant-schema queries.
- Generated the initial control-plane migration (`db/migrations/0000_slim_alex_power.sql`) via `drizzle-kit generate`.
- Added `UsersService` (JIT user provisioning by `firebaseUid`), `MembershipsService` + `hasCompanyRole()`, `AuditService`.
- Added `ResolveAppIdentityGuard` (Firebase identity → app user + memberships) and `CompanyRolesGuard`/`@RequireCompanyRole(...)` for future company-scoped routes.
- `GET /api/v1/auth/me` now returns the fully resolved identity instead of raw Firebase claims.

## 0.3.0 — Phase 2
- Added `apps/api/src/auth`: Firebase Admin provider, `FirebaseAuthGuard`, `CurrentFirebaseUser` decorator, `GET /api/v1/auth/me` test endpoint.
- Added `apps/web/src/lib/firebase`: Firebase client SDK singleton, `AuthProvider`/`useAuth`.
- Added `apps/web/src/app/login`: email/password sign-in page (no self-signup — invite-only per Super Admin flow).
- Added `apps/web/src/lib/api-client.ts`: attaches Firebase ID token as Bearer header on API calls.
- Home page now shows signed-in state and calls `/auth/me` as a smoke test.

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
