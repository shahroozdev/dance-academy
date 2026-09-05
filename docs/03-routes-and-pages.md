# 3. Routes & Pages

Two audiences: the **public** (parents, unauthenticated) and the **admin** (studio owner + optional
staff, authenticated via Auth.js). All `/admin/*` pages and `/api/admin/*` routes are gated by
middleware that checks for a valid session and redirects to `/admin/login` otherwise.

## 3.1 Route map

| Route | Access | Purpose |
|---|---|---|
| `/register` | Public | Registration form (§3.1) |
| `/register/thank-you` | Public | Confirmation screen after submit |
| `/admin/login` | Public | Admin sign-in |
| `/admin` | Admin | Dashboard / KPI home (§12) |
| `/admin/registrations` | Admin | Pending registration requests queue |
| `/admin/registrations/[id]` | Admin | Review one request, approve/reject/edit-then-approve |
| `/admin/families` | Admin | Family list, search/filter |
| `/admin/families/new` | Admin | Create family manually |
| `/admin/families/[id]` | Admin | Family detail: contact info, linked students, family billing summary |
| `/admin/families/[id]/edit` | Admin | Edit family |
| `/admin/students` | Admin | Student list, search/filter (active/inactive, by class, by family) |
| `/admin/students/new` | Admin | Create student manually |
| `/admin/students/[id]` | Admin | Student detail: profile, active enrollments, billing history, notes |
| `/admin/students/[id]/edit` | Admin | Edit student |
| `/admin/classes` | Admin | Class list |
| `/admin/classes/new` | Admin | Create class |
| `/admin/classes/[id]` | Admin | Class detail: schedule, pricing, monthly fee history |
| `/admin/classes/[id]/edit` | Admin | Edit class (does not touch historical fees) |
| `/admin/classes/[id]/roster` | Admin | Class-based students view (§4.5) — who's enrolled, count |
| `/admin/class-fees` | Admin | All Class Monthly Fees, filterable by month/class |
| `/admin/class-fees/[id]/edit` | Admin | Override a specific month's fee for a class |
| `/admin/billing` | Admin | **Monthly Student Billing workspace** — the core operational page |
| `/admin/billing/[id]` | Admin | One student's bill: full breakdown, payments, notification history |
| `/admin/payments` | Admin | Payment list, search/filter |
| `/admin/payments/new` | Admin | Record a payment (usually opened from a billing row) |
| `/admin/notifications` | Admin | Notification log, resend/reminder controls |
| `/admin/expenses` | Admin | Expense list, filter by category/date |
| `/admin/expenses/new` | Admin | Add expense |
| `/admin/expenses/[id]/edit` | Admin | Edit expense |
| `/admin/income/other` | Admin | Non-tuition income (workshops, registration fees, etc.) |
| `/admin/income/other/new` | Admin | Add other income entry |
| `/admin/reports/financials` | Admin | Monthly/Yearly/All-time income–expense–profit dashboard (§11.3) |
| `/admin/settings` | Admin | Discount %, WhatsApp templates, admin users, business profile |

Most of what this section originally planned as `/api/admin/...` Route Handlers is implemented
instead as server actions (`src/actions/*`) called through `queryRegistry`/`mutationRegistry` (see
[useQuery](../src/hooks/useQuery.ts)/[useMutate](../src/hooks/useMutate.ts)) — there is no literal
`/api/admin/*` route for most of these; the row exists to document the operation, not a URL.
Actual HTTP route handlers exist only where something outside the Next.js request/response cycle
needs to call in — public form submission, cron, and future webhooks:

| API route | Purpose |
|---|---|
| `POST /api/public/register` | Public form submission → creates `RegistrationRequest` |
| — `approveRegistrationRequest` (action) | Find-or-create Family/Student, create Enrollment |
| — `generateMonthlyBilling` (action) | Manual "Generate bills for month X" trigger |
| — `recalculateBilling` (action) | Recompute one bill (before payments exist) |
| — `setBillingAdjustment` (action) | Set one-month adjustment + note |
| — `sendFamilyNotificationEmail` (action) | Send notification for this bill's family (email today; WhatsApp via manual `wa.me` link) |
| — `markFamilyNotificationSent` (action) | Record a manual/bulk send in `NotificationLog` |
| — `createPayment` (action) | Record a payment, recompute paid/balance/status on its bill |
| — `getFinancialSummary`/`getMonthlyTrend` (actions) | Aggregated income/expense/profit for a given period |
| `POST/GET /api/cron/generate-monthly-billing` | **Implemented.** Scheduled (see `vercel.json`) — calls `generateMonthlyBilling` for the current month, idempotent (§4.5), secured by `CRON_SECRET` |
| `POST/GET /api/cron/send-payment-reminders` | **Implemented.** Scheduled daily — calls `sendPaymentReminders` (§5.4), secured by `CRON_SECRET` |
| `POST /api/webhooks/whatsapp` | Not yet implemented — no automated WhatsApp Cloud API send exists yet to have delivery status for |
| `POST/GET /api/auth/[...nextauth]` | Auth.js session handling |

