# TRD — Technical Requirements

Frontend: Next.js, React, TypeScript, Tailwind, shadcn/ui on Vercel.

Backend: NestJS modular monolith on Railway.

Database: PostgreSQL on Railway.

ORM: Drizzle plus controlled raw PostgreSQL SQL for dynamic DDL.

Auth: Firebase Authentication. Frontend obtains ID token; backend verifies it with Firebase Admin SDK. Application roles/memberships are stored in PostgreSQL.

Email: Brevo for transactional company/admin notifications. Avoid duplicate or conflicting Firebase/Brevo email responsibilities.

Cloudflare: DNS, TLS, WAF, proxy/CDN. R2 is not required for this MVP.

API: versioned REST-style API such as /api/v1.

Requirements: secure tenant isolation, structured errors, safe logging, environment-based secrets, auditable schema operations and testable authorization.
