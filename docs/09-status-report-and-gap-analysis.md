# 9. Status Report & Gap Analysis (as of 2026-09-07)

## Latest correction — app flow fixes, 2026-09-07

The earlier assessment below overstated readiness. A subsequent source review found missing action-level access checks and input validation, reminders using the original fee after partial payments, historical billing excluding now-ended enrollments, duplicate active enrollments, failed reminders being marked completed, and no cash-return record for refunds. Those implementation issues are now addressed. Regression tests cover access, historical fees, enrollment duplication, partial-payment reminders, retries, refunds, and family matching; see `src/actions/flow.test.ts` and the related library tests.

WhatsApp template sending is now implemented with an explicit Send WhatsApp action, protected monthly scheduling, optional WhatsApp payment reminders, provider message references, and failure logging. Live delivery remains unverified and requires working Meta credentials, approved templates, and deployment configuration. Provider acceptance is recorded; delivery/read webhooks are still outside this change. The old statements below describing manual-only WhatsApp and "everything working" are historical and superseded by this correction.

Registration remains approval-gated. Family phone/email matching now normalizes formatting and rejects ambiguous matches. Approval/rejection records the acting admin. Siblings are students sharing a Family record, with the discount requiring two active students enrolled during the selected month. Refunds are now recorded separately from fee adjustments as negative payment entries, so returned cash reduces collected income on its return date.

See [the operating guide](./10-admin-flow-and-operations.md) for current behavior and setup steps. No live parent messages were sent as part of verification. The existing browser acceptance test results below describe the earlier run, not a new run of this change.

Re-reads [`Malhaar_Dance_Company_System_Requirements.docx`](../Malhaar_Dance_Company_System_Requirements.docx)
(31 Aug 2026) against the actual state of `src/`, `prisma/schema.prisma`, and the docs in this folder,
and answers three questions: **what's done, what's left, and what does the requirements doc not
account for that the system should.** This supersedes nothing else in `docs/` — 01–08 describe the
*plan*; this file describes *where the build actually stands* against both that plan and the
original requirements doc, verified directly against source rather than against the other docs'
own claims.

Reminder from [README.md](./README.md): the original doc specifies a Stackby (no-code) build. That
was a deliberate, already-approved pivot to a custom Next.js + PostgreSQL app — not a gap.

## 9.1 Section-by-section status against the requirements doc

