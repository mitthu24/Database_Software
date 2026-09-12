# System Architecture

Browser → Vercel Next.js → Railway NestJS API → Railway PostgreSQL.

Firebase Authentication provides identity.
Brevo provides transactional email.
Cloudflare provides DNS/TLS/WAF/proxy/CDN.

The backend is the trust boundary. The frontend never determines authorization.

Use a modular monolith, not microservices. Keep clear module boundaries so future data management, import/export, collaboration, modelling, BI and AI can be added later without implementing them now.
