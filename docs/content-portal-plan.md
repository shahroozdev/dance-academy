# Content Portal Plan

## Goal

Create a separate, restricted portal for managing public website content. Studio operations remain at `/admin`; public-content work lives only at `/content`.

## Access and session policy

- `/admin/login` and `/content/login` remain separate login pages.
- Admin and content sessions use different secure, HTTP-only cookie names.
- A browser may hold only one portal session at a time. Signing into one portal requires an explicit switch that signs out the other portal first.
- `/admin/*` accepts an active admin session only. `/content/*` accepts an active content session only. A valid session for the other portal always redirects to that portal's login page, never grants access.
- Public pages remain visible to everyone. When one portal session exists, the public header avatar links only to that portal's dashboard and offers its logout action.
- Every content action independently checks the content session and role; hiding a control is never the access check.

## Route and session design

- The existing Admin Auth.js instance remains responsible only for `/admin` and uses an Admin-only session cookie.
- A second Content Auth.js instance will have its own credentials provider, route handler, callback configuration, and Content-only session cookie. The two cookies are never interchangeable.
- Proxy checks provide early route redirects, while `requireAdmin` and `requireContent` access functions independently verify the appropriate session and current active account before protected data is read or changed.
- Before either login is accepted, the server checks for an active session in the other portal. The login screen explains the conflict and requires an explicit “switch portal” confirmation; the current session is then cleared before the new one is issued.
- The public header reads only safe identity details from the single active portal session: display name, portal label, dashboard link, and sign-out action. It never receives password, role-management, student, family, payment, or billing data.
- Content sign-out clears only the Content cookie; Admin sign-out clears only the Admin cookie. The explicit portal-switch operation clears the other portal’s cookie first.

## Phase 1 integration map

The existing Admin authentication is already isolated behind an Admin credentials check, an Admin Auth.js instance, a protected Admin route group, and server-side access functions. Phase 1 adds parallel Content equivalents instead of widening any Admin role or permission:

| Existing concern | Content portal addition |
| --- | --- |
| Admin credential verification | Content credential verification against active Content User records only. |
| Admin Auth.js handler | A separate Content Auth.js handler and a separately named session cookie. |
| `/admin/login` | `/content/login`, with a server-rendered active-session conflict message and explicit switch confirmation. |
| `/admin/*` proxy protection | `/content/*` proxy protection, checking the Content session only. |
| `getActiveAdmin` / `requireAdmin` | `getActiveContentUser` / `requireContentUser` / `requireContentOwner`, each rechecking active status from the database. |
| Admin dashboard layout and sign-out | Minimal Content Overview layout and Content-only sign-out. |
| Public website header | A safe, server-provided active-portal summary for the avatar menu. |

The portal switch cannot rely only on a client-side sign-out. The target login server action/route must verify the opposite cookie, require a submitted switch intent, clear that cookie, and only then allow the target credentials to create a session. Direct requests to protected routes remain rejected unless their matching server-side access function succeeds.

## Roles

| Role | Scope |
| --- | --- |
| Content Owner | Manages content users, settings, drafts, publishing, and archive state. |
| Content Editor | Creates and edits drafts and uploads assets, but cannot publish or manage users. |

## Portal modules

1. Overview: unpublished drafts, scheduled/published items, and quick actions.
2. Festivals: editions, dates, venue, artists, ticket URL, posters, videos, sponsors, and publish/archive controls.
3. Performances: event detail, cover, gallery, links, and publication state.
4. Press & Media: articles, external links, PDFs, and feature images.
5. Media Library: stored file URL, alt text, focal point, type, and usage information.
6. Public Profiles: founder/instructor display information and explicit visibility control.
7. Website Settings: public social links, contact information, default SEO settings, and homepage content.

## Data and publishing design

- Content has `DRAFT`, `PUBLISHED`, and `ARCHIVED` states; draft content is never reachable from public pages or search engines.
- Publishing records who published and when. A later revision returns the item to draft until republished.
- Festival dates, venue details, artists, ticket URLs, and media become data rather than static source-code arrays.
- Every publish/unpublish action revalidates the relevant public page, homepage, sitemap, metadata, and event structured data.
- Images and video use managed object storage; database rows store safe public URLs, alt text, placement/crop data, and attribution.

## Delivery phases

### Phase 1 — portal isolation and authentication

- Add content-user records and roles.
- Add the independently scoped content session, `/content/login`, route protection, explicit portal-switch flow, and public-header avatar state.
- Add a minimal Content Overview page and content logout.