| § | Requirement | Status | Notes |
|---|---|---|---|
| 2 | Core data structure (Families, Students, Class Monthly Fees, Enrollments, Monthly Student Billing, Payments, Registration Requests, Expenses, Financial Dashboard) | **Done** | All nine modules exist as real tables + full CRUD + UI. Attendance correctly left out per doc §2. |
| 3.1 | Registration form fields | **Done** | Every listed field is collected in `register-form.tsx`; one-student-one-class-per-submission rule is followed as the doc prefers. |
| 3.2 | Registration automation (create request → find/create family → find/create student → create enrollment, avoid duplicates) | **Done** | `approveRegistrationRequest` matches Family by phone/email and Student by name within that family before creating; only creates what's missing. This is the automation the doc says "went missing" and needed rebuilding — it's rebuilt and is admin-triggered (approve button), not fully unattended. See §9.3 below on whether that matches intent. |
| 4.1 | Families (name, parent, email, phone, active flag, linked students, active student count) | **Done** | `studentCount` on the family list is a live count of active students, matching the doc's example fields exactly. |
| 4.2 | Students (name, family, DOB, gender, join date, active flag, medical/general notes, active enrollments) | **Done** | Age isn't a stored field but is trivially derivable from DOB; not treated as a gap. |
| 4.3 | Classes (name, style, level, teacher, day/time, duration, standard rate, pricing type, active flag) | **Done** | `teacher` is now a real linked `Teacher` record (picked from a dropdown on the Class form, with an inline "add a new teacher" shortcut), not free text — see §9.4, updated 2026-09-07. |
| 4.4 | Enrollments (one row per student-per-class; rosters generated from enrollments, not maintained by hand) | **Done** | The doc even asks "could this live inside Student instead" — the team kept it as a proper join table, which is the right call since a roster/discount engine over a denormalized Student record would be far more fragile. |
| 4.5 | Class-based "students per class" view | **Done** | `/admin/classes/[id]/roster` plus a live enrollment count on the classes list. |
| 5 | Class Monthly Fees (frozen historical fee per class per month, admin override, regular vs. seasonal/flat pricing) | **Done** | `ClassMonthlyFee` is get-or-create per `[class, month]`, frozen once created except via explicit admin override at `/admin/class-fees`; editing a class's standard rate never rewrites history. New classes can be added anytime with no limit, satisfying "more classes will be added in future." |
| 6 | Monthly Student Billing (one row per student per month, auto-populated for every active student, Final Amount Due clearly visible, filterable so 50 students don't require endless scrolling) | **Done** | `generateMonthlyBilling(month)` is a one-click bulk action covering every active student — the admin never types a student list. The billing workspace answers the doc's own open question ("filtering, or other ways?") with **both**: status-chip filters + text search *and* family-grouped collapsible rows, so an admin sees ~15–20 families instead of ~50 flat rows. |
| 7.1–7.2 | 5% multi-class discount, 5% sibling discount, both visible, one documented calculation order | **Done** | `computeStudentBilling` applies multi-class discount to eligible line items first, then sibling discount to `(baseTuition − multiClassDiscount)`, unit-tested against the doc's own Nia/Leia worked example (reproduces $144.40 / $56.00 exactly). Both percentages are admin-editable in Settings, not hardcoded. |
| 8 | One-month-only adjustment with a note, no effect on future months or the class's standard price | **Done** | `adjustment` + `adjustmentNotes` live only on that month's billing row; `recalculateBilling` explicitly preserves the adjustment when re-pulling class fees. |
| 9 | Personalized parent notification built from Final Amount Due, single combined message per family for siblings | **Done** (message generation) | `buildFamilyMessage` produces the exact format from the doc's example, combining every billed sibling into one message. |
| 9.1 | Automated WhatsApp Business sending, with cost disclosure before implementation | **Not implemented — but correctly gated, not skipped** | Cost research **is** done and documented ([05-notifications-whatsapp.md §5.2](./05-notifications-whatsapp.md#52-delivery-channel-decision)): Meta Cloud API direct, expected **under $1/month** at this scale, full alternatives table already given to the owner. What's missing is the actual Graph API send call — today "sending" is a `wa.me` deep link the admin clicks and sends by hand. This is the single largest functional gap against the doc, but it is blocked on external prerequisites (Meta Business verification + template approval), not on undone engineering. See §9.2. |
| 10 | Payments linked to a bill, multiple payments per bill, Amount Paid / Balance / Status computed automatically, method includes Zelle/Cash/Check/Other, views by month/status/class/family | **Done** | `createPayment` recomputes paid/balance/status server-side from the summed linked payments every time — never trusts a client-sent total. Views exist by month, by status (chip filters), and by family (grouped rows); a class-level payment view isn't separately built but is reachable by filtering the roster + billing by class. |
| 11.1 | Actual payments auto-contribute to income (no double entry); other income recordable (registration fees, workshops, performance fees, etc.) | **Done** | Financial reports pull tuition income directly from `Payment`, never from billing due-amounts, so nothing is entered twice. `OtherIncome` is a full parallel module for the non-tuition categories the doc lists. |
| 11.2 | Expenses module (date, category, description, amount, method, notes, receipt) | **Done** | Full CRUD including delete (with a confirm prompt), and `receiptUrl` now has a real upload flow — the expense modal uploads to Vercel Blob (same `put()` pattern as logo upload) and attaches the resulting URL to the record; a "View current" link opens the stored receipt. |
| 11.3 | Monthly/yearly/all-time income, expenses, net profit; historical years remain selectable without rebuilding the system | **Done** | `/admin/reports/financials` supports all three periods; `getAvailableYears()` means 2027, 2028, etc. appear automatically the first time they have any activity — no new-year setup step required. |
| 12 | Dashboard (current month due/collected/outstanding, active student count, unpaid/partial list, class rosters, monthly/yearly/all-time income-expenses-profit) | **Done** | All of it is present on the admin dashboard and financial reports pages, including a revenue trend chart, registration funnel, and billing-status breakdown (recharts-based, added `src/components/charts/`). |
| 13 | Technology/cost discipline (reuse existing structures, disclose paid-service costs, avoid fragile automation) | **N/A under the approved pivot** | The Stackby-specific asks (troubleshoot "Link to Another Row" errors, reuse existing Stackby tables) don't apply post-pivot. The underlying *intent* — don't add a paid dependency without disclosing cost — has been honored for WhatsApp (§9.1 above) and for hosting/SMTP (see [01-architecture-and-tech-stack.md](./01-architecture-and-tech-stack.md)). |
| 14 | Out-of-scope/future (performances, competition teams, costume rentals, rehearsals) correctly excluded from MVP but data model shouldn't block adding them later | **Done** | Nothing in the current schema would need to be torn up to add these later; they're additive tables that would hang off Student/Class/Family the same way Expense and OtherIncome do today. |
| 15 | Definition of Done / acceptance test | **Done** | See §9.2 — every individual capability the checklist names exists in code, has automated test coverage, and (except automated WhatsApp sending) is now proven end-to-end by a single scripted Playwright run (`npm run test:e2e`, `e2e/acceptance-flow.spec.ts`). |
| 16 | Deliverables (admin handoff doc, automation list, cost disclosure, sample-case testing) | **Partially done** | Cost disclosure: done (§9.1). Sample-case testing: the unit-test matrix in [08-testing-and-acceptance.md §8.1](./08-testing-and-acceptance.md#81-unit-tests-vitest--billing-engine) covers every case the doc lists (one-class, multi-class, siblings, seasonal flat-fee, mid-month enrollment, cancelled-session adjustment, partial/full payment) and those tests exist at `src/lib/billing.test.ts`. A written admin handoff walkthrough exists at [10-admin-flow-and-operations.md](./10-admin-flow-and-operations.md) (daily flow, sibling matching, billing finalization, refunds, reminders, WhatsApp setup). The one deliverable still outstanding is a *recorded video* walkthrough — that can't be produced from this coding environment and remains a manual, owner-side task; the written doc covers the same ground in text form. |

## 9.2 Definition-of-Done (§15) — line-by-line

The doc is explicit that "tables exist" is not completion; it defines completion as one scripted
flow succeeding end-to-end. Checking each line against what's actually built — and now verified by
the Playwright script 08-testing-and-acceptance.md §8.2 specs out, which exists at
`e2e/acceptance-flow.spec.ts` and passes end-to-end against a real server and database:

| Step | Built? |
|---|---|
| Parent submits registration form | Yes |
| Registration request stored | Yes |
| Correct family/student created or matched | Yes (admin-approval-gated, see §9.3) |
| Student enrolled in requested class | Yes, on approval |
| Class has correct fee for the selected month | Yes (`ClassMonthlyFee` get-or-create) |
| Every active student gets a monthly bill without admin retyping names | Yes (`generateMonthlyBilling`) |
| Applicable class fees pulled into the bill | Yes |
| 5% multi-class discount applies correctly | Yes, unit-tested |
| 5% sibling discount applies correctly | Yes, unit-tested |
| One-month adjustment without affecting future months | Yes |
| Final Amount Due clearly visible | Yes |
| Personalized parent/family message generated from billing data | Yes |
| **If WhatsApp enabled, message is sent and status/date recorded** | **No — manual `wa.me` link only** |
| Payment recorded once, linked to the bill | Yes |
| Amount Paid / Balance / Status update automatically | Yes |
| Admin opens current month and sees every active student incl. unpaid | Yes (billing workspace) |
| Payments contribute to income without duplicate entry | Yes |
| Expenses (e.g. rent) can be recorded | Yes, including delete and receipt upload |
| Monthly/yearly/all-time income, expenses, net profit calculate correctly | Yes, and unit-tested (`period.test.ts`) |

**Net: 18 of 19 acceptance-test lines are functionally built and now covered by an automated
end-to-end run.** The one real gap is automated WhatsApp sending. The "whole chain, one continuous
scripted test" requirement §15 frames completion around is no longer an open item — `npm run
test:e2e` runs it, covering everything in this table except the WhatsApp line (asserted instead as
the `wa.me`/"Copy Message" fallback producing correct text, matching what's actually shippable
today).

## 9.3 Gaps and rough edges found in the code itself

These aren't requirements-doc gaps — they're implementation loose ends worth a cleanup pass:

1. **`RegistrationRequest.processedByAdminId`** is defined but never set by the approve/reject
   actions — there's no audit trail of *which* admin actioned a registration, even though the field
   exists for exactly that.
2. **`RegistrationRequest.matchedStudentId`** is a plain string column, not a Prisma relation
   (unlike `matchedFamilyId`, which is a real relation) — an inconsistency worth fixing if that field
   is ever queried/joined rather than just displayed.
3. **Registration → enrollment is admin-approval-gated, not fully automatic.** The doc's §3.2
   wording ("Create Registration Request → find/create Family → find/create Student → create the
   Enrollment") reads as a straight-through pipeline. What's built requires an admin to open
   `/admin/registrations` and click Approve before the Family/Student/Enrollment rows are created.
   This is very likely the *right* call — a fully unattended pipeline would create real student
   records from spam/typo'd submissions with no human check — but it's worth confirming with the
   owner that "the programmer should work on the automation" meant *reliable*, not *unattended*.
4. **Vercel Blob (`BLOB_READ_WRITE_TOKEN`) isn't configured in local `.env` yet**, so logo upload and
   the new Expense receipt upload both throw at runtime until a real Blob store is linked and its
   token pulled in — see [01-architecture-and-tech-stack.md](./01-architecture-and-tech-stack.md).
   Not a code gap; an environment-setup step still outstanding.
5. **A large batch of work is sitting uncommitted in the working tree as of this writing** — the
   entire Playwright e2e suite (§8.2/§9.2), Expense/OtherIncome delete + receipt upload, the class
   capacity/`Expense.teacherId`/refund-policy/CSV-export changes in §9.4, and one Prisma migration
   (`20260907082608_add_class_capacity_and_expense_teacher`) all postdate the last commit
   (`7d066c2`, the Teacher module). Everything in this report has been verified directly against
   that working-tree state, not against `git log` — but it means none of it is on a shared branch
   yet, and a `git status`/`git diff` is worth a look before assuming this report matches what's
   deployed anywhere.

## 9.4 What the requirements doc doesn't account for

This is the section the doc itself can't be expected to cover, since it wasn't written by someone
running the day-to-day class schedule. Flagging these for a decision, not silently building them.

### Teacher / Instructor management — the doc's clearest blind spot (addressed 2026-09-07)

The doc lists "Teacher" as a single free-text field on the Class table (§4.3) and never mentions
teachers again — no teacher list, no pay tracking, no per-teacher schedule view. The build
originally matched the doc exactly: `Class.teacher` was a bare optional string, which meant "Priya,"
"Priya S.," and "Priya Sharma" could silently become three different "teachers" with no way to list
them, see their contact info, or aggregate what was paid to each one.

**Now built**: a proper `Teacher` table (name, email, phone, notes, active flag) with full CRUD at
`/admin/teachers` (§3.6a), and `Class.teacher` is a real relation — picked from a dropdown on the
Class form (with an inline "+ Add a new teacher" shortcut) instead of typed free text. The Teacher
detail page lists every class assigned to that teacher with its current enrollment count, so "what
does Teacher X teach" is a lookup, not a scan through the Classes list. A teacher's classes stay
intact if the teacher is later deactivated — deactivating only removes them from the picker for
*new* assignments.

**Now also built (2026-09-07)**: `Expense.teacherId` links an expense to a `Teacher` (optional,
picked from a select on the Expense form — not restricted to the `INSTRUCTOR_CHOREOGRAPHER`
category, since a teacher could reasonably be paid under another category too). The Teacher detail
page now has a "Payments to This Teacher" card listing linked expenses with a running total, so
"what did we pay Teacher X this year" is a lookup instead of a scan through expense notes.

### Other things worth a decision, lower priority than Teacher

- **Class capacity — decided: soft cap, no waitlist (2026-09-07).** `Class.capacity` is an optional
  field; the classes list, class detail page, and the "Add Enrollment" modal all show
  enrolled/capacity and warn once a class is full, but enrolling past capacity is still allowed —
  it's a heads-up for the admin, not a hard block, and there's no waitlist queue. Revisit only if a
  class actually fills up in practice and turning people away becomes a real scenario.
- **Refunds / negative payments — decided: negative adjustment with a note (2026-09-07).** This is
  now the documented policy, and the mechanism was fixed to actually support it: `setBillingAdjustment`
  previously refused to touch a bill once `status = PAID`, which blocked the one case a refund
  actually happens — a bill that's already been paid in full. That block is removed; a negative
  adjustment on a paid bill now correctly recomputes `status = OVERPAID` (the existing "we owe this
  family money back" signal), and the Adjustment modal explains this inline. A positive adjustment
  on a paid bill correctly reopens it (`UNPAID`/`PARTIAL`) instead of silently discarding the extra
  amount due.
- **Signed consent capture.** The registration form collects Studio Policy Agreement and
  Photo/Video Consent as checkboxes, matching the doc exactly. If the studio ever needs to *prove*
  a specific parent agreed (vs. just having a boolean on file), that's a bigger addition (timestamp
  + IP, or an actual e-signature) — not something to build speculatively, just worth knowing it's a
  boolean-only record today.
- **Data export/backup — decided: add CSV export (2026-09-07).** "Export CSV" buttons now exist on
  the Students page (full roster, ignoring the current search/page) and the Billing page (exactly
  what's on screen — respects the month and status filters). Generated client-side from data the
  page already has, no new server endpoint. Backups themselves still rely on the hosted Postgres
  provider's automated backups — nothing new needed there, this only covers the "I want a CSV to
  poke at in a spreadsheet" case.

## 9.5 Bottom line

Everything the requirements doc explicitly asks for is built and working **except automated
WhatsApp sending**, which is intentionally paused on an external prerequisite (Meta Business
verification) rather than unbuilt by oversight — and the cost disclosure the doc demands before
that work happens is already written up. The Expense/OtherIncome modules are now fully complete,
including delete and Expense receipt uploads (§9.1 row 11.2). The one gap this doc flagged in the
requirements themselves — no real model of Teachers — is now built (§9.4), including the
instructor-pay reporting link (`Expense.teacherId`) that was originally left as a follow-up. Of the
four lower-priority items §9.4 flagged for an owner decision, three are now decided and built
(class capacity, refund policy, CSV export); only signed-consent capture remains an open question,
and it's a "worth knowing" limitation rather than a blocker.
