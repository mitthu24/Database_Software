# Authorization

MVP roles:
- SUPER_ADMIN (platform-level, stored in `platform_admins` — never in `company_memberships`)
- COMPANY_ADMIN
- COMPANY_USER (only if needed)

Super Admin manages companies.
Company users operate only inside their authorized company.

Deny by default. Resolve tenant context from verified identity and database membership, not from arbitrary request payloads.

## Two independent guards (ADR-006)

`PlatformAdminGuard` checks `platform_admins` only. `CompanyRolesGuard` checks `company_memberships` only. A route needing Super Admin access uses the former; a route scoped to one company uses the latter with `@RequireCompanyRole(...)`. Neither guard reads the other's table, so a bug in one cannot grant unintended access via the other.
