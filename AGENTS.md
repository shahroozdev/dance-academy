# AGENTS.md

## Project Summary

Malhaar Dance Company Management System — a custom web app (Next.js + PostgreSQL +
Prisma) replacing a fragile Stackby no-code setup for a ~50-student dance studio.
It automates the full workflow: public registration → family/student matching →
class enrollment → monthly class pricing → per-student monthly billing (with
multi-class and sibling discounts) → one-off adjustments → parent WhatsApp fee
notifications → payment recording → balance/status tracking → school-level
income/expense/profit reporting. One studio owner (plus optional staff) uses the
`/admin` app; parents only ever see the public `/register` form. Full requirements
are in [`Malhaar_Dance_Company_System_Requirements.docx`](../Malhaar_Dance_Company_System_Requirements.docx);
the detailed build plan (data model, every route, billing/discount math, WhatsApp
integration, financial reporting, phased roadmap, acceptance tests) lives in
[`docs/`](docs/), starting at [`docs/README.md`](docs/README.md).

## UI Rules

1. **Reusability first.** Before building a new component, check if an existing
   one (or a small generalization of it) already covers the case. Prefer
   composing existing primitives over copy-pasting markup.
2. **Loading states use skeletons.** Any view/component that fetches async data
   must show a skeleton placeholder matching its final layout — never a bare
   spinner or blank screen — to avoid layout shift.
3. **Theme consistency.** All new UI must use existing theme tokens (Tailwind
   config colors, spacing, fonts) — no hardcoded hex colors or one-off spacing
   values that bypass the design system. Support light/dark if the surrounding
   UI already does.
4. **Match existing patterns.** Follow the visual and interaction conventions
   already established in sibling components (buttons, modals, empty states,
   error states) rather than introducing a new style per feature.
5. **Responsive by default.** New UI must work across mobile/tablet/desktop
   breakpoints already used in the project — no fixed-width layouts that break
   on smaller screens.
6. **Build forms with `FORM`/`FormFeilds` (`src/components/common/form.tsx`)
   on top of react-hook-form + zod.** `FORM` wraps `useForm`/`FormProvider`
   and submit handling (incl. scroll-to-first-invalid-field on validation
   error); `FormFeilds` wires a single `Controller`-bound field into
   `ui/field.tsx`'s `Field`/`FieldLabel`/`FieldError`. This is the canonical
   form wrapper — don't hand-roll `useForm`/`zodResolver` wiring or introduce
   another form component. Don't hand-roll a
   form's field markup/validation wiring from scratch when an existing
   domain form already covers a similar shape.
