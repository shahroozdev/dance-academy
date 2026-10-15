# Current Tasks

Shared source of truth for what's in progress, what's next, and what's done — see
[AGENTS.md](../AGENTS.md) §"Task Tracking" for the rules governing this file.

## In Progress

- **2026-10-14: Browser tests for the public site and the Content Portal.** Run both with
  `npm run test:e2e:site` (plain `npm run test:e2e` also runs the older admin acceptance flow, which writes
  billing data — do not run that against the live database).
  - `e2e/public-site.spec.ts` — 44 tests, read-only: every page (title, one h1, no failed image/video
    requests, no sideways scroll at 390px), menu and footer, festival redirect and 404s, gallery, biography
    window, contact-form validation, sitemap/robots/canonical/structured data, noindex on sign-in pages, and
    that signed-out visitors are kept out. The form's success screen is reached through the hidden anti-spam
    field, which saves nothing and sends no email.
  - `e2e/content-portal.spec.ts` — 34 tests, one serial flow as owner then editor: every section opens;
    festival draft -> preview -> publish -> revise (back to draft) -> archive, checking the public page and
    sitemap at each step; performance and press publish/archive; media link add/rename/delete; profile
    visibility; settings screen; inquiry bell/read/replied/archived (inquiry inserted by
    `e2e/fixtures/content-db-cli.ts` so no staff email is sent); adding an editor; history; editor
    restrictions; deactivating the editor ends their session; sign-out. Needs `CONTENT_OWNER_EMAIL` and
    `CONTENT_OWNER_PASSWORD` (skips without them). Every record it makes carries a per-run `E2E-<id>` tag and
    the teardown deletes only rows with that tag; a read-only check after the final run found none left.
  - **Not covered by browser tests:** real file uploads to Cloudinary, saving Website Settings or site
    image choices (both would change the live site), a real contact-form submission (would email the studio),
   , and being signed in to admin and content at once (needs an admin login). The last-active-owner guard is covered
    by `src/actions/content-users.test.ts` instead, since a failure there in a browser test would lock the
    only owner out.
  - **Found and fixed by these tests:** a wrong password showed no message on either sign-in page
    (`portal-login.ts` now catches `CredentialsSignin`; the form reports other failures as "Unable to sign
    in"); the bell announced its count twice. Also seen: a dev server started before a new table was added
    keeps an old database client and fails on that table until restarted.
  428 unit tests, lint and TypeScript pass.

- **2026-10-14: Inquiries module in the Content Portal.** New table `Inquiry` (+ enum `InquiryStatus`),
  migration `20261014000000_add_website_inquiries`, **applied to the hosted database**. The public contact
  form (`src/actions/inquiries.ts`) now saves each inquiry first, then sends the existing staff email alert;
  it reports failure to the visitor only if the inquiry can be neither saved nor emailed. Rate limit: five per
  hour per sender, counted by a salted hash of `x-forwarded-for` (the address itself is not stored). Portal
  side: `src/actions/content-inquiries.ts`, the page `src/app/content/(dashboard)/inquiries/page.tsx` (list,
  filters, detail window, status changes) and `components/content/inquiry-bell.tsx` in the header (new count,
  polled every 60s). Owners and editors both have access, by the owner's decision. Nothing under `/admin` was
  changed; the email alert still shares the admin's "new registration" switch, also by decision. 420 tests,
  lint and TypeScript pass. **Not verified:** no inquiry has been submitted end to end (doing so on this
  machine would write to the live database and email the studio), and the page and bell have not been seen
  signed in.

- **2026-10-13 (late): the rest of the Facebook/Instagram scrape is in the bucket.** At the owner's request all
  298 remaining images in `client-assets/facebook` and `client-assets/instagram` were stored in Cloudinary
  under `malhaar/website/archive/client-assets/...` with `npm run content:archive-photos`
  (`scripts/archive-photos-to-cloudinary.ts`), each verified byte-for-byte afterwards. 85 of them (800px or
  larger) were also added to the Media Library; the 212 small previews and one certificate photo showing a
  child's full name are archived only. Nothing was placed on a page. The library entries have a generic
  title and description ("From Facebook: ...") that must be rewritten before a photo is used, and include
  posters showing ticket prices, selfies and backstage shots; four duplicate photos already on the
  Performances page under other entries. **`client-assets/` was then emptied at the owner's request** (336 files, 119 MB), keeping only
  `README.md` and `performance-gallery-photos.json`. The two raw videos went with it: their web versions are
  in the bucket and the originals are on the client's Drive and Facebook.

- **2026-10-13 (late): the site's photos and videos were removed from the repo folder.** Thirteen files in
  `public/` (nine in `images/client`, the two instructor portraits in `images/wix`, both videos in `media/`,
  96 MB together) were deleted after each was confirmed in the Cloudinary bucket byte-for-byte; `public/` went
  from 119 MB to 23 MB. None of them was ever committed to git, so the bucket copy
  (`malhaar/website/site/...`) is now the only one — do not delete those from Cloudinary. The built-in
  fallback content in `src/lib/public-site.ts` and `src/lib/site-media.ts` now points at the bucket through
  `siteImage()` / `siteVideo()`, and `content:seed` no longer uploads anything: it only creates entries for
  those addresses. **Kept on purpose:** `images/client/logo-no-bg.png` and `logo.jpg` (logo fallback and
  search-engine logo), everything in `images/site` (section backgrounds, share image parts), and the tracked
  favicons. **Not touched, and not in the bucket:** the other 15 old Wix photos in `public/images/wix` (unused
  by any page), `images/site/hero-dancer.webp` (unused), and the whole `client-assets/` folder (raw scrape,
  96 MB, 35 of its photos are in the bucket). Ask before removing those.

- **2026-10-13 (late): one logo everywhere.** Every logo placement now reads `StudioSettings.logoUrl` through
  `getSiteLogoUrl()` in `src/actions/public-content.ts` (public header and menu, `/register`, both login pages,
  the Content Portal sidebar), falling back to `/images/client/logo-no-bg.png`. The current transparent logo was
  uploaded as that setting with `npm run admin:set-logo` (`scripts/set-site-logo.ts`); the setting was empty
  before. The command was run twice by mistake, so the Blob store holds one unused extra copy named
  `studio-logo-EYqbAi39….png`. Not changed: the logo in the search-engine details (`/images/client/logo.jpg`
  in `src/lib/seo.ts`). Caveat: the public header sits over photos, so a future upload should have a
  transparent background.

- **2026-10-13 (night): Cloudinary is live and the Performances gallery has 41 photos.** The owner added the
  `CLOUDINARY_*` keys to `.env`. `content:move-media` moved all 11 Blob-held library files (Blob copies left
  in place, unused); `content:seed` filled the seven site image/video places (the 76 MB home video now plays
  from a ~25 MB compressed copy; large files are uploaded in 6 MB pieces because a single request timed out).
  Then 35 photos scraped from the client's Facebook page were added to the "Performance Highlights" gallery
  with `npm run content:add-gallery-photos` (`scripts/add-gallery-photos.ts`; the list with each photo's
  description is `client-assets/performance-gallery-photos.json`). Selection: of 333 scraped images, 212 are
  under 800px and unusable; of the 119 distinct larger ones, only on-stage/performance shots were taken —
  posters, logos, selfies, backstage and trophy snapshots, an award ceremony and a certificate showing a
  child's name were left out. Many of the photos show children; the client's instruction was "use from our fb
  page", but per-photo consent has not been confirmed with them. **Still to do:** set the `CLOUDINARY_*` keys
  in the hosting environment; a signed-in walk through the portal; `npm run build`. The entry below describes
  how the Cloudinary side works.

- **2026-10-13 (evening): Cloudinary for the Content Portal's images and videos — code done, waiting on
  account keys.** Decision by the owner: Cloudinary for content-portal media, Vercel Blob stays for the admin
  side (logo, receipts); PDFs in the Media Library also stay on Blob (small, and Cloudinary blocks PDF delivery
  by default on new accounts).
  - **How it works.** `src/lib/cloudinary.ts` (server only; plain HTTP API, no SDK) signs requests;
    `src/lib/cloudinary-url.ts` holds the pure address helpers. Upload is two steps from
    `components/content/media-modals.tsx`: `createContentUploadTicket` returns a signed, folder- and
    format-limited ticket, the browser posts the file straight to Cloudinary, then `registerContentUpload`
    verifies Cloudinary's own signature on the result before adding the library entry. Limits: images 10 MB,
    videos 100 MB. Addresses are stored without a version segment. Videos are played from a `q_auto` copy that
    is requested at upload (`eager`, async) because large videos cannot be transformed on demand; until it is
    ready the video does not play. Deleting a library file removes it from Cloudinary or Blob, whichever holds it.
  - **Site images and video.** New table `SiteMediaSlot` (migration `20261013120000_add_site_media_slots`,
    **applied to the hosted database**). Slots are defined in `src/lib/site-media.ts`: home opening video and
    still, founders photo, one per training program. Chosen in Website Settings (`site-media-card.tsx`,
    `content-site-media.ts`, owner-only); pages read them with `getPublicSiteMedia`, falling back to the file
    shipped with the site.
  - **Not done, needs the owner:** add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
    to `.env` (and to the hosting environment). Then run, in this order:
    `npm run content:move-media -- --confirm-host=db.prisma.io:5432` (copies the eleven Blob-held images and
    the festival video to Cloudinary and repoints their library entries; deletes nothing) and
    `npm run content:seed -- --confirm-host=db.prisma.io:5432` (now uploads to Cloudinary; adds the seven site
    image/video places, including the 76 MB home video). Until then uploads of images and videos in the portal
    fail with a "not set up yet" message, and the public site keeps working from Blob and the shipped files.
  - **Unverified:** nothing here has been exercised against a real Cloudinary account — the signing is covered
    by unit tests only. In particular, confirm after the first video upload that the `q_auto` address plays;
    if the account refuses it, `VIDEO_DELIVERY_TRANSFORMATION` in `cloudinary-url.ts` is the one place to change.
    401 tests, lint and TypeScript pass.

- **2026-10-13 (later the same day): database applied and seeded; portal layout now matches admin.**
  The owner ran both migrations against the hosted database (`db.prisma.io`), and
  `npm run content:seed -- --confirm-host=db.prisma.io:5432` (`scripts/seed-website-content.ts`) then added:
  the saved website settings, the 2026 festival (published, two artists, two posters, the reel), the two
  founder profiles (visible), and six Performances-page photos as Media Library files. All eleven files were
  uploaded to the Vercel Blob store under `website/site/...` with fixed names. The seed only adds and is safe
  to re-run. The public pages now show this content from the database and Blob (verified by requesting the
  home, festival and Instructors pages from the running site). The static content in `src/lib/public-site.ts`
  is now only the fallback for when the tables cannot be read.
  The in-portal "Bring in current content" button and its action were removed; the seed script replaces them.
  `/content` now uses the admin shell: `components/layout/app-sidebar.tsx`, `app-topbar.tsx` and `user-nav.tsx`
  take optional props (admin passes none), and `components/content/content-shell.tsx` supplies the portal's
  sections and sign-out. The old `content-portal-header.tsx` / `content-portal-nav.tsx` are deleted.
  **Still open:** (1) a first Content Owner — check whether one exists before running
  `npm run content:create-owner`; (2) nobody has yet looked at the portal screens signed in, including the new
  sidebar layout; (3) done later that day: the seed now also creates one published performance, "Performance
  Highlights" (`/performances/performance-highlights`, no cover), whose gallery is the six photos. The
  Performances page's grid is every published performance's gallery photos; a performance with a cover also
  gets a card. The home page's four photos use the same source. The title and the use of the page's second
  intro sentence as its summary were my choice — the client has not seen them; (4) the home page's intro video and the photos on About/Training/home are still
  files shipped with the site, since no portal section manages those pages; (5) the hosted database has a
  recorded migration `20261009090000_monthly_class_tracking` that is missing from this repo's
  `prisma/migrations`; (6) `npm run build` not run. The entry below is the earlier state, kept for its map of
  where things are.

- **2026-10-13: Content Portal — Phases 2–4 code complete; waiting on the owner before it can be used.**
  Everything in `docs/content-portal-plan.md` is built, but **no database has been changed**, so nobody can sign
  in yet and the portal screens have not been exercised in a browser.
  - **Database.** Two additive migration files are staged and unapplied:
    `prisma/migrations/20261009000000_add_content_portal_users` (the `ContentUser` table) and
    `prisma/migrations/20261013000000_add_content_portal_records` (every content table: `MediaAsset`,
    `Festival`, `FestivalArtist`, `FestivalMedia`, `Performance`, `PerformanceMedia`, `PressItem`,
    `PublicProfile`, `WebsiteSettings`, `ContentAuditLog`, plus four enums). The second was generated offline
    with `prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script`; it only creates
    new objects, and its only `ALTER TABLE` statements add foreign keys between the new tables.
    **Do not run `prisma migrate deploy`** to apply them — see the corrected database note under "Next /
    Blocked": on this machine it would target the live database and also try to apply every older migration
    the target is missing. Apply the two SQL files directly to the database the owner names, then record them
    with `prisma migrate resolve --applied <name>` if that database tracks migrations.
  - **Where things are.** Actions: `src/actions/content-*.ts` (each starts with `requireContentUser` or
    `requireContentOwner`; shared helpers in `content-service.ts`; validation in `content.schema.ts`). Publishing
    rules: `src/lib/content-publishing.ts`. Record-to-page mapping: `src/lib/content-mappers.ts`. Screens:
    `src/app/content/(dashboard)/` with shared pieces in `src/components/content/`. Public readers:
    `src/actions/public-content.ts` — published/visible records only, falling back to the fixed content in
    `src/lib/public-site.ts` (`BUILT_IN_FESTIVALS`, `BUILT_IN_PROFILES`, `DEFAULT_SITE_SETTINGS`) when a table
    is missing or has no rows. The festival and performance pages render through
    `components/public/festival-view.tsx` and `performance-view.tsx`, which the portal's Preview pages reuse.
  - **Behaviour worth knowing.** Editing a published festival, performance, or press item returns it to draft
    (the plan's rule), which takes it off the website until an owner publishes again. Editors may change drafts
    and hidden profiles only. Once the portal holds any festival (or any profile), the built-in one is no longer
    used, even if none is published — so use "Bring in current content" in Website Settings before adding
    editions, or the 2026 page will disappear until it is re-entered. Uploads go to the existing Vercel Blob
    store (4 MB cap; `next.config.ts` raises the server-action body limit to 5 MB and allows the store's image
    host). Videos are links, not uploads.
  - **Checked.** 389 tests, lint, and TypeScript pass. With the tables absent, every public page, the festival
    redirect, the 404s, the sitemap, and the `/content` login redirect were requested from the running local
    site and returned the same content as before. **Not checked:** any portal screen after sign-in, uploads,
    publishing end to end, the preview pages, and the portal-switch flow in a browser. A production build was
    not run.
  - **Next, in order:** (1) owner approves both SQL files and names the target database; (2) apply them;
    (3) create the first Content Owner with `npm run content:create-owner -- --confirm-host=<host>` (reads
    `CONTENT_OWNER_NAME`/`EMAIL`/`PASSWORD` from the environment and refuses if an active owner exists);
    (4) sign in at `/content/login`, run "Bring in current content", and walk through each section in a
    browser, including the admin/content switch confirmation; (5) run `npm run build`.

- **2026-10-09: Separate Content Portal — Phase 1 in progress.** A planned independent `/content` portal will manage
  public website content (festivals, performances, media, press, and profiles) without exposing studio operations.
  It will use a separate content login/session from `/admin`, and one browser may have only one portal session at a
  time. The plan is in `docs/content-portal-plan.md`. The separate Content login, session cookies, route guard,
  switch confirmation, protected overview, Content-only sign-out, safe public-header avatar, and additive migration
  file are staged. No database changes have been applied; the existing database safety restriction remains in force.
  Next: obtain approval for the exact migration and target database, apply it only as authorized, then provision the
  first Content Owner and complete browser-level login/switch tests.

- **2026-10-05: Public website (redesign brief in `docs/Malhaar_Website_Redesign.docx`) — all
  nine pages built, not committed.** The brief asks for separate pages, so the site is a home page
  plus eight inner pages under the `(public)` route group:
  - `src/app/(public)/page.tsx` — home: nine full-screen teaser sections, each linking to its page.
    It owns the full-screen shell (`section-dots.tsx`, `section-pager.tsx`). The
    pager runs on screens at least 1024px wide and 760px tall: it shrinks every section to 92%,
    slides one screen in 0.8s, then grows back; smaller screens scroll normally.
  - `src/app/(public)/(pages)/` — About, Training, Instructors, Performances, Ananta
    (`/ananta` redirects to the newest year; `/ananta/[year]` is one page per edition), Press & Media,
    Support, Contact. Shared layout there adds the header and `site-footer.tsx`.
  - `site-header.tsx` is the same on every public page: fixed and always transparent at computer
    sizes (1024px and wider), at the owner's request, so on inner pages content scrolls beneath the
    logo and menu button. Below 1024px it gains a soft backdrop once content scrolls beneath it (it
    watches the window, or the home page's own scroll container when given `scrollContainerId`).
    `page-hero.tsx` carries extra top padding so inner-page headings clear the floating header.
  - All text lives in `src/lib/public-site.ts` (taken from the brief). To add a festival year, add an
    entry to `ANANTA_EDITIONS`; to add a performance photo, add a line to `PERFORMANCE_PHOTOS`.
  - The Instructors page shows the two founders as fixed content from the brief (`INSTRUCTORS` in
    `public-site.ts`; the brief lists both, Varsha as "Co-Founder & Instructor", so the old site's
    "Guest Instructor" label is not used). Below them, "Our teaching team" lists every active row of
    the admin Teachers table via `getPublicInstructors()` in `src/actions/teachers.ts` — a public
    action that selects names only plus the programs of the teacher's active classes, and never
    throws (a failed query is logged and the list degrades). Rows whose name matches a founder are
    skipped. The page is `force-dynamic`. Type: `src/types/instructors.ts`; tests:
    `src/actions/teachers.test.ts`. **Open point:** the Teachers table has no "show on website"
    switch, bio, title or photo, so every active row is published by name (the local sample data
    includes a row called "Guest Choreographer"); adding those fields needs a database change.
  - The Performances page shows `PERFORMANCE_PHOTOS` in `components/public/slideshow.tsx`: a
    scroll-snap track (native swipe) driven by arrows, dots, arrow keys, and a 5-second autoplay
    that pauses on hover/focus and is off for reduced-motion visitors. All photos stay in the page
    as real images.
  - Shared pieces in `src/components/public/`: `page-hero`, `page-section`, `section-heading`,
    `cta-link`, `panel`, `inquiry-form`. Fonts in `src/app/(public)/fonts.ts`; pager styles at the
    end of `globals.css`.
  - **SEO (2026-10-06), following Google's Search documentation.** `src/lib/site-url.ts` holds the
    site address (`NEXT_PUBLIC_SITE_URL`, falling back to `NEXTAUTH_URL`). `src/lib/seo.ts` has
    `pageMetadata()` — every public page uses it for its title, description, self-referencing
    canonical, Open Graph and Twitter fields, and the share image — plus the structured-data
    builders: WebSite + organization (home), BreadcrumbList (every inner page), Person (Instructors),
    Course list (Training), DanceEvent (each festival year). `components/public/json-ld.tsx` renders
    them. `src/app/opengraph-image.tsx` draws the 1200x630 share image from
    `public/images/site/share-logo.png` and `share-photo.jpg`; it sits at the app root so its
    address is fixed (`/opengraph-image`). Each page's `<h1>` contains its topic label plus the
    headline (`PageHero`'s `eyebrowInHeading`). `/admin` and `/register` carry a `noindex` tag and
    are no longer blocked in `robots.ts`, because Google can only obey `noindex` on pages it may
    fetch; `robots.ts` blocks only `/api/`. `sitemap.ts` lists the nine canonical pages. The 404
    page links to the home and contact pages and is `noindex`. Tests: `src/lib/seo.test.ts`.
  - The old Wix site was scraped in full with a real browser (its Instructors page is a slideshow,
    so a plain fetch only sees one instructor). All of its text and a photo-by-photo map of where
    each image was and is now used are in `docs/old-wix-site-content.md`, along with what was
    deliberately not carried over because the brief overrides it.
  - Photos are the 17 old Wix originals in `public/images/wix/`; the two instructor portraits are
    named after the person the old site showed them with. Embedded camera/location data was stripped
    from `award-presentation.jpg` and `instructor-sreevidhya-vijayan.jpg`. The home hero figure is
    `public/images/site/hero-dancer.webp`, a background-removed cut-out of
    `wix/solo-bharatanatyam-blue-1.jpg` (made with `@imgly/background-removal-node` in a temp
    folder, not a project dependency). That photo ends at the hips, so the figure is anchored to the
    section's bottom edge.
  - The contact form calls `submitWebsiteInquiry` (`src/actions/inquiries.ts`), which emails the
    studio alert address through `sendAdminOperationalAlert` and stores nothing. Buttons such as
    "Become a Sponsor" open `/contact?interest=…` with "Interested In" preselected.
  - Checked: 281 tests, lint, and TypeScript pass. Every page was loaded in a browser at 1440x900
    and 390x844 (status, title, one h1, no sideways overflow, no broken images), plus menu and button
    navigation, the festival redirect and 404, the sitemap, and form preselection. A production build
    has not been rerun since the inner pages were added.
  **Content still needed from the client** (see `docs/Malhaar_Website_Design_Questions.pdf`):
  full-size approved training and performance photos; performance names, years, venues, and videos;
  press items; festival artist biographies and photos, orchestra details, sponsor logos, and a festival
  logo; and confirmation that the supplied mobile number is the intended WhatsApp number. The client later supplied
  the Sycamore Tickets destination, which is now linked from the festival's Book Tickets buttons.
  **Left to do:** (1) Inquiries are email-only — add a stored Inquiries list in admin and their own
  alert switch (they share the "new registration" alert setting, so turning that off makes the form
  report a delivery failure). (2) No rate limiting on the form beyond a hidden anti-spam field.
  (3) Nothing is admin-editable yet (brief section 14). (4) Confirm with the client that student
  photos may be used, and whether the old-site achievements the brief's biographies omit should be
  added back (listed at the end of `docs/old-wix-site-content.md`). (5) **SEO launch steps, none of
  which can be done in code:** set `NEXT_PUBLIC_SITE_URL` to the real domain (until then canonical
  links, the sitemap and structured data all say `localhost`); verify the site in Google Search
  Console (paste the code into `GOOGLE_SITE_VERIFICATION`) and submit `/sitemap.xml`; create or
  claim a Google Business Profile for the studio; point the old Wix site at the new one; test the
  home and festival pages in Google's Rich Results Test once live. (6) SEO data still needed: the
  festival venue's street address and postal code (both are in Google's event requirements; the
  event markup currently has town and state only), and the studio's social media links for the
  organization markup. (7) Rerun `npm run build`.
  **Client answers received 2026-10-08** (filled-in `docs/Malhaar_Website_Design_Questions.pdf`).
  Everything downloadable from their links is in `client-assets/` (index in its `README.md`): the
  Drive intro video, the founders' photo, two festival posters, the festival reel, and the few
  images the Facebook page and Instagram show without a login. Nothing from that folder is wired
  into the site yet. Their answers require changes not yet made: no old-site photos anywhere, no
  ticket information on the festival page, performances as a grid, instructors as cards that open
  the biography (founders only), one contact button on Support, a WhatsApp button, social links,
  a link to `/register`, and Semi Classical (adults only) as a fourth program. **Completed 2026-10-09:**
  the supplied images and videos are now used by the public pages; all old-site images have been removed
  from public-page use; Performances is a grid; founders use biography cards; Support has one contact action;
  registration, WhatsApp, Facebook, and Instagram are linked; and Semi Classical is listed for adults.
  The two raw videos are deliberately ignored by git while a deployment-ready video-hosting/compression choice
  is made. New assets may be added to `client-assets/` during the task; use only clearly approved,
  web-appropriate files. A further Facebook batch was reviewed on 2026-10-09: most images are 206px social
  previews and were intentionally not enlarged for the site; one usable group photograph was added to the gallery.
  Every public route returned 200 in local development. Desktop and 390px mobile visual checks passed for the
  updated home, festival, and instructor pages; poster artwork was cropped so ticket pricing is not displayed.
  TypeScript, lint, and 295 tests pass. The production build is blocked only because this environment cannot reach
  Google Fonts, which the existing site fonts require.
  **Completed 2026-10-09:** the home opening now uses the full-width video with animated overlay copy, a rose
  motif, and the existing brand colour wash. The video hero has no floral overlay; all other home-page sections use
  one of the client-supplied floral backgrounds, alternated with distinct placements.
  **Completed 2026-10-09:** the founders now use their individual portraits from the former website instead of the
  combined photograph, on both the home and Instructors pages.
  **Completed 2026-10-09:** the festival's Book Tickets buttons now take visitors to Sycamore Tickets.
  **Completed 2026-10-09:** the final home-page Contact section now includes linked Facebook, Instagram, and
  WhatsApp icons.
  **Completed 2026-10-09:** the website navigation now opens as a right-side panel, up to 400 pixels wide, instead
  of covering the entire screen.
  **Completed 2026-10-09:** the Malhaar logo now appears at the top of the navigation panel.
  **Completed 2026-10-09:** the header wordmark is black with a soft white shadow, improving its legibility over
  photos and floral backgrounds.

## Next / Blocked

- **2026-10-15: Public-page hero styles and full festival image fitting — code complete; pending production database approval.** The website now has eight curated hero presets (Blush, Gold, Violet, Orchid, Deep Plum, Crimson, Sunset, Rose), with a different default for About, Training, Instructors, Performances, Ananta Festival, Press & Media, Support, and Contact. Content Owners choose them in Website Settings. The Ananta hero heading is raised, and Festival posters/gallery photos now preserve the complete picture over a matching blurred backdrop rather than cropping it. TypeScript, focused public-content tests, and lint pass (the pre-existing temporary helper warnings remain); production build reached app compilation but could not download the existing Google Fonts in this offline environment. **Before deployment, apply only the reviewed additive SQL in `prisma/migrations/20261015090000_add_website_hero_themes/migration.sql` to the approved hosted database, then deploy the matching code.** Do not run blanket Prisma migration commands against the live database.

- **Live production verification was paused for the new-class August-fee question.** The finalized
  action-menu icons are deployed. Live checks confirmed Jazlyn Arackal has no August student bill;
  the remaining browser-only workflow checks can resume from enrollment controls onward. Temporary
  test code was removed and no test records were created.

- **Databases — DO NOT reset, re-seed, or run destructive schema changes on either one.** On
  2026-10-06 the owner said nothing in the database may be erased, and that the **live** database is
  the hosted one whose connection strings are `PRISMA_DATABASE_URL` and `POSTGRES_URL` in `.env`
  (Prisma Postgres, `*.prisma.io`). A read-only check that day found it up to date: every table the
  app needs is present, `Class.programId` exists, and it holds 2 active teachers (both founders),
  5 active programs and 8 active classes with a teacher.
  **Correction, 2026-10-13:** `.env`'s `DATABASE_URL` now points at the hosted `db.prisma.io` database, the
  same host as `PRISMA_DATABASE_URL` and `POSTGRES_URL`. So the app and every Prisma CLI command on this
  machine currently act on the **live** database; only `LOCAL_DATABASE_URL` still names the localhost copy.
  The rest of this paragraph describes the localhost copy as it was on 2026-10-06 and no longer describes
  what `DATABASE_URL` reaches.
  The app and the Prisma CLI on this machine use `DATABASE_URL`, which on 2026-10-06 (like `LOCAL_DATABASE_URL`)
  pointed at a **working copy** on `localhost:5432/malhaar_dance_company`. That copy is behind the
  schema. It is **not empty** (checked 2026-10-06: 8 students, 6 families, 6 classes, 12 enrollments,
  4 teachers, 2 admin users, 1 settings row), and it is missing the `DanceProgram`,
  `FamilyGuardian`, `ClassExtraSession` and `ClassBillingPause` tables and several newer columns. A
  read-only preview (`npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script`) shows a sync would drop `Class.danceStyle` and add required
  columns to tables that already hold rows, so it cannot be applied without losing or inventing
  data. Effects on this machine while it stays this way: `/register` returns an error, and the
  Instructors page lists teachers by name without their programs. The owner has not said the
  working copy is disposable, so any schema change to it, and certainly to the live database, needs
  their explicit approval of the exact statements first. An earlier version of this note called a
  destructive push "safe" — that was wrong.
- **WhatsApp activation and live verification pending.** Template sending is implemented, including
  the explicit family send action, optional scheduled monthly notices/reminders, provider reference
  logging, and failures. Next: verify Meta credentials and the two approved templates, configure
  `WHATSAPP_GRAPH_API_VERSION` and template language, and enable `WHATSAPP_AUTOMATION_ENABLED`
  when ready. See `docs/10-admin-flow-and-operations.md` for exact parameters and behavior. No live
  parent messages were sent during development checks. Delivery/read webhooks remain unimplemented.
- **No automated check for schema/migration drift.** The pre-push migration-diff check was removed
  at the owner's request (it needed a shadow database that was never configured, so it always
  silently skipped). If this safety net is wanted back, it needs a real shadow database wired into
  `prisma.config.ts`.

## Done

- **2026-10-15: Fully distinct hero colour families.** The formerly similar Orchid and Rose choices are now Teal and Sage Green. Every hero choice has a separate colour family: blush, violet, gold, crimson, deep plum, teal, sunset, or sage green. TypeScript, formatting, and changed-file lint checks pass.

- **2026-10-15: More distinguishable hero palette previews.** Hero choices now use more clearly separated hues and wider gradient-strip previews in Website Settings. The preview and the public-page background use the same colour settings. TypeScript, formatting, and changed-file lint checks pass.

- **2026-10-15: Hero colour swatches in Website Settings.** Each hero-style dropdown now shows a gradient colour strip next to every choice and the selected value. The same shared style data drives both the preview and the public-page background, so the preview is accurate. TypeScript, formatting, and changed-file lint checks pass.

- **2026-10-15: Unique default hero palettes.** The eight public inner pages now each start with a different hero treatment: blush, gold, violet, teal, deep plum, crimson, sunset, and sage green. These eight choices are also available to Content Owners in Website Settings; any colours they have already chosen remain unchanged. TypeScript, formatting, and changed-file lint checks pass.

- **2026-10-15: Stronger public-page hero colour distinction.** Each selectable hero style now has its own stronger gradient and matching decorative artwork: warm blush, violet, gold, crimson, or deep plum. The Ananta loading view shares its matching deep-plum artwork. TypeScript, formatting, and changed-file lint checks pass.

- **2026-10-15: Ananta Festival loading state.** The Ananta route now has a responsive, page-shaped loading view for both the newest-edition redirect and each published festival year. It keeps the hero, content, festival highlights, artists, support, and contact areas visibly structured while public festival information is being read. TypeScript and formatting checks pass.

- **2026-10-14: Admin and Content Portal can be used at the same time.** Owner's decision: each portal signs
  in on its own; one session only opens its own portal, and both together open both. Removed the
  one-session-at-a-time rule: the other-session check in both `authorize` callbacks (`src/auth.ts`,
  `src/content-auth.ts`), `switchPortal`/`switch-required` in `src/actions/portal-login.ts` and
  `src/types/portal-auth.ts`, the switch notice in `portal-login-form.tsx`, and the now-unused
  `getPortalSessionCookieName`. Then, at the owner's request, the public header's account
  avatar/menu was removed entirely, together with `src/actions/portal-session.ts`, the `PublicPortalIdentity` type and
  the two browser tests that covered it, so public pages no longer read either session. `AppSidebar` takes an
  optional `otherPortal` link, passed by the admin and content dashboard layouts only while the other session's JWT
  exists. Sessions were already isolated (separate cookie names and auth base paths), and `src/proxy.ts` is unchanged.
  Plan doc and the Content Portal guide updated, guide rebuilt. 444 unit tests, lint and TypeScript pass (TypeScript
  needed a fresh `prisma generate` and `next typegen`). Not yet checked in a browser with both logins.

- **2026-10-14: Content Portal user manual PDF.** Delivered a 23-page client-facing A4 guide for Content Owners and Content Editors, with real read-only Content Owner portal screenshots of lists, create forms, the file-upload dialog, and the new-user dialog; matching offline HTML; clickable contents and index; PDF bookmarks; publishing checklist; and troubleshooting. The screenshot pass only signed in and navigated or opened empty forms/dialogs; it did not save, publish, upload, update inquiries, or alter settings. The build verified all internal links and images and found no page/footer overlap. The PDF is at `docs/content-portal-manual/Malhaar-Content-Portal-User-Manual.pdf`; rebuild with `node docs/content-portal-manual/build-manual.mjs`.

- **2026-10-12: Final Varsha-request and regression verification.** Rechecked the complete monthly
  billing scope, passed all 293 automated tests, TypeScript, schema validation, lint, and the
  production build. The isolated browser journey passed registration, enrollment, repeated bill
  generation, discounts, adjustment, and notification preview before a slow Class Fees render
  exceeded the browser test wait. That run exposed and fixed an unrelated email-service hang;
  every uniquely prefixed temporary record from the interrupted runs was removed.

- **2026-10-11: Deep-audited Varsha's monthly billing requests and edge cases.** Fixed complete
  monthly history, zero-to-positive class-fee recalculation, rehearsal double-count guidance, and
  studio-wide generation transaction scaling/retries. All 292 automated tests plus new focused
  coverage, TypeScript, schema validation, lint, and the production build pass. The browser flow
  confirmed login, registration, approval, and enrollment; its whole-roster generation stress run
  exposed the scaling issue now repaired, and all uniquely prefixed test records were removed.

- **2026-10-09: Implemented Varsha's monthly billing and class-tracking improvements.** Student
  profiles now show due, paid, balance, and status by month; payment entry exposes its bill month
  and full/partial choice; inactive classes stop billing from their deactivation month; Class Fees
  defaults to active classes; zero-dollar and inactive-only bills can repair correctly; and Monthly
  Class Counts stores teacher reports as drafts until staff applies them to billing. The additive
  database migration was applied. All 288 tests, lint, TypeScript, schema validation, production
  build, and a read-only browser pass against configured data succeeded. Avisha's live financial
  records were inspected but not changed because her $200 payment spans multiple months and its
  exact allocation requires confirmation.


- **2026-10-09: Investigated Varsha's month-by-month billing concerns.** Confirmed that monthly
  bills exist separately but the student history does not clearly show due, paid, and balance by
  month; payment month is implicit in the selected bill; Class Monthly Fees lists historical and
  inactive classes; and class deactivation does not close active enrollments. Avisha Talele's live
  records show a stale $0 September bill, while her September Onam payment and the one-time Onam
  charge were both attached to October, producing an October credit. No live records were changed.


- **2026-09-20: Broader live regression of the last two days of changes.** The production A-to-Z
  registration, enrollment, billing, discount, adjustment, fee-finalization, notification-preview,
  payment, balance, and reporting journey passed. All 277 automated tests covering class breaks,
  student billing pauses, extra sessions, enrollment removal, family combination, class start dates,
  and automatic recalculation also passed, along with lint, TypeScript, and the production build.
  Enrollment email was disabled during the live run, and cleanup verification found no remaining
  temporary records.

- **2026-09-20: Live-verified automatic recalculation and paid-bill review.** A saved class-fee
  override now recalculates unpaid bills immediately, preserves paid bills for review, lists them in
  the all-month review queue, and surfaces them in the notification bell. The isolated production
  browser test passed, including the 5% sibling discount, exact review reason, and verified removal
  of every temporary family, student, class, bill, and payment. All 277 tests, lint, TypeScript, and
  the production build pass.

- **2026-09-20: Made billing review needs persistent and visible.** Paid bills protected during an
  automatic recalculation now retain the exact review reason, appear in an all-month Billing review
  view and the notification bell, and can be cleared by an adjustment or an explicit reviewed
  action. Current-month class fees awaiting finalization also appear in the bell. The additive
  database update was applied successfully; all 274 tests, lint, TypeScript, and the production
  build pass.

- **2026-09-19: Centralized automatic billing recalculation.** Class-fee edits, no-class months,
  class and enrollment pauses, enrollment lifecycle/date changes, extra sessions, registration
  approval, and class start-date corrections now refresh affected unpaid bills automatically while
  protecting paid bills and reopening changed class-fee months for review. All 273 tests, focused
  lint, TypeScript, and the production build pass.

- **2026-09-19: Added class start dates to the Classes list and corrected the stale Elgin fee.**
  Staff can see when billing begins from the list, and Bharatanatyam Beginner Elgin's September
  class fee now correctly shows two sessions and $40; its unpaid student bill was already $40.

- **2026-09-19: Added class start-date billing control.** Staff can set and correct a First Class
  Date; earlier months are excluded, the opening month counts only sessions from that date, and
  unused pre-start fee rows are removed. All 267 tests, lint, TypeScript, and production build pass.

- **2026-09-19: Improved enrollment action-menu clarity.** The compact trigger and every menu
  option now have recognizable icons, with accidental removal remaining visually destructive.

- **2026-09-19: Simplified enrollment actions.** Each enrollment row now has one compact Actions
  menu, with routine, lifecycle, and destructive actions clearly organized.

- **2026-09-19: Prevented modal close-button overlap.** Modal headers now reserve space for the
  close control, allowing long titles to wrap cleanly on narrow screens.

- **2026-09-19: Completed Varsha-request verification.** Summer-break months can be scheduled before
  billing and resume automatically; class breaks and accidental enrollment removal correctly update
  sibling-discount qualification. All requested break, pause, adjustment, rehearsal, removal, and
  family-combination paths pass together. All 264 tests, focused lint, TypeScript, and the production
  build pass. The required database updates were applied successfully.

- **2026-09-19: Added rehearsal, enrollment-removal, and family-combination controls.** Staff can
  record separately dated extra sessions billed by session or hour, safely remove accidental
  enrollments, and move siblings into an existing family with automatic unpaid-bill recalculation.
  All 251 tests, focused lint, TypeScript, and the production build pass. The extra-session database
  update was applied successfully.

- **2026-09-19: Completed pre-billing rehearsal and guardian workflows.** Extra sessions can be
  created directly from a class before billing, families can hold multiple editable guardian
  contacts with a chosen primary billing contact, and duplicate families can be combined without
  losing students, registrations, or contacts. All 258 tests, focused lint, TypeScript, and the
  production build pass. The guardian database update was applied successfully.

- **2026-09-18: Added billing exception controls.** Staff can set a no-class month, pause an
  individual enrollment for complete months with automatic resumption, enter one-student monthly
  adjustments, override class-month fees for extra rehearsals, and bulk-recalculate affected unpaid
  bills while preserving bills with payments. All 239 tests, focused lint, TypeScript, and the
  production build pass. The new billing-pause database update was applied successfully.

- **2026-09-17: Made enrollment billing dates timezone-neutral.** Enrollment start/end boundaries
  are database calendar dates, and staff must choose a guided First Billable Date during registration
  approval or manual enrollment. Sessions before the selected date are excluded and sessions on or
  after it are included. The live database conversion was applied successfully. All 226 tests,
  focused lint, TypeScript, and the production build pass.

- **2026-09-17: Audited related enrollment-date billing cases.** Enrollment creation, approval,
  reactivation, ending, monthly boundaries, every weekday, and all admin date displays now use the
  same studio calendar-date rules. The live read-only audit found nine unpaid September bills with
  the same $40-to-$60 discrepancy, no invalid enrollment ranges, and no regular classes missing a
  schedule. All 227 tests, focused lint, TypeScript, and the production build pass.

- **2026-09-17: Fixed same-day enrollment billing recalculation.** Older enrollment timestamps now
  resolve to the studio's calendar date consistently across billing and admin displays. Hannah's
  reported September 10 Thursday enrollment is covered by a regression test and recalculates as
  three sessions ($60 at $20 per session). All 217 tests, focused lint, TypeScript, and the
  production build pass.

- **2026-09-15: Added permanent student and family deletion.** Admins can permanently delete an
  individual student or an entire family from its profile after typing the exact record name. The
  operation removes connected registrations, enrollments, bills, payments, and notifications in a
  safe dependency order. An individual deletion preserves siblings and their family. All 214 tests,
  focused lint, TypeScript, and the production build pass.

- **2026-09-15: Added historical enrollment-date correction.** Staff can enter the actual class
  start date while adding an enrollment and edit it later. The UI explains how to recalculate the
  affected unpaid bill, while paid bills remain protected and use adjustments. Future dates and
  dates after an enrollment ended are rejected. All 210 tests, focused lint, TypeScript, and the
  production build pass.

- **2026-09-11: Polished policy settings and added admin guidance.** Registration Policies now
  guides owners through editing, previewing, and publishing; explains formatting and version history;
  clearly labels unsaved previews; and clarifies how restoring defaults works. Changed-file lint,
  TypeScript, and the production build pass.

- **2026-09-11: Polished registration policy presentation.** The public form now presents the guide
  as a clear Review & Consent step with readable policy cards, visual guidance, a refined scroll
  area, and a distinct required-versus-optional consent panel. Changed-file lint, TypeScript, the
  production build, and a desktop browser check pass.

- **2026-09-11: Added admin-managed registration policies.** The supplied regular-class guide is
  now shown before the required agreement, owners can edit and preview it in Settings, and every
  new request preserves the exact accepted policy version and agreement time. All 206 tests,
  changed-file lint, TypeScript, the production build, and desktop/mobile browser checks pass; the
  database update was applied successfully.

- **2026-09-10: Added billing schedule guidance.** Information icons beside the due-day and
  reminder-delay fields now explain first-of-month automatic bill generation, manual generation,
  how the due day is used, and the one-reminder-per-bill behavior. TypeScript and changed-file lint pass.

- **2026-09-10: Added guidance to every notification setting.** Each staff notification switch
  now has an accessible information icon explaining its trigger, recipient, and purpose. TypeScript
  and changed-file lint pass.

- **2026-09-10: Added optional email during enrollment finalization.** The email switch defaults
  on and includes a tooltip explaining how to defer the message. Turning it off preserves the
  Processed-list send action; a delivery failure does not undo enrollment and clearly guides staff
  to retry later. All 205 tests, focused lint, TypeScript, and the production build pass.

- **2026-09-10: Scaled the registration family picker.** Registration review now searches active
  families by family, parent, phone, or email and fetches only 25 records at a time, loading the
  next page on scroll. Automatic matching remains the default. All 203 tests, focused lint,
  TypeScript, and the production build pass.

- **2026-09-10: Added joining information to the Students table.** The roster now has separate
  Joined Date and Time with Malhaar columns. Joining dates use the saved calendar date without
  timezone shifting, and the duration remains automatically calculated. Six focused date tests,
  TypeScript, and changed-file lint pass.

- **2026-09-10: Added first-class Dance Programs.** Staff can manage each parent-facing program
  once and place multiple independently priced levels or batches beneath it. Classes and registration
  requests now link to programs, registration review is restricted to classes in the requested
  program, and all existing style values were preserved during the successfully applied database
  update. All 201 tests, TypeScript, lint, and the production build pass; lint retains only 16
  existing warnings in temporary scripts.

- **2026-09-10: Added automatic Student Duration with Malhaar.** Student profiles and the roster
  now calculate completed years and months from the original joining date. Staff can set or correct
  that date when adding/editing a student, registration approval uses the original submission date,
  and student CSV import/export includes the source date and calculated duration. Added four date
  calculation tests; all 194 tests, lint, TypeScript, and the production build pass. Lint retains
  only 16 existing warnings in temporary scripts.

- **2026-09-09: Implemented Varsha's style-first registration workflow.** The public form now asks
  only for a dance style, registration review requires staff to select the final active class, and
  finalizing creates the enrollment without sending parent email. Processed requests now provide a
  separately tracked enrollment-confirmation email action. Existing class requests and notification
  history were preserved by the successfully applied data update. The requested billing sentence
  was removed from the default and saved enrollment email. All 190 tests, TypeScript, lint, and the
  production build pass; lint reports only 16 existing warnings in temporary scripts. A complete
  browser test also passed against the configured test database: style-only submission, admin class
  finalization, processed status, and the separate unsent email action were verified without sending
  an email, and all temporary browser-test records were removed afterward.

- **2026-09-09: Imported client-confirmed registration corrections.** Added 11 more students across
  seven families using the contact, name, and joining-date corrections supplied by the client. Eight
  include their original registration history; the three existing-class students were added with
  their historical joining dates. No enrollments or bills were created, and repeat verification
  created no duplicates. Hailyn and Aahil remain pending missing phone details.

- **2026-09-09: Imported verified registration records.** Validated the 36-row source file,
  imported 19 unambiguous students into 14 families with their original registration history,
  emergency details, consent, and requested-program notes, and created no enrollments or bills.
  A repeat verification created no duplicates. Invalid, test, superseded duplicate, and conflicting
  records remain excluded pending corrected information from the client.

- **2026-09-08: Added existing-family selection to registration review.** Automatic matching remains default; staff can choose an active family identified by parent/contact details. Preview remounts on selection to prevent stale matching UI; approval revalidates the family inside the transaction and preserves existing contact/student/enrollment rules. Added 12 regression tests. All 184 tests and changed-file lint pass. Browser verified manual selection, return to automatic, and 390px layout without approving live requests or sending messages. TypeScript still reports existing generated-Prisma notification-setting errors in email/settings actions. Updated the operating guide; the previously delivered PDF has not been regenerated for this feature.

- **2026-09-08: Updated client manual to manual WhatsApp sending only.** Removed direct-send, WhatsApp setup/activation and automation references, provider-template references, and token wording. Explained Open in WhatsApp (wa.me), sending in WhatsApp, and Mark as Sent; clarified email reminder wording. Rebuilt the 32-page PDF and self-contained HTML with no missing images, broken links, or page overflow.

### 2026-09-08 — Admin width correction
- **Fixed whole-page horizontal overflow.** Added `min-w-0` to the dashboard's SidebarInset so intrinsic content widths no longer expand the flex panel beyond the space beside the sidebar. Reproduced on Classes, Billing, Students, and Registrations. Verified 49 browser combinations across seven routes, four viewport widths, and expanded/collapsed sidebar states; wide student tables retain their own horizontal scroll. Changed-file ESLint passes. TypeScript remains blocked by unrelated missing notification-setting fields in generated Prisma types used by `src/actions/email.ts` and `src/actions/settings.ts`.

### 2026-09-08
- **Created the client PDF user manual.** Delivered `docs/user-manual/Malhaar-Dance-Company-User-Manual.pdf` (32 A4 pages, 22 screenshot figures, linked contents/index, bookmarks, worked examples, troubleshooting, three appendices), self-contained HTML, reusable screenshots and build source. Validated page count, 68 link annotations, images/anchors, and footer overlap; visually reviewed seven representative pages. No business records changed or parent messages sent. Final website/support details were not supplied; a handover worksheet is included. Additional Import Students/Add Expense/Add Income modal captures hit the error boundary during concurrent local UI edits; unsuccessful images were excluded, with capture limitations documented in `docs/user-manual/README.md`.
- **Fixed stale admin sessions crashing /admin.** Rejected sessions redirect to login; login checks current database access before redirecting active admins back to the dashboard, replacing the proxy's JWT-only redirect. Preserved owner-only authorization and existing dashboard layout edits. Added missing/disabled/invalid-role session regression coverage. All 167 tests and TypeScript pass; full lint has no errors (unrelated temporary-script warnings remain). Browser verification was not run.

### 2026-09-08
- **Created the client PDF user manual.** Delivered `docs/user-manual/Malhaar-Dance-Company-User-Manual.pdf` (32 A4 pages, 22 screenshot figures, linked contents/index, bookmarks, worked examples, troubleshooting, three appendices), self-contained HTML, reusable screenshots and build source. Validated page count, 68 link annotations, images/anchors, and footer overlap; visually reviewed seven representative pages. No business records changed or parent messages sent. Final website/support details were not supplied; a handover worksheet is included. Additional Import Students/Add Expense/Add Income modal captures hit the error boundary during concurrent local UI edits; unsuccessful images were excluded, with capture limitations documented in `docs/user-manual/README.md`.
- **Fixed stale admin sessions crashing /admin.** Rejected sessions redirect to login; login checks current database access before redirecting active admins back to the dashboard, replacing the proxy's JWT-only redirect. Preserved owner-only authorization and existing dashboard layout edits. Added missing/disabled/invalid-role session regression coverage. All 167 tests and TypeScript pass; full lint has no errors (unrelated temporary-script warnings remain). Browser verification was not run.

### 2026-09-08
- **Audited unavailable WhatsApp controls.** All visible admin screens now offer only manual
  WhatsApp opening while API setup is unavailable. Removed the unused direct-send browser action
  and corrected operating documentation that still described that button.
- **Hid unavailable direct WhatsApp sending.** The fee notification window no longer offers a
  direct API send while its configuration is unavailable; staff can still open WhatsApp with the
  prepared message and send it manually.
- **Separated notification settings from billing.** Settings now has a responsive Notifications
  tab with staff alerts grouped into registration, billing and payments, parent communications,
  and system alerts. Billing now contains only discounts, due dates, and reminder timing.
- **Made the Billing Alert save action sticky.** The save bar now remains visible while the owner
  scrolls through the notification switches and keeps the existing disabled/saving states.
- **Added complete owner-controlled admin alerts.** Billing Settings now has separate enabled-by-
  default switches for new registrations, recorded payments, credits/overpayments, automatic
  billing failures, failed parent fee notices, failed payment reminders, and class fees still
  awaiting finalization. Alerts use the configured staff address or owner fallback. The
  unfinalized-fee reminder waits until the monthly due day and sends at most once per month.
- **Added optional staff confirmations for parent fee notices.** An enabled-by-default switch in
  Billing Settings now sends a checkmarked email to the configured billing-alert address (or active
  owner) after a family notice is successfully emailed, accepted by WhatsApp, or manually marked
  sent. The confirmation identifies the family, billing month, and delivery method. Failed parent
  sends do not trigger a success confirmation.
- **Added a configurable monthly billing-ready admin email.** Billing Settings now has an enabled-
  by-default switch and recipient address (falling back to the active owner email). After the
  scheduled monthly billing run, staff receive the created/updated/skipped summary and a reminder
  to review and finalize Class Fees before parent notices. Turning the setting off skips the alert.
  Added a database migration and focused tests for default fallback, opt-out, and custom recipient.
- **Completed the live deployment A-to-Z acceptance test.** The browser-driven run against the
  client-confirmed test deployment/database passed: admin login and core routes, two public
  registrations, approval and same-family sibling matching, student/class enrollments, mid-month
  proration, 5% multi-class and sibling discounts, seasonal discount exclusion, notification
  blocking before class-fee finalization, post-finalization notification readiness, partial and
  full payment balance/status updates, financial-report visibility, and a second-month check proving
  the seasonal enrollment was charged only once. No email or WhatsApp delivery was triggered. The
  final Playwright run passed in 1.3 minutes; uniquely labelled `LIVE E2E` records remain in the test
  database, including records from selector-debug reruns.

### 2026-09-07
- **Closed the remaining Varsha/Malhaar billing audit items.** Mid-month enrollments are now
  prorated to sessions actually falling within the enrolled range (`computeProratedLineItemAmount`,
  `src/lib/billing.ts`), not the full month. Seasonal/special-program charges bill exactly once per
  enrollment — `buildLineItemInputs` now skips re-billing a `SEASONAL` enrollment already charged in
  an earlier month. Seasonal/non-discount-eligible line items are excluded from *and* unaffected by
  both the multi-class and sibling discount (previously only excluded from the multi-class count;
  the sibling discount was still taken from a subtotal that included them), enforced in
  `computeStudentBilling` itself rather than only via the admin-set `Class.discountEligible` flag —
  a `SEASONAL` class is now always treated as non-discount-eligible in the billing logic regardless
  of that flag. Added a billing finalization gate: `ClassMonthlyFee.isFinalized`/`finalizedAt`
  (migration `20260907111531_add_class_monthly_fee_finalization`) records staff sign-off on a
  class's billable session count per month (Finalize/Un-finalize/Finalize-All on
  `/admin/class-fees`, cleared automatically on any fee edit); every notification/reminder send path
  (`sendFamilyNotificationEmail`, `sendMonthlyWhatsApp`, `markFamilyNotificationSent`,
  `sendPaymentReminders`/`sendFamilyPaymentReminder`) now checks it first — manual sends throw
  naming the unfinalized classes, bulk/cron sends silently skip and retry next run. Partial-payment
  reminders were already correct (use `balance`, not `finalAmountDue` — verified, no change needed).
  Updated `docs/04-business-logic-billing-discounts.md` (§4.1-4.3 corrected, new §4.7) and
  `docs/10-admin-flow-and-operations.md` (finalization step, seasonal/regular pricing section); the
  admin handoff walkthrough itself already existed there, correcting `docs/09`'s stale claim that it
  didn't. Added coverage in `src/lib/billing.test.ts` and `src/actions/flow.test.ts`. `npx tsc
  --noEmit`, `npm run lint`, and `npm test` (157 tests) all pass; `npm run build` and the Playwright
  e2e suite were not rerun.
- **Resolved app flow review issues.** Added active-admin authorization and runtime validation to
  browser actions, owner-only settings enforcement, a minimal public class query, and server-only
  job/mail services so protected cron routes keep working without a browser session. Historical
  billing now includes ended enrollments overlapping the billed month and charges each class once;
  serializable transactions with conflict retries protect enrollment/registration/payment writes.
  Added overpayment refund recording as negative payment ledger entries (no schema change), remaining-
  balance reminders, automatic retry eligibility after failures, and an explicit family reminder
  action for older failures. Registration family matching normalizes phone/email, rejects ambiguous
  matches, and records the approving/rejecting admin. Implemented configured WhatsApp template
  sending; activation remains listed above. Added the operating guide and corrected the status report.
  Validation: 140 tests pass, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass. The browser
  acceptance suite and live messaging were not rerun. Existing separate CSV edits were preserved.
- **Completed source-based app flow review.** Traced registration approval, family/student matching, enrollment, monthly fees/discounts, notifications, payments, and financial reports. All 52 unit tests pass. Browser acceptance suite and live integrations were not rerun; findings above remain open. No functionality changed.
- **Added a Teacher module.** Requirements doc only gave `Class` a free-text `teacher` string,
  flagged as the doc's clearest blind spot in `docs/09-status-report-and-gap-analysis.md` §9.4.
  Added a `Teacher` table with full CRUD at `/admin/teachers` (list/detail/new/edit, mirroring the
  Families module), and turned `Class.teacher` into a real `teacherId` relation — the Class
  create/edit forms now use a Teacher picker (with an inline "add a new teacher" shortcut) instead
  of free text, and the Classes list/detail pages show/link the linked teacher. Migration
  (`20260907065905_add_teacher_module`) backfilled one `Teacher` row per distinct existing
  free-text name and relinked all classes before dropping the old column — verified against the
  live data first (4 distinct names, 6 classes, all correctly relinked, nothing lost). `npx tsc
  --noEmit`, `eslint`, `npm test` (52 tests), and `npm run build` all pass.
  Deliberately **not** linked `Expense.teacherId` in this pass (kept out to keep the diff scoped
  per AGENTS.md Rule 8) — flagged as a natural fast-follow for instructor-pay reporting.
- **Closed out the four lower-priority items flagged in `docs/09-status-report-and-gap-analysis.md`
  §9.4** (class capacity, refunds, data export — signed consent capture left open, still just a
  boolean-record limitation worth knowing about) plus the `Expense.teacherId` fast-follow flagged
  above. Owner picked the scope for each via a clarifying question first (soft cap, no waitlist;
  document-the-policy over new refund UI; add CSV export over just documenting the answer):
  - `Class.capacity` (optional): enrolled/capacity shown on the classes list, class detail page,
    and the "Add Enrollment" modal, which warns (not blocks) once a class is full. No waitlist.
  - `Expense.teacherId` (optional, any category): Expense form gained a Teacher select; the Teacher
    detail page now has a "Payments to This Teacher" card with a running total.
  - Refund policy documented as "negative adjustment with a note" — and `setBillingAdjustment`'s
    block on `status = PAID` bills was removed, since that was the one case a refund actually
    happens; it now correctly recomputes to `OVERPAID`. The Adjustment modal explains this inline.
  - "Export CSV" buttons added to the Students and Billing pages (`src/lib/csv.ts`), generated
    client-side from data the page already has — no new server endpoint.
  Migration `20260907082608_add_class_capacity_and_expense_teacher`. Re-ran the Playwright
  acceptance suite (`npm run test:e2e`) and `npm test` (52 tests) after — both pass; `tsc --noEmit`
  and `eslint` clean.
- **Added "Import CSV" for Students**, the counterpart to the export button above — client asked
  for a way to bulk-load students instead of adding them one at a time. New `importStudents` action
  (`src/actions/students.ts`) matches each row to an existing `Family` by Parent Phone/Email
  (mirroring the find-or-create logic `approveRegistrationRequest` already uses for registrations),
  creating a new family only when no match is found and the row supplies enough info to make one;
  a student already present in the matched family (by name, case-insensitive) is reported as
  skipped rather than duplicated. Rows are processed one at a time, each in its own transaction, so
  siblings sharing a phone number in the same file correctly land in one family, and a bad row
  doesn't roll back rows already imported. `ImportStudentsModal` (`import-students-modal.tsx`) adds
  a small client-side CSV parser (`parseCsv`/`csvRowsToObjects` in `src/lib/csv.ts`) with a
  downloadable template, a pre-flight validity preview, and a per-row created/skipped/error result
  list after submit. `tsc --noEmit`, `eslint`, and `npm test` (140 tests) all pass.

### 2026-09-05
- Discount policy, SMTP, and WhatsApp credentials moved from `.env` into admin-editable
  `StudioSettings` (encrypted at rest for the SMTP password / WhatsApp access token).
- `/api/cron/generate-monthly-billing` and `/api/cron/send-payment-reminders` implemented and
  scheduled (`vercel.json`), `CRON_SECRET`-protected.
- Settings page reorganized into tabs (Appearance / Billing / Integrations / Email Templates);
  fixed a bug where the font size (and theme color) setting didn't actually apply after saving;
  replaced the raw hex color inputs with a single preset-theme dropdown.
- Fixed a React Hook Form bug (shared `FORM` component) where re-selecting a value matching what a
  form originally loaded with left the Save button stuck disabled even though the server held a
  different value.
- Added the Email Template module: `EmailTemplate` table + Settings tab for editing the subject/body
  of the 4 outbound emails (registration received, enrollment confirmed, monthly fee notice,
  payment reminder), each with placeholder substitution and a "Reset to Default" option, rendered
  inside a fixed HTML shell (theme-colored header with logo, footer) built from `StudioSettings`.
- Fixed a Windows-specific `lint-staged`/pre-push hook failure ("command line is too long") on large
  changesets by lowering its `--max-arg-length` chunking budget.
- Email Templates settings tab reworked to a dropdown (pick which of the 4 emails to edit) +
  subject/body form, instead of showing all 4 as separate always-visible cards.
- Seeded realistic mock data (6 classes, 6 families/8 students covering the discount-combination
  cases, 1 pending registration, a few expenses/other-income) into the main database via
  `npm run db:seed-mock` (`prisma/seed-mock-data.ts`, safe to re-run — skips if families already exist).
- Fixed a real bug (not caused by this session's other changes, just never triggered until mock data
  existed): opening a registration request that had a requested class attached crashed the page —
  `getRegistrationRequestById` was passing a full `Class` row (with a `Decimal` field) across the
  server/client boundary, which Next.js rejects. Narrowed to `select: { id, name }`.
- Added a notification bell to the admin header (`NotificationBell`) with a badge totaling pending
  registration requests, bills not yet sent to families, and email sends that failed in the last 30
  days. Polls every 60s rather than being wired to invalidate from every relevant mutation.
