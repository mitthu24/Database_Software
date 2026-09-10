# Multi-Tenant Database SaaS — Documentation

Documentation-first MVP for a multi-tenant database administration SaaS.

Current MVP:
- Founder/Super Admin panel
- Company panel
- Company/workspace creation
- PostgreSQL-backed table and column structure management
- Firebase Authentication
- Brevo transactional email
- Vercel frontend
- Railway backend + PostgreSQL
- Cloudflare DNS/TLS/WAF/proxy

Out of scope: data entry, spreadsheet UI, collaboration, data modelling, CSV/XLSX import/export, BI connectors, public APIs, AI, billing, advanced analytics, workflows, mobile app.

The repository is the source of truth. Future Claude/Claude Code sessions must read AGENTS.md, docs/PROJECT-STATUS.md and docs/HANDOFF.md before changing anything.

## Layout

- `apps/web` — Next.js/TypeScript/Tailwind frontend (Vercel).
- `apps/api` — NestJS backend, modular monolith (Railway). Drizzle schema in `apps/api/src/db/schema/`.
- `docs/` — product, technical, architecture, database, decision (ADR) and UX documentation.

## Getting started (Phase 1 scaffold — no features implemented yet)

```bash
cd apps/web && npm install && cp .env.example .env
cd ../api && npm install && cp .env.example .env
```

Fill in `.env` with real Firebase/Railway/Brevo values (never commit `.env`). Then:

```bash
cd apps/api && npm run start:dev   # http://localhost:3001/api/v1/health
cd apps/web && npm run dev         # http://localhost:3000
```
