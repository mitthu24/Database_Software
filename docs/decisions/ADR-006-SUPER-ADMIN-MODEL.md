# ADR-006 — Super Admin Model

## Problem

`docs/database/CONTROL-SCHEMA.md` only defined `company_memberships` (company_id, user_id, role, status) for roles. But the original security requirement (see AGENTS.md and docs/architecture/AUTHORIZATION.md) states: **"Super Admin authorization must be separate from company authorization."** A Super Admin is not scoped to any single company — they manage *all* companies — so storing `SUPER_ADMIN` as a row in `company_memberships` (which requires a non-null `company_id`) would either force an arbitrary/fake company association or weaken the "separate" guarantee (a bug in company-membership logic could then also affect platform-admin checks).

## Decision

Add a dedicated `platform_admins` table (`user_id` unique, `status`), completely separate from `company_memberships`. Super Admin checks (`PlatformAdminGuard`) query only this table. Company-scoped checks (`CompanyRolesGuard`) query only `company_memberships` (`COMPANY_ADMIN` / `COMPANY_USER`). Neither guard consults the other's table, so the two authorization paths cannot cross-contaminate.

`company_memberships.role` is narrowed to `COMPANY_ADMIN | COMPANY_USER` going forward; `SUPER_ADMIN` is never written there.

## Consequences

- The very first Super Admin must be seeded directly in the database (one-off script or manual insert) — there is no UI that can create the first platform admin, by design (see docs/HANDOFF.md).
- `docs/database/CONTROL-SCHEMA.md` updated to include `platform_admins`.
- `docs/architecture/AUTHORIZATION.md` updated to describe the two independent guards.
