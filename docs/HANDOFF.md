# Handoff

Current state: Phase 0–5 scaffolded (multi-tenancy validated, repo foundation,
Firebase token verification, control-plane DB + identity/role resolution,
Super Admin panel, company workspace + dynamic table/column DDL) AND
deployed:
- **Web** (`apps/web`) on Vercel: https://database-software-web.vercel.app
  (project `smart-bi-studio/database-software-web`, GitHub-connected).
- **API** (`apps/api`) on Railway, in its own new project
  `database-software-api` (not sharing infra with any other Railway
  project): https://api-production-641b9.up.railway.app — `/health`
  returns 200. Includes a live Postgres plugin with all three
  control-plane migrations applied.
- **No live Firebase project yet** — this is the one missing piece. Both
  deployments boot and respond correctly without it (see "lazy Firebase
  init" below), but sign-in is unavailable until real
  `FIREBASE_*`/`NEXT_PUBLIC_FIREBASE_*` credentials are set on both.

Read first: AGENTS.md, docs/PROJECT-STATUS.md, docs/decisions/ADR-003-MULTI-TENANCY.md,
docs/decisions/ADR-006-SUPER-ADMIN-MODEL.md, docs/architecture/AUTHORIZATION.md,
docs/database/DYNAMIC-TABLES.md, docs/database/TENANT-SCHEMA.md.

Repo layout additions this phase:
- `apps/api/src/workspaces` — `WorkspacesService`: lazily provisions a company's
  tenant Postgres schema + its `workspaces` row (transactional, audited).
- `apps/api/src/schema-management` — `SchemaManagementService` +
  `SchemaManagementController`: the only code path allowed to issue dynamic
  tenant DDL (create/rename/delete table; add/rename/delete/retype column;
  toggle NOT NULL/UNIQUE; reorder columns). `column-types.ts` is the
  column-type allow-list.
- `apps/api/src/db/schema/control-plane.schema.ts` — added `tenantColumnDisplay`.
- `apps/api/src/db/migrations/0002_jittery_young_avengers.sql` — adds
  `tenant_column_display`.
- `apps/api/src/**/*.spec.ts` + `ts-jest`/`@types/jest` — first unit tests in
  the repo (identifier validation, column-type allow-list, schema naming).
- `apps/web/src/app/company/[companyId]/**` — company workspace UI (table
  list/create/delete, column list/add/rename/delete/reorder/type-change).
- `apps/web/src/app/page.tsx` — now lists the signed-in user's workspaces and
  gates the Admin panel link on `isPlatformAdmin`.

Key design points to know before touching this code:
- The tenant schema name is ALWAYS derived server-side
  (`tenant_<companyId-without-dashes>`), never accepted from the client.
  `WorkspacesService.getOrCreateForCompany` is idempotent — call it to resolve
  a company's schema, don't read `workspaces` directly in new code.
- `SchemaManagementService` never string-interpolates raw user input into
  DDL: table/column names go through `assertSafeIdentifier`/`quoteIdentifier`
  in `apps/api/src/common/sql-identifier.util.ts`, and column "type" is
  always a lookup key into `SUPPORTED_COLUMN_TYPES`
  (`apps/api/src/schema-management/column-types.ts`), never a raw string.
- Every table gets implicit `id`/`created_at`/`updated_at` columns
  (`SYSTEM_COLUMNS` in `schema-management.service.ts`) that can't be
  renamed/retyped/dropped through this service.
- Postgres catalogs (`information_schema`) are the source of truth for
  table/column structure on every read — `tenant_column_display` stores only
  what catalogs can't express (column display order), per
  docs/database/TENANT-SCHEMA.md. Don't add more control-plane duplication of
  physical structure without a similarly strong reason.
- `CompanyRolesGuard`/`@RequireCompanyRole('COMPANY_ADMIN', 'COMPANY_USER')`
  now has its first real consumer (`SchemaManagementController`) — the
  pattern to copy for any other company-scoped route.
- **Lazy Firebase initialization, on both sides, is load-bearing —
  don't revert it.** `apps/web/src/lib/firebase/client.ts`
  (`isFirebaseConfigured()`/`getFirebaseAuth()`) and
  `apps/api/src/auth/firebase-admin.provider.ts` (`FirebaseAdminService
  .getApp()`) both defer real Firebase SDK initialization to first actual
  use instead of app-bootstrap/module-load time. Before this fix, both
  apps crashed entirely (web: Next.js's generic "Application error" on
  every page; API: the whole Nest process before `app.listen()`) the
  moment they ran without `FIREBASE_*` env vars — which is exactly the
  state both deployments are in right now. Any new code that talks to
  Firebase must go through these lazy accessors, never call
  `initializeApp`/`admin.initializeApp` directly, and never inject the
  Firebase Admin app via NestJS constructor injection (that's what made
  Nest resolve it eagerly last time).

Next steps for whoever picks this up:
1. `npm install` in `apps/web` and `apps/api` (both verified to install and
   build cleanly; `apps/api` also has `npm test` passing).
2. Create a real Firebase project (Email/Password sign-in enabled). Set
   `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` on
   the Railway `api` service (`railway variable set ... --service api`)
   and `NEXT_PUBLIC_FIREBASE_*` on the Vercel `database-software-web`
   project (`vercel env add ... production`), then redeploy both.
3. **Seed the first Super Admin manually** — insert one row into
   `platform_admins` for a `users` row matching a real Firebase account,
   against the live Railway Postgres (`railway connect Postgres` or
   `railway ssh --service api`). There is no UI or API endpoint that can
   create the first one (by design — see ADR-006).
4. Configure `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` on the Railway `api`
   service so company-admin invite emails actually send.
5. On Vercel, set **Settings → General → Root Directory** to `apps/web`
   for the `database-software-web` project — the CLI can't set this
   remotely, and without it the GitHub-triggered auto-deploy (already
   connected) will fail looking for `package.json` at the repo root. Every
   deploy so far has been a direct `vercel --prod` CLI deploy from
   `apps/web`, which bypasses this.
6. Sign in as the seeded Super Admin at `/login`, use `/admin/companies` to
   create a company and invite its first admin, then sign in as that admin
   and open `/company/:companyId` to exercise table/column DDL against the
   real, already-migrated Railway Postgres for the first time.
7. Phase 6 (next, per docs/implementation/IMPLEMENTATION-PLAN.md): security,
   tenant-isolation, integration and E2E tests
   (docs/implementation/TESTING-PLAN.md) — cross-tenant requests, forged
   company IDs, unauthorized role changes, identifier-injection attempts,
   and destructive-action confirmation, all against the real database.

The repository must remain understandable without chat history.