8. **New/changed code wraps shadcn primitives in `@/components/common`
   instead of importing `@/components/ui/*` directly.** `src/components/common`
   holds one generic wrapper per reusable UI concern, driven by a `type`/
   `variant` prop dispatched via an object map (Code Rule 10) — not a family
   of one-off components:
   - **`Input`** (`common/input.tsx`) — one component covering
     text/password/textarea/select via a `type` prop
     (`<Input type="select" options={...} />`), wrapping
     `ui/input.tsx`/`ui/textarea.tsx`/`ui/select.tsx`.
   - **`Modal`** (`common/modal.tsx`) — wraps `ui/dialog.tsx` (this
     project's Radix-based dialog primitive — not `@base-ui/react`) behind a
     shared API: `open`/`defaultOpen`/`onOpenChange` for
     controlled-or-uncontrolled use (internal `useState` fallback when
     uncontrolled), `disabled` to force it closed regardless of open state,
     `trigger` (a single `ReactElement` wired via Radix's `asChild`),
     `closeOnOutsideClick` (maps to `onPointerDownOutside`/`onEscapeKeyDown`
     on the content), and a `children` render-prop `({ close }) => ReactNode`
     — or a single `ReactElement` that gets `close` cloned onto it via
     `cloneElement` — so content can close the overlay without reaching into
     unrelated state.
   - **`Table`** (`common/table.tsx`) — wraps `ui/table.tsx`, re-exporting
     `TableHeader`/`TableBody`/`TableFooter`/`TableRow`/`TableCell`/
     `TableCaption` unchanged and enhancing `Table`/`TableHead` with optional
     column resizing (on by default — drag the handle on a `TableHead`'s
     end edge; opt a column out with `resizable={false}` on that `TableHead`
     or the whole table with `<Table resizable={false}>`) and sorting
     (`<TableHead sortable sortDirection={...} onSort={...}>` renders the
     click target and arrow/neutral icon — the caller still owns the actual
     sort state, e.g. via `useServerTable`). Use this for every data table
     instead of importing `ui/table.tsx` directly; see `CustomersTable`,
     `ProductsTable`, `SuppliersTable` for the resizable+sortable pattern and
     `SaleHistoryTable`/`LedgerTable`/etc. for tables that just need the
     shared look with sorting left off (columns stay resizable).
   - **`FORM`/`FormFeilds`** (`common/form.tsx`) — the canonical form
     wrapper on top of react-hook-form + zod, built on `ui/field.tsx`; see
     Rule 6 above. Use this for new forms — don't create another form
     wrapper. The older `src/components/FormField.tsx` (`FormInputField`,
     built on `ui/form.tsx`) still exists for the domain forms below and
     isn't being extended further.
   - **Thin pass-through wrappers** — `common/card.tsx`, `common/button.tsx`,
     `common/calendar.tsx`, `common/popover.tsx`, `common/separator.tsx`,
     `common/alert.tsx`, `common/label.tsx` each just re-export their
     `ui/*.tsx` counterpart unchanged (no new API — these primitives don't
     need variant dispatch today). Import from these instead of `ui/*`
     directly; if one of them later needs real dispatch/enhancement, add it
     to the existing wrapper rather than creating a second one.
   - **`PurchaseOrderForm`/`GoodsReceiptForm`** are built on `FORM`/
     `FormFeilds` + the wrappers above — use them as the reference for
     migrating another form.
   - **Existing domain forms** (`CustomerForm`, `ProductForm`,
     `SupplierForm`) still use `FormField.tsx` and import `ui/select.tsx`/
     `ui/switch.tsx`/`ui/textarea.tsx` directly, haven't been migrated to
     `common/input.tsx` or `common/form.tsx` yet — that's a known gap, not a
     pattern to copy. Migrate a form's usages to `common/` incrementally when
     you're already touching that form for another reason; don't do a
     standalone drive-by migration of unrelated forms (Code Rule 8, Scoped
     changes). 
   - `common/drawer.tsx` and `common/toggle.tsx` were built speculatively but
     never adopted (0 real call sites across two audit cycles) and have been
     removed — use `ui/sheet.tsx`/`ui/switch.tsx` directly until a real need
     for a shared wrapper reappears, then add it back deliberately with a
     real call site in the same change (this is exactly how `common/card.tsx`
     came back).


## Code Rules

1. **Check current docs via Context7 before using an unfamiliar Next.js,
   Prisma, NextAuth, Shadcn, or Tailwind API.** Before writing code against a
   feature you're not certain is current (APIs change between major versions
   — this repo is on Next.js 16 / React 19 / Prisma 7 / Tailwind v4), use the
   `context7` MCP tool to pull up-to-date documentation instead of relying on
   possibly-outdated training knowledge. Skip this for basic, stable usage
   you're already confident about — it's for cases where getting the API
   wrong is a real risk.
2. **All data access goes through `src/actions/**` server actions — never
   query Prisma directly from a page/component, and never add a REST route
   for internal data.** Actions are colocated by domain add to or extend the matching
   domain's actions rather than reaching for `src/lib/db.ts`'s Prisma client
   from a component. This keeps auth/session checks, scoping centralized instead of
   duplicated per call site.
3. **No unwanted re-renders.** Memoize callbacks/values passed to children
   (`useMemo`/`useCallback`) where it prevents unnecessary re-renders, keep
   context values stable, and avoid creating new object/array literals inline
   in props when it causes child re-renders.
4. **Prefer server-side rendering.** Pages/components should be React Server
   Components by default — only add `"use client"` for the specific
   leaf component that actually needs interactivity/state/browser APIs, not
   for the whole page. Fetch data on the server (in the page/layout or a
   server component) instead of client-side `useEffect`/fetch calls whenever
   the data is available at request time.
5. **No duplicate code.** Extract shared logic into a hook/util/component
   instead of copy-pasting; if you're about to paste a block that already
   exists elsewhere, factor it out instead.
6. **No dead code.** Don't leave unused variables, commented-out blocks, or
   unreachable branches behind.
7. **Type safety.** No `any` unless truly unavoidable; keep `src/types/`
   (split by domain) as the **only** place for shared domain `type`/`interface` declarations. Don't
   create a `types.ts` (or `*.types.ts`) file inside `src/components/**`,
   `src/actions/**`, `src/hooks/**`, or `src/lib/**` — add the shape to the
   matching (or a new) file in `src/types/` instead, named after the domain
   it describes. Types genuinely private to one
   component/hook and never reused can stay inline in that file — the rule
   is against a colocated `types.ts` that becomes a second, competing home
   for domain types (enforced by eslint, currently `warn` — see below).
   Exception: a file that exports a runtime zod schema alongside its
   `z.infer` type is a validation schema, not a type file — it stays colocated with the action
   that uses it for parsing, not moved to `src/types/`.
  
8. **Scoped changes.** Don't refactor unrelated code while fixing a bug or
   adding a feature — keep diffs focused on the task at hand.
9. **File size limit — 600 lines.** No file should grow past ~600 lines. If a
   file is approaching or exceeding this, split it into smaller chunks
   (extract sub-components, hooks, or utils into their own files) instead of
   continuing to grow it in place.
10. **Object maps over if/else and switch chains.** For toggling between
   components, values, or data based on a key (variant/type/status switches),
   use an object map (`{ key: value }[selector]`) instead of long
   `if`/`else if` or `switch` chains.
11. **`useReducer` for interdependent state.** If a component has multiple
   `useState` hooks whose values update together or must stay in a valid
   combination (e.g. `status`/`data`/`error` in a fetch flow), consolidate
   them into a single `useReducer` instead — it centralizes the transition
   logic and prevents invalid state combinations. Don't apply this just
   because a component has several `useState` calls — unrelated, independent
   pieces of state (e.g. a modal toggle next to an unrelated sort order)
   should stay as separate `useState` hooks; forcing them into one reducer
   adds indirection without benefit.
12. **No chained/nested ternaries; watch `&&` falsy values.** A single
   `cond ? <A/> : <B/>` or `cond && <A/>` is fine and idiomatic — don't
   object-map those. But chained/nested ternaries
   (`cond1 ? <A/> : cond2 ? <B/> : <C/>`, 3+ branches) are a switch in
   disguise — use an object map or early returns instead. With `&&`,
   coerce non-boolean conditions (`count && <Badge/>` renders a literal `0`
   when `count` is `0`) — use `count > 0 && ...` or `!!count && ...`.
   When building an object map: default to plain elements
   (`{ active: <Comp/>, inactive: <Comp2/> }[key]`); if a branch reads
   data that's only valid/defined for that branch (so other branches
   would throw or do wasted work if constructed eagerly), wrap each
   branch in a function and call the selected one instead
   (`{ active: () => <Comp data={x.value}/>, inactive: () => <Comp2/> }[key]()`).

