# AGENTS.md — Permanent Instructions

1. Read this file, PROJECT-STATUS.md, HANDOFF.md and relevant docs before coding.
2. Implement only the approved MVP; do not add future features silently.
3. Stack: Next.js + React + TypeScript + Tailwind + shadcn/ui; NestJS + TypeScript; PostgreSQL on Railway; Drizzle; Firebase Authentication; Brevo; Vercel; Cloudflare.
4. Firebase handles identity. Never store passwords in PostgreSQL. Backend verifies Firebase ID tokens.
5. Authorization is server-side and deny-by-default. Never trust a companyId supplied by the browser.
6. Dynamic SQL identifiers must be validated and safely quoted. Values must use parameterized SQL.
7. Super Admin and company routes must be isolated.
8. Schema-changing actions must be audited.
9. Control-plane changes require migrations. Dynamic tenant DDL is handled by a dedicated service.
10. Never commit secrets.
11. After meaningful changes update relevant docs, CHANGELOG.md and PROJECT-STATUS.md; update HANDOFF.md when architecture/state changes.
12. Add regression tests for every security issue discovered.