---

## 3.2 Public pages

### `/register`
Implements requirement §3.1 exactly, one student + one requested class per submission (the doc's
"preferred MVP rule" for automation reliability — a parent enrolling two children submits the form
twice, or an admin can add the second enrollment manually). Fields, in form order:

1. Parent/Guardian Name *(required)*
2. Parent Email
3. Parent Phone *(required — this is the WhatsApp contact)*
4. Student Full Name *(required)*
5. Date of Birth *(required)*
6. Gender
7. Requested Class *(dropdown of active `Class` records, required)*
8. Previous Dance Experience *(textarea)*
9. Emergency Contact Name *(required)*
10. Emergency Contact Relationship *(required)*
11. Emergency Phone *(required)*
12. Studio Policy Agreement *(checkbox, required, must be checked to submit)*
13. Photo/Video Consent *(checkbox, optional)*

Validation: shared zod schema (`registrationFormSchema`) used both client-side (react-hook-form)
and server-side in the API route — never trust client validation alone. On submit: `POST
/api/public/register`, which only ever writes a `RegistrationRequest` row (status `PENDING`) — it
does **not** touch Family/Student/Enrollment directly. That happens on admin approval (§3.4 below),
which keeps the public endpoint simple and safe from bad/duplicate data leaking into core tables.

### `/register/thank-you`
Static confirmation ("Thanks — we'll be in touch to confirm your class placement").

---

## 3.3 Admin dashboard — `/admin`

The single screen the owner should be able to glance at every morning. Cards/sections, all reading
from `MonthlyStudentBilling` + `Payment` + `Expense` for the **current calendar month** unless noted:

- **Current month's total tuition due** — `SUM(finalAmountDue)` across all bills for this month.
- **Current month's amount collected** — `SUM(amountPaid)` for this month's bills.
- **Current month's outstanding balance** — `SUM(balance)` for this month's bills.
- **Active student count** — `COUNT(Student WHERE isActive)`.
- **Unpaid / partially paid students** — count + a short list, each linking to `/admin/billing/[id]`.
- **Class rosters** — quick counts per class, linking to `/admin/classes/[id]/roster`.
- **This month / this year / all-time income · expenses · profit** — three compact stat rows,
  each linking through to `/admin/reports/financials` pre-filtered to that period.
- **Pending registrations** badge/count — links to `/admin/registrations`.

This page directly satisfies requirement §12 line-by-line.

---

## 3.4 Registrations — `/admin/registrations`, `/admin/registrations/[id]`

**List page**: table of `PENDING` requests (newest first), columns: Submitted date, Parent name,
Student name, Requested class, Phone. Row click → detail.

**Detail page** (`/admin/registrations/[id]`): shows every submitted field, plus a **match panel**
implementing the automation from §3.2 of the requirements:

1. **Find-or-create Family** — searches existing families by phone (primary) and email
   (secondary/fuzzy) and shows candidate matches; admin picks "this is an existing family" or
   "create new family."
2. **Find-or-create Student** — within the chosen family, searches by name + DOB; admin confirms
   "existing student" or "create new student."
3. **Create Enrollment** — for the requested class, with a start date defaulting to today
   (editable).
4. On confirm: `POST /api/admin/registrations/[id]/approve` performs all three writes in a single
   Prisma transaction, sets `RegistrationRequest.status = PROCESSED`, and links
   `matchedFamilyId`/`matchedStudentId`.

A **Reject** action is also available (e.g. duplicate/spam submission), setting status `REJECTED`
with an optional note — nothing else is written.

This is the piece the doc flags as previously broken ("automation went missing," §3.2) — it is
rebuilt here as an explicit, auditable, two-click admin action rather than a black-box automation,
so it can never silently fail without the admin noticing (the request just sits in the queue).

---

## 3.5 Families — `/admin/families*`

**List**: search by name/phone/email, filter Active/Inactive, columns: Family Name, Parent Name,
Phone, # Active Students, Active/Inactive toggle.

