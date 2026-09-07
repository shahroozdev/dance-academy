# 9. Status Report & Gap Analysis (as of 2026-09-07)

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
| 11.2 | Expenses module (date, category, description, amount, method, notes, receipt) | **Mostly done** | Full CRUD except **delete** (create/update/list only) and the **receipt/attachment field exists in the schema but has no upload UI** wired to it — logo upload uses Vercel Blob already, so the same pattern is available but unused here. |
| 11.3 | Monthly/yearly/all-time income, expenses, net profit; historical years remain selectable without rebuilding the system | **Done** | `/admin/reports/financials` supports all three periods; `getAvailableYears()` means 2027, 2028, etc. appear automatically the first time they have any activity — no new-year setup step required. |
| 12 | Dashboard (current month due/collected/outstanding, active student count, unpaid/partial list, class rosters, monthly/yearly/all-time income-expenses-profit) | **Done** | All of it is present on the admin dashboard and financial reports pages, including a revenue trend chart, registration funnel, and billing-status breakdown (this last group is mid-build in the working tree right now — see §9.4). |
| 13 | Technology/cost discipline (reuse existing structures, disclose paid-service costs, avoid fragile automation) | **N/A under the approved pivot** | The Stackby-specific asks (troubleshoot "Link to Another Row" errors, reuse existing Stackby tables) don't apply post-pivot. The underlying *intent* — don't add a paid dependency without disclosing cost — has been honored for WhatsApp (§9.1 above) and for hosting/SMTP (see [01-architecture-and-tech-stack.md](./01-architecture-and-tech-stack.md)). |
| 14 | Out-of-scope/future (performances, competition teams, costume rentals, rehearsals) correctly excluded from MVP but data model shouldn't block adding them later | **Done** | Nothing in the current schema would need to be torn up to add these later; they're additive tables that would hang off Student/Class/Family the same way Expense and OtherIncome do today. |
| 15 | Definition of Done / acceptance test | **Mostly done, unverified end-to-end** | See §9.2 — every individual capability the checklist names exists in code and has *some* automated test coverage, but there is no single scripted run proving the full chain end-to-end yet. |
| 16 | Deliverables (admin handoff doc, automation list, cost disclosure, sample-case testing) | **Partially done** | Cost disclosure: done (§9.1). Sample-case testing: the unit-test matrix in [08-testing-and-acceptance.md §8.1](./08-testing-and-acceptance.md#81-unit-tests-vitest--billing-engine) covers every case the doc lists (one-class, multi-class, siblings, seasonal flat-fee, cancelled-session adjustment, partial/full payment) and those tests exist at `src/lib/billing.test.ts`. A written admin handoff walkthrough (how to add a class, change a fee, register a student, etc.) does not appear to exist yet as a standalone document. |

## 9.2 Definition-of-Done (§15) — line-by-line

The doc is explicit that "tables exist" is not completion; it defines completion as one scripted
flow succeeding end-to-end. Checking each line against what's actually built (not against the test
*plan* in 08-testing-and-acceptance.md, which describes an intended Playwright script that doesn't
exist in the repo yet — no `playwright` config or e2e spec files were found):

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
| Expenses (e.g. rent) can be recorded | Yes (no delete yet — see §9.1 row 11.2) |
| Monthly/yearly/all-time income, expenses, net profit calculate correctly | Yes, and unit-tested (`period.test.ts`) |

**Net: 17 of 19 acceptance-test lines are functionally built.** The one real gap is automated
WhatsApp sending. The other open item is process, not code: nobody has run the *whole chain* as one
continuous scripted test the way §15 frames it — that's worth doing once as a manual pass (or as
the Playwright script 08-testing-and-acceptance.md already specs out) before calling this "done"
in the doc's own terms.

## 9.3 Gaps and rough edges found in the code itself

These aren't requirements-doc gaps — they're implementation loose ends worth a cleanup pass:

1. **No delete action for `Expense` or `OtherIncome`.** Create/update/list only. A miskeyed expense
   entry currently can't be removed through the app.