14. **No barrel/index re-export files.** Import each component/util directly
   from the file it's defined in  — never add or import through an `index.ts`
   that re-exports a folder's contents. Barrels drift out of sync with the
   folder (they silently go stale as files are added/removed — e.g. when a
   new component is added and someone forgets to re-export it) and weaken
   tree-shaking/module splitting in Next.js. If you find one, delete it
   rather than keeping it updated.
15. **Navigate with `@/components/Link` and `@/hooks/useRouter`, never
   `next/link`/`next/navigation` directly.** This project is single-language
   (no next-intl/`@/i18n/navigation` — that layer was dropped for this project
   since only one locale is needed). Every in-app navigation (link clicks and
   programmatic `push`/`replace`/`back`/`forward`) must show the top
   route-progress bar (`src/components/RouteProgressBar.tsx`, driven by
   `src/lib/route-progress.ts`'s `start()`/`done()`). `@/components/Link` and
   `@/hooks/useRouter` are drop-in wrappers around `next/link`'s `Link` and
   `next/navigation`'s `useRouter` that call `start()` on navigation —
   importing the raw `next/link`/`next/navigation` versions bypasses that and
   the navigation happens with no loading feedback. `next/navigation`'s
   `usePathname`/`redirect`/`getPathname` are unaffected by this rule (they
   don't trigger navigation) and stay imported directly from
   `@/i18n/navigation`.

16. **List/table pages follow one canonical layout: `CardWrapper` +
   `useTableColumns` + `FilterToggleRowServer` + a `PaginationServer` footer.**
   new list/table pages must match it instead of inventing a one-off layout:
   - **Columns**: never inline a column array or hand-roll `<TableHead>`s in
     the page. Add an entry to `tableColumnsRegistry` in
     `src/hooks/table-columns-registry.ts` and resolve it with
     `useTableColumns(tableKey, t)` (`src/hooks/useTableColumns.ts`) — one
     typed (`TableKey`) place for every table's column set.
   - **Shell**: wrap the list in `CardWrapper` (`common/card.tsx`), not a
     bare `Card`/`div`. `header` = an icon (`lucide-react`) + `CardTitle` on
     the left, a `t("recordsCount", { count: total })` span on the right,
     `headerClassName="border-b"`. `contentClassName="flex min-h-0 flex-1
     flex-col p-2"` holds `FilterToggleRowServer` (search box + filter
     dropdowns + a create `Button` via `postComp`) followed by
     `TransitionProvider><Table>`. `footer` = `pages > 1 ?
     <PaginationServer pages={pages} total={total} /> : undefined`,
     `footerClassName="border-t"` — pagination lives in the card footer, not
     floating below the table.
   - **Rows**: use `TableRow`/`TableCell` from `common/table.tsx`, not raw
     `<tr>/<td>`.
   - **Sorting/pagination**: sort state (`sortBy`/`sortOrder`) is read from
     `useSearchParams()` and written via `router.push` on `onSort`; data is
     fetched server-side and passed in as `initialData` — don't re-derive
     pagination/filtering client-side over a full in-memory array.

17. **All client-side data access goes through the `useQuery`/`useMutate` hooks —
   never call a server action directly from a client component.** Exactly like
   rule 2 (which governs server-side access), every read/write that a client
   component performs against a server action must be routed through the
   registry-driven hooks: `useQuery("key", [args], { enabled?, initialData? })`
   for reads and `useMutate("key", { invalidateKeys, onSuccess?, onError? })`
   for writes. Add the action to the matching registry in
   `src/hooks/query-registry.ts` (queries — also usable server-side via
   `src/components/common/FetchSection.tsx`, which resolves zero-arg keys) or
   `src/hooks/mutation-registry.ts` (writes) and let the hook infer the
   action's arg/return types from the registry. Benefits: one place to see
   every data source, automatic refetch after mutations (`invalidateKeys`),
   stale-response protection (requests are dropped via an internal request id),
   and server-seed support (`initialData` skips the duplicate mount fetch and
   keeps data visible during later refetches). Exceptions: imperative one-shot
   reads triggered only by a button/scan event (e.g. an invoice lookup) and
   cache-warming calls may keep a direct `await action(...)`; pure server
   components keep their direct `await` in the async page body.

---

## Change Documentation

Every change to functionality or UI must be logged in
[`docs/new-updates-summary.md`](docs/new-updates-summary.md), newest entry on
top. Log started 2026-07-17 and continues going forward with every
functional/UI update — this is the running changelog for the project.

**This doc is written for the client, not for developers.** The client is
non-technical, so every entry must read like a plain-language product update,
not a commit log:
- No file paths, component/function names, table names, or code identifiers
  (e.g. write "the admin Revenue page" not `AdminRevenuePage.tsx`).
- No git/dev jargon ("uncommitted", "refactor", "restructure", "hook",
  "endpoint", "migration").
- Describe *what changed for the user* (what they'll see or be able to do),
  not *how it was implemented*.
- Group entries under the same date headings as before; skip purely internal
  changes (dev docs, internal tooling, code cleanup with no visible effect)
  entirely rather than translating them into vague filler.
- Keep each bullet short and concrete — one user-visible change per bullet.

## Task Tracking (multi-window / cross-session continuity)

Work on this project happens across multiple Claude windows/sessions, and any
session can hit its usage limit mid-task. [`docs/current-tasks.md`](docs/current-tasks.md)
is the shared source of truth for what's in progress, what's next, and what's
done — it lets a new window pick up exactly where a cut-off session left off,
and lets concurrent windows avoid stepping on the same task.

Rules:
1. **Check it first.** Before starting work, read `docs/current-tasks.md` to
   see if the task (or something touching the same files) is already in
   progress in another window.
2. **Claim before starting.** When you start a non-trivial task, move it into
   "In Progress" with today's date and a one-line note of the approach.
3. **Leave a resumable trail.** Whenever a task is left incomplete (limit hit,
   context cut off, or paused by the user), update its entry with exactly
   what's done, what's left, and the next concrete step — specific enough
   that a fresh session with no memory of this conversation can continue
   without re-deriving context.
4. **Close it out.** When a task is finished, move it to "Done" with the
   completion date, and record it in `docs/new-updates-summary.md` per the
   Change Documentation rule above.
5. **Keep it current.** Stale or duplicate entries should be cleaned up as
   they're encountered, not left to accumulate.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
