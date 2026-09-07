# Using the studio management system

## Daily flow

1. Add teachers and classes, including each class's rate and pricing type (Regular or Seasonal —
   see "Regular vs. seasonal pricing" below).
2. Parents submit the public registration form. Review the pending request and its matching preview before approval.
3. Approval finds or creates the family and student, then enrolls the student. Existing active enrollment in that class is reused. Conflicting family contact matches require correction before approval. A student who joins partway through a month is only charged for that month's sessions from their start date onward — never the full month.
4. Generate monthly bills from Billing, or let the scheduled monthly job generate them. Review each class's monthly fee — override the billable session count on Class Monthly Fees for cancellations, holidays, or extra sessions.
5. **Finalize the month's class fees** on Class Monthly Fees before sending any notices — click Finalize on each row, or Finalize All for the month. This confirms the billable session counts are correct. Sending a fee notice, WhatsApp message, or payment reminder is blocked (with the affected classes named) until every class contributing to a bill is finalized; the scheduled cron sends simply skip not-yet-finalized bills and pick them up automatically once finalized. Editing a fee after finalizing clears the finalized flag, so it must be re-confirmed.
6. Send the combined family notice using email, WhatsApp, or the manual WhatsApp link.
7. Record each received payment against the relevant student's bill. A payment covering multiple students must be allocated across their bills.
8. Check outstanding balances and financial reports. Tuition income comes from payments received, with returned money deducted on its refund date.

## Regular vs. seasonal pricing

A Regular class bills every month an enrollment overlaps it, prorated to the sessions actually
falling within the student's enrolled dates that month. A Seasonal/special-program class (e.g. a
one-time recital or workshop) bills its flat fee exactly once — the first month the enrollment
overlaps — and is never recreated on a later month's run even though the enrollment itself has no
end date. Seasonal charges are also always excluded from the sibling and multi-class discounts,
regardless of the class's own discount-eligible setting — they never inflate the amount either
discount is calculated from, and never receive a discount themselves.

## How siblings are identified

Students are treated as siblings for billing when they belong to the same Family record. Their surnames do not determine the discount, and there is no separate biological-relationship check.

On registration approval, the app compares the parent's phone or email with existing families. Phone formatting is normalized (a 10-digit number is treated as a US number); email matching ignores capitalization and surrounding spaces. If both contacts point to different families, or several families match, approval stops for review instead of choosing one arbitrarily.

Within the matched family, the student's name is checked without regard to capitalization. A different student name creates another student in that family. An existing name reuses that student.

The sibling discount applies when at least two active students in the same family each have an enrollment overlapping the billed month. An enrollment ending later still counts for its earlier months. A sibling with no enrollment during the selected month does not qualify. Each qualifying student's sibling discount is applied after the multi-class discount; the default is 5%, adjustable in Settings.

Example: Nia and Leia share one Family record and both have September enrollments. Both qualify. A $100 fee becomes $95 if there is no multi-class discount. If Leia has no September enrollment, Nia does not receive a sibling discount merely because Leia is listed in the family.

If a parent uses entirely different contact details for a second child, the app cannot infer that the children belong together. Review the matching preview, correct the family contacts, or assign both students to the same Family in the admin app. Two different children with exactly the same name in one family also need manual review.

## Correcting fees and returning money

An adjustment changes what is owed for one bill. It does not record cash movement.

For a $100 bill already paid in full, a -$20 adjustment creates a $20 credit and marks the bill Overpaid. Return the money using the chosen payment method, then select Record Refund and enter $20, the return date, and a reason. The bill's net paid amount becomes $80 and its balance becomes zero. Financial reports deduct $20 on the return date. Partial refunds are supported; the remaining credit stays visible.

The app prevents refunds above the collected overpayment. Refunds do not alter the original payment record or become a separate expense, which would count the return twice.

## Reminders

Scheduled reminders include only unpaid or partially paid bills whose configured reminder date has arrived. They show the remaining balance. A successful reminder is sent once per bill; unsuccessful attempts stay eligible for a later scheduled run.

The Send Payment Reminder button in the family notification window explicitly sends another reminder for eligible overdue bills. Use it to retry older failures, including failures that the previous version had mistakenly marked as already reminded. It will not remind paid bills or bills that have not reached the reminder date.

## WhatsApp deployment setup

The sender is implemented, but live delivery must be verified using the studio's Meta account. No real parent messages were sent during development verification.

- Save the Phone Number ID and access token in Settings → Integrations. The token remains encrypted in storage.
- Configure `WHATSAPP_GRAPH_API_VERSION` in the deployment environment to a version supported by the Meta app, such as the version shown in its API setup panel. No version is assumed when this value is missing.
- `WHATSAPP_TEMPLATE_LANGUAGE` defaults to `en_US`; it must match the approved templates.
- Create approved templates named `monthly_fee_notice` and `payment_reminder`. Both use three positional text body parameters, in this order: parent's first name, month label, student fee summary. The reminder summary contains remaining balances. Parameters are flattened to a single line for the template request.
- Suggested monthly template body: `Hi {{1}}, your {{2}} dance fees are: {{3}}. Please send payment when convenient. Thank you!`
- Suggested reminder body: `Hi {{1}}, a reminder about your outstanding {{2}} dance fees: {{3}}. Thank you!`
- Set `WHATSAPP_AUTOMATION_ENABLED=true` only when ready to enable scheduled WhatsApp notices and reminders. Without it, the monthly job generates bills and the daily reminder job uses email. The explicit Send WhatsApp button is available independently of scheduled sending.
- The first-of-month job sends pending family notices after generating bills when enabled. Failed monthly notices remain unsent and can be retried from the family notification window or by rerunning the protected monthly job. The daily job retries failed payment reminders.

The sender stores Meta's message reference on accepted requests and records failures. An accepted request is not a delivery/read receipt; delivery webhooks are not implemented in this change. If a network timeout makes the send outcome uncertain, check Meta before manually retrying.

Template request format follows [Meta's Cloud API reference](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text). See the Meta account's current pricing before enabling scheduled sending; the older cost estimates in the original plan have not been revalidated in this work.