2. **`Expense.receiptUrl`** is a schema field with no upload flow wired to it — dead field. The logo
   upload (Vercel Blob) already establishes the pattern that would fill this in.
3. **`RegistrationRequest.processedByAdminId`** is defined but never set by the approve/reject
   actions — there's no audit trail of *which* admin actioned a registration, even though the field
   exists for exactly that.
4. **`RegistrationRequest.matchedStudentId`** is a plain string column, not a Prisma relation
   (unlike `matchedFamilyId`, which is a real relation) — an inconsistency worth fixing if that field
   is ever queried/joined rather than just displayed.
5. **Registration → enrollment is admin-approval-gated, not fully automatic.** The doc's §3.2
   wording ("Create Registration Request → find/create Family → find/create Student → create the
   Enrollment") reads as a straight-through pipeline. What's built requires an admin to open
   `/admin/registrations` and click Approve before the Family/Student/Enrollment rows are created.
   This is very likely the *right* call — a fully unattended pipeline would create real student
   records from spam/typo'd submissions with no human check — but it's worth confirming with the
   owner that "the programmer should work on the automation" meant *reliable*, not *unattended*.
6. **No Playwright/e2e test suite exists yet**, despite one being fully specified in
   [08-testing-and-acceptance.md §8.2](./08-testing-and-acceptance.md#82-end-to-end-test-playwright--full-acceptance-flow).
   Unit tests for the billing/discount/notification-text engine do exist and pass.
7. **Dashboard charts are mid-build in the working tree right now** (uncommitted changes to
   `dashboard.ts`, the admin dashboard page, and a new `src/components/charts/` directory add a
   revenue-trend chart, registration funnel, and billing-status breakdown). Not a gap, just worth
   flagging as in-progress rather than shipped.

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

**Deliberately not done in this pass**: linking `Expense.teacherId` for instructor-pay tracking
(the `INSTRUCTOR_CHOREOGRAPHER` expense category still isn't tied to a specific teacher record, so
"what did we pay Teacher X this year" still requires reading expense notes). Left out to keep that
change scoped and reviewable on its own — flagged in `docs/current-tasks.md` as a fast-follow, not
dropped.

### Other things worth a decision, lower priority than Teacher

- **Class capacity / waitlist.** The doc never mentions a maximum class size. At ~50 students this
  may never matter, but if any class does fill up, there's currently no capacity field or waitlist
  concept — enrollment is unlimited by design.
- **Refunds / negative payments.** The doc's payment model is purely additive (payments reduce
  balance toward zero); `OVERPAID` status exists for when someone pays too much, but there's no
  explicit refund-recording flow distinct from a manual negative adjustment. Likely fine for an MVP,
  worth a one-line policy decision (probably: "record it as a negative adjustment with a note") so
  it's not reinvented ad hoc the first time it happens.
- **Signed consent capture.** The registration form collects Studio Policy Agreement and
  Photo/Video Consent as checkboxes, matching the doc exactly. If the studio ever needs to *prove*
  a specific parent agreed (vs. just having a boolean on file), that's a bigger addition (timestamp
  + IP, or an actual e-signature) — not something to build speculatively, just worth knowing it's a
  boolean-only record today.
- **Data export/backup.** Not mentioned in the doc at all. Worth a short answer for the owner (e.g.,
  "the hosted Postgres provider handles automated backups; ask if a manual CSV export of
  students/billing is also wanted") rather than leaving it fully unaddressed.

## 9.5 Bottom line

Everything the requirements doc explicitly asks for is built and working **except automated
WhatsApp sending**, which is intentionally paused on an external prerequisite (Meta Business
verification) rather than unbuilt by oversight — and the cost disclosure the doc demands before
that work happens is already written up. The Expense/OtherIncome modules are functionally complete
short of a delete action. The one gap this doc flagged in the requirements themselves — no real
model of Teachers — is now built (§9.4); the natural next step there is linking `Expense` to
`Teacher` for instructor-pay reporting, intentionally left for a follow-up change.