### Phase 2 — festivals

- Add Festival, FestivalArtist, and FestivalMedia records.
- Build owner/editor workflows, draft preview, publishing, archive behavior, ticket links, and public-page migration away from static festival data.

### Phase 3 — performances and media

- Add Performance, PerformanceMedia, and MediaAsset records.
- Build gallery and performance publishing workflows; move public performance content from static configuration to the portal.

### Phase 4 — press, profiles, and site settings

- Add public press items, public profile fields, and website configuration.
- Complete public-page migration, dynamic SEO/sitemap data, audit history, and content acceptance tests.

## Build status (2026-10-13)

All four phases are built in code, both migrations are applied to the hosted database, and the website's existing content has been seeded into it. What each phase delivered, and what remains, is tracked in `docs/current-tasks.md`.

Decisions made while building, where the plan left room:

- **One media model.** Festival, performance, press, and profile images all point at Media Library records rather than each storing its own file details, so alt text, focal point, and attribution are entered once.
- **Storage.** Media Library images (up to 10 MB) and videos (up to 100 MB) are uploaded straight from the browser to Cloudinary, which compresses them for delivery; PDFs (up to 4 MB) go to the Vercel Blob store the admin side uses. A video can also still be added as a link (YouTube, Vimeo, or a hosted file).
- **Site images and video.** The home page's opening video and still, the founders' photo, and each training program's picture are chosen from the Media Library in Website Settings; each falls back to the file shipped with the site.
- **Who published.** Publishing stores the publisher's id and name on the item itself, and every change is written to a content history.
- **Editors and live content.** Because a revision returns an item to draft, an editor saving a live item would unpublish it. Editors may therefore revise drafts only; live and archived items are the owner's.
- **Profiles.** A profile has a visibility switch instead of draft/publish states. Turning it on, or changing a visible profile, is owner-only.
- **Fallback.** Public pages show the site's existing fixed content until the portal holds content of that kind, and whenever the portal's tables cannot be read. `npm run content:seed -- --confirm-host=<database host>` copies that fixed content into the portal, already published, and its files into the Blob store; it was run against the hosted database on 2026-10-13.
- **Sponsors.** A sponsor is a festival media item with the "Sponsor logo" role, a name, and an optional link.

## Database safety

`DATABASE_URL` on the development machine currently points at the hosted (live) database, so no Prisma migrate or push command may be run there. The reviewed, additive Content User migration and the additive content-records migration (`prisma/migrations/20261013000000_add_content_portal_records/migration.sql`) are staged in the repository but have not been run against any database. No schema migration, reset, seed, or database sync may be executed until the owner approves the exact SQL against the intended database. The portal models do not alter student, family, billing, payment, or admin tables.

### Proposed initial migration for approval

This is the complete SQL proposed for the initial Content User schema. It only creates new database objects and does not update, delete, or alter any existing record or table:

```sql
CREATE TYPE "ContentRole" AS ENUM ('OWNER', 'EDITOR');

CREATE TABLE "ContentUser" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "ContentRole" NOT NULL DEFAULT 'EDITOR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentUser_email_key" ON "ContentUser"("email");
CREATE INDEX "ContentUser_isActive_idx" ON "ContentUser"("isActive");
```

Approval authorizes adding this migration to the repository and applying it only to the database the owner identifies. It does not authorize a database reset, seed, sync, or any other schema statement.

### Second migration for approval

The content-records migration is in `prisma/migrations/20261013000000_add_content_portal_records/migration.sql`. It creates four enum types and ten tables (`MediaAsset`, `Festival`, `FestivalArtist`, `FestivalMedia`, `Performance`, `PerformanceMedia`, `PressItem`, `PublicProfile`, `WebsiteSettings`, `ContentAuditLog`) with their indexes, and adds foreign keys between those new tables only. It contains no `DROP`, and no statement touches an existing table. It does not depend on the Content User migration, but the portal needs both.

## First-account provisioning

The initial Content Owner cannot be created through a public sign-up page. It is created from a terminal by someone who already holds the database connection: `npm run content:create-owner -- --confirm-host=<database host>`, with the name, email, and password supplied through the `CONTENT_OWNER_NAME`, `CONTENT_OWNER_EMAIL`, and `CONTENT_OWNER_PASSWORD` environment variables for that one run. The command prints which database host it is about to write to and stops unless `--confirm-host` matches, and it refuses to run once an active Content Owner exists. Further users are then added inside the portal. No initial password or private account detail is stored in this plan.