**Detail** (`/admin/families/[id]`): contact info; table of linked students (name, active classes,
current month status chip Paid/Partial/Unpaid); "Family Total Due This Month" rollup (feeds the
combined WhatsApp message, §9); Active/Inactive toggle (inactive hides from billing generation).

---

## 3.6 Students — `/admin/students*`

**List**: search + filters (Active/Inactive, by Class, by Family). Columns: Name, Family, Active
Classes (chips), Current Month Status.

**Detail** (`/admin/students/[id]`): profile fields from §4.2 (Name, Family, DOB, Age computed
from DOB, Gender, Join Date, Active/Inactive, Medical/Allergy Notes, General Notes); **Active
Enrollments** panel (class name, day/time, start date, "End enrollment" action); **Billing
History** panel — every past `MonthlyStudentBilling` row for this student with Final Amount Due
and Status, linking to `/admin/billing/[id]`.

---

## 3.7 Classes — `/admin/classes*`

**List**: Name, Dance Style, Level, Teacher, Day/Time, Standard Rate, Pricing Type, Active/Inactive,
current enrolled count.

**Create/Edit**: all §4.3 fields — Class Name, Dance Style, Level, Teacher, Day, Start/End Time,
Duration, Standard Rate, Pricing Type (Regular/Seasonal), Active/Inactive, plus
`discountEligible` (defaults on; turned off for one-off seasonal programs like "Onam Dance 2026"
that shouldn't count toward the multi-class discount). Editing the standard rate here **never**
touches already-generated `ClassMonthlyFee` rows (§5) — it only affects fee generation for future
months.

**Roster view** (`/admin/classes/[id]/roster`, §4.5): read-only list of currently-enrolled
students for this class, generated live from `Enrollment WHERE classId = X AND status = ACTIVE` —
never a manually maintained list. Header shows the count. This exists purely for headcount
checking, explicitly not for attendance (attendance stays in the separate Stackby template per the
doc).

---

## 3.8 Class Monthly Fees — `/admin/class-fees*`

**List**: filter by month and/or class. Columns: Class, Month, Billable Sessions, Rate, Flat Fee,
Monthly Class Fee, Overridden (badge if `isOverridden`).

Rows are normally created automatically by the billing generation job (one per active class per
month, derived from the Class's standard rate and pricing type), never typed from scratch. The
**Edit** page lets the admin override a specific month (e.g., a cancelled session or a special
seasonal amount) — saving sets `isOverridden = true` and stores a note. Because
`MonthlyStudentBilling` line items snapshot the fee amount at generation time, overriding a fee
**after** bills were generated does not retroactively change those bills — the admin must use
"Regenerate" on the affected bills (only available before any payment has been recorded against
them) to pull in the new amount.

---

## 3.9 Monthly Student Billing — `/admin/billing` (the critical page, §6)

This is the page the whole system exists to make effortless, so its UX gets special attention.

**Top bar**: Month selector (defaults to current month) + a prominent **"Generate Bills for
[Month]"** button. Clicking it calls `POST /api/admin/billing/generate` which, for the selected
month, creates any missing `MonthlyStudentBilling` rows for every currently-active student with an
active enrollment covering that month (idempotent — never duplicates an existing row; see
[04-business-logic-billing-discounts.md](./04-business-logic-billing-discounts.md)).

**Avoiding "scrolling through 50 rows"** (the open question raised in the doc, §6): rather than one
long flat table, the page offers three complementary tools used together, not instead of each
other:

1. **Grouped-by-family, collapsible rows** — families with multiple students collapse into one
   row showing the family total, expandable to see each student's line; this alone cuts ~50
   student-rows down to ~30–35 family-rows for a studio this size.
2. **Fast filter bar** — Status (Unpaid/Partial/Paid/Overpaid — defaults to hiding fully Paid so
   the admin's default view is "what still needs attention"), Class, and a text search box
   (student or family name).
3. **Sticky summary header** — total due / total collected / total outstanding for the *currently
   filtered* set, so the admin doesn't need to scroll to the bottom to see totals change as they
   work through unpaid bills.

Table columns: Student, Family, Class Fees (sum), Multi-Class Disc., Sibling Disc., Adjustment,
**Final Amount Due** (bold, large), Paid, Balance, Status (colored chip), Notification status.

Row actions (inline, no page navigation needed for the common case): **Add/Edit Adjustment**
(opens a small modal — amount + required note, e.g. "-$20 — class cancelled Sept 14"), **Record
Payment** (opens payment modal), **Send Notification** (single-family WhatsApp send), **View
Detail** (→ `/admin/billing/[id]`).

Bulk actions: **Send Notifications for all Unsent** (queues WhatsApp sends for every bill in the
current filtered view with `notificationStatus = NOT_SENT`).

### `/admin/billing/[id]` — bill detail
Full audit view for one student/month: Student & Family header; every `MonthlyBillingLineItem`
(class name, class fee amount) that composed the base tuition; the calculation breakdown in the
exact order defined in [04](./04-business-logic-billing-discounts.md) (Base Tuition → Multi-Class
Discount → Sibling Discount → Adjustment → **Final Amount Due**); linked Payments list (date,
amount, method, reference) with a "Record Payment" button; Notification history (channel, status,
sent date, message text sent).

---

## 3.10 Payments — `/admin/payments*`

**List**: filter by date range, method, student/family; columns Date, Student, Family, Amount,
Method, Reference, linked Bill (month).

**New** (`/admin/payments/new`, or inline modal from a billing row): Payment Date, Monthly Bill
(searchable select, pre-filled when opened from a billing row), Amount, Method (Zelle/Cash/
Check/Other), Reference, Notes. On save: `Payment` row created, then the parent
`MonthlyStudentBilling.amountPaid`/`balance`/`status` are recomputed server-side in the same
transaction — never trust a client-sent balance.

---

## 3.11 Notifications — `/admin/notifications`

Log view of everything sent: Family, Month, Channel, Status (Sent/Failed/Not Sent), Sent Date,
message preview (click to expand full text), and for WhatsApp sends, delivery status if the
webhook has reported one. **Resend** action for any Failed row. A **"Send Reminders"** button
triggers `/api/cron/send-payment-reminders` on demand for bills still Unpaid/Partial past their due
date, in addition to it running automatically on schedule.

---

## 3.12 Expenses & Other Income — `/admin/expenses*`, `/admin/income/other*`

Standard CRUD list/create/edit screens per §11.2 fields (Date, Category, Description, Amount,
Payment Method, Notes, optional Receipt upload) and the §11.1 "Other Income" categories
(Registration fees, workshops/camps, performance fees, costume-related, private lessons, misc).
Both support date-range and category filtering, and both feed directly into the financial report.

---

## 3.13 Financial Dashboard — `/admin/reports/financials` (§11.3, §12)

Period selector: **Monthly / Yearly / All-Time**, plus a year dropdown (2026, 2027, ... — populated
dynamically from the data's earliest year to the current year + 1, so nothing needs to be created
per-year, satisfying the doc's explicit "without creating a new system each year" requirement).

Layout mirrors the doc's example summary table exactly:

| Line | Source |
|---|---|
| Tuition/Payments Collected | `SUM(Payment.amount)` where `Payment.paymentDate` falls in period |
| Other Income | `SUM(OtherIncome.amount)` where `date` falls in period, broken out by category on hover/expand |
| **TOTAL INCOME** | sum of the two above |
| Rent | `SUM(Expense.amount) WHERE category = STUDIO_RENT` |
| Costumes/Props | `SUM(Expense.amount) WHERE category IN (COSTUMES, JEWELRY_PROPS)` |
| Other Expenses | sum of all remaining `Expense` categories, expandable by category |
| **TOTAL EXPENSES** | sum of all expense categories |
| **NET PROFIT** | Total Income − Total Expenses |

A secondary chart (bar: income vs. expenses per month) gives an at-a-glance trend when Yearly is
selected.

---

## 3.14 Settings — `/admin/settings`

- **Discount rules**: Multi-Class Discount % and Sibling Discount % (default 5%/5%, editable —
  changes apply to future bill generation only, never retroactively).
- **Due date & reminders**: Due Day of Month (default 5) and Reminder Days After Due (default 7) —
  drives `/api/cron/send-payment-reminders` (§5.4).
- **Admin users**: invite/manage staff logins (Owner role can manage; Staff role cannot access
  Settings).
- **WhatsApp**: Phone Number ID / Business Account ID / Access Token, stored encrypted
  (`StudioSettings`, see [01-architecture-and-tech-stack.md](./01-architecture-and-tech-stack.md)) —
  connection status and template message preview/edit are still pending actual Cloud API send
  integration (subject to Meta's template approval process — see
  [05-notifications-whatsapp.md](./05-notifications-whatsapp.md)); fee notices/reminders today go
  out over email + a manual `wa.me` link.
- **Business profile**: studio name.
