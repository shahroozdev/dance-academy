# 1. Architecture & Tech Stack

## 1.1 Why move off Stackby

The requirements doc's core pain points are all symptoms of a no-code tool being pushed past its
limits at ~50 students: fragile "Link to Another Row" fields erroring on update, automations that
silently "went missing," and no reliable way to guarantee every active student gets exactly one
billing row per month. A small, well-tested Next.js + PostgreSQL app removes all three problems
at this scale (50 students is trivial load for Postgres) and gives us real automated tests for the
billing math, which a spreadsheet-style tool cannot provide.

## 1.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16+ (App Router, TypeScript)** | Single deployable for public form + admin app + API routes + cron handlers |
| Database | **PostgreSQL** | Relational integrity for Family→Student→Enrollment→Billing→Payment chains; easy monthly aggregation queries |
| ORM | **Prisma** | Type-safe schema, migrations, and query builder; schema doubles as living documentation |
| Auth | **Auth.js (NextAuth v5)**, credentials provider | Single admin (studio owner) + optional second staff login; no need for social login |
| UI | **Tailwind CSS + shadcn/ui** | Fast to build accessible admin tables/forms; no design system to invent |
| Forms/validation | **react-hook-form + zod** | Shared zod schemas validate both the public registration form and admin forms, client and server side |
| Notifications | **WhatsApp Cloud API (Meta, official)** | See [05-notifications-whatsapp.md](./05-notifications-whatsapp.md) for full cost breakdown |
| Scheduled jobs | **Vercel Cron** (or any host's cron) hitting internal `/api/cron/*` routes with a shared secret | Monthly bill generation, payment reminders |
| Hosting | **Vercel** (app) + **Neon or Supabase** (Postgres) | Both have free tiers that comfortably cover 50 students' worth of data and traffic |
| Testing | **Vitest** (unit — billing/discount math) + **Playwright** (e2e — registration→bill→payment flow) | Matches the doc's required sample test cases (§16) |

## 1.3 Monorepo layout

```
/prisma
  schema.prisma
  migrations/
  seed.ts
/src
  /app
    /(public)/register/...
    /admin/...            # protected route group
    /api/...
  /lib
    billing/              # discount + billing calculation engine (pure functions, unit tested)
    whatsapp/             # Cloud API client + template builders
    auth/
    db.ts                 # Prisma client singleton
  /components
  /emails                 # fallback email templates (react-email), optional
/tests
  unit/
  e2e/
docs/
```

## 1.4 Environments & config

- `.env`: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`,
  `SETTINGS_ENCRYPTION_KEY` (encrypts `StudioSettings.smtpPassword`/`whatsappAccessToken` at rest —
  see `src/lib/crypto.ts`; losing/rotating it makes stored secrets undecryptable).
- Discount percentages, due date/reminder timing, SMTP (outbound email), and WhatsApp Cloud API
  credentials live in the `StudioSettings` table, not env vars — the studio owner manages them at
  `/admin/settings`, so a policy or credential change takes effect immediately without a redeploy.
- Scheduled jobs are configured in `vercel.json` (`crons`) and secured by `CRON_SECRET` — see
  `src/lib/cron-auth.ts` and `src/app/api/cron/*`.

## 1.5 Cost model (for the required "disclose recurring costs" deliverable)

| Item | Cost at ~50 students | Notes |
|---|---|---|
| Vercel Hobby | $0/mo | Sufficient for this traffic; upgrade to Pro ($20/mo) only if cron frequency or bandwidth needs grow |
| Neon/Supabase Postgres free tier | $0/mo | Free tier storage (0.5–1GB) is orders of magnitude more than 50 students of relational data |
| Auth.js | $0 | Self-hosted, no third-party auth billing |
| WhatsApp Cloud API (Meta, direct) | ~$0–5/mo | See [05-notifications-whatsapp.md](./05-notifications-whatsapp.md) |
| Domain (optional) | ~$10–15/yr | Only if a custom domain is wanted over the free `*.vercel.app` subdomain |

**Total recurring cost at current scale: effectively $0–5/month.** Any future paid add-on must be
proposed with the same table format before being adopted, matching requirement §13.
