import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const dir = path.dirname(fileURLToPath(import.meta.url));
const logo = await fs.readFile(path.resolve(dir, "../../public/images/malhaar_dance_logo.png"));
const pages = [];
const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const p = text => `<p>${text}</p>`;
const steps = items => `<ol class="steps">${items.map(x => `<li>${x}</li>`).join("")}</ol>`;
const bullets = items => `<ul>${items.map(x => `<li>${x}</li>`).join("")}</ul>`;
const note = (title, text) => `<aside><strong>${title}</strong><p>${text}</p></aside>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const h = text => `<h3>${text}</h3>`;
const ref = (id, label) => `<a href="#${id}">${label}</a>`;
const cols = (left, right) => `<div class="columns"><div>${left}</div><div>${right}</div></div>`;
async function shot(name, caption, style = "") {
  const data = await fs.readFile(path.join(dir, "screenshots", `${name}.png`));
  return `<figure class="${style}"><img src="data:image/png;base64,${data.toString("base64")}" alt="${esc(caption)}"><figcaption>${caption}</figcaption></figure>`;
}
function page(id, section, title, subtitle, body) { pages.push({ id, section, title, subtitle, body }); }

page("cover", "CLIENT USER MANUAL", "Studio management,<br>step by step.", "Malhaar Dance Company", `
  <img class="cover-mark" src="data:image/png;base64,${logo.toString("base64")}" alt="Malhaar Dance Company logo">
  <div class="cover-rule"></div>
  <p class="cover-description">A practical guide to registrations, classes, monthly billing,<br>parent communications, and studio finances.</p>
  <div class="cover-flow"><span>Welcome</span><i>→</i><span>Enroll</span><i>→</i><span>Bill</span><i>→</i><span>Collect</span></div>
  <div class="cover-meta"><div><b>Prepared for</b><br>Studio owner &amp; authorized staff</div><div><b>Edition 1.0</b><br>08 September 2026</div></div>
  <p class="cover-small">OPERATIONS &amp; REFERENCE GUIDE · CLIENT COPY</p>`);

page("contents", "START HERE", "Contents", "Find a task quickly. Section titles and page references are clickable.", "CONTENTS");

page("getting-started", "01 · ACCESS", "Open the app & sign in", "Use the website address and account details supplied at handover.",
  await shot("login", "Figure 1. The admin sign-in screen.", "short") +
  steps(["Open the studio website in your browser and go to <b>/admin</b>. Bookmark this address for daily use.", "Enter your assigned <b>Email</b> and <b>Password</b>, then select <b>Sign in</b>. The Dashboard opens after a successful sign-in.", "If the session is no longer valid, sign in again. If the account is inactive or the password is not accepted, contact your studio administrator or implementation team.", "Select <b>Sign out</b> at the bottom of the sidebar when finished, especially on a shared computer."]) +
  table(["Who is using the app?", "Access"], [["Studio owner", "Daily operations and saving studio settings."], ["Authorized staff", "Day-to-day administration; saving settings is restricted to the owner."], ["Parents / guardians", "The public registration form at <b>/register</b>; no admin account is needed."]]) +
  note("Running the app day to day", "Use the hosted website supplied to you. Your implementation team handles hosting, technical startup, account setup, and recovery. No installation or developer commands are needed for normal studio work."));

page("dashboard", "02 · YOUR WORKSPACE", "Read the Dashboard", "Start here for a quick view of the current month.",
  await shot("dashboard", "Figure 2. Dashboard overview with tuition totals, student count, and charts.") +
  cols(h("What to check") + bullets(["<b>Tuition due:</b> charges for the current month.", "<b>Collected:</b> payments against the current month's bills.", "<b>Outstanding:</b> balances still showing on those bills.", "<b>Active students</b> and <b>Unpaid / Partial bills</b> identify follow-up work."]), h("How to navigate") + bullets(["Use the left sidebar to open each module.", "Use <b>Toggle Sidebar</b> when you need more workspace.", "Check the notification bell for pending requests, unsent bills, or recent sending failures.", "Use the report links for Monthly, Yearly, or All-time financial views."])) +
  note("Compare the same period", "Dashboard billing totals relate to the billed month. Financial Report measures cash received and spent by transaction date, so the two views may legitimately differ."));

page("teachers", "03 · SET UP PROGRAMS", "Add and manage teachers", "Create teachers before assigning them to classes.",
  await shot("teachers", "Figure 3. Teachers list: contact information, linked class count, and status.") +
  steps(["Choose <b>Teachers</b> in the sidebar, then open the add-teacher form.", "Enter the teacher's name and available contact information. Add useful notes, then save.", "Open a teacher from the list to view their details and associated classes. Use the edit action to correct information.", "When creating or editing a class, select the teacher from the <b>Teacher</b> dropdown."]) +
  note("Track instructor costs", "When recording an expense, choose the relevant teacher if appropriate. The teacher's detail page can then show payments recorded for that teacher. This records studio expenses; it does not run payroll."));

page("classes", "03 · SET UP PROGRAMS", "Manage the class catalogue", "Keep schedules, teachers, and prices current.",
  await shot("classes", "Figure 4. Classes list with style, teacher, schedule, rate, and enrollment count.") +
  steps(["Open <b>Classes</b> and search for an existing class before creating a new one.", "Open a class to review its details, current enrollments, and roster. Use the edit action for changes.", "Use the add-class action for a new program. Enter its schedule, teacher, and pricing details as shown on the next page.", "Use <b>Enrollments</b> to connect students to the class. Creating a class alone does not enroll students."]) +
  note("Capacity is advisory", "Capacity helps you see how full a class is. The enrollment form warns when it is full; the current app does not enforce a hard booking limit or maintain a waiting list."));

page("class-form", "03 · SET UP PROGRAMS", "Choose the correct class pricing", "The pricing type determines how the student is billed.",
  await shot("new-class", "Figure 5. Add Class form with teacher, schedule, rate, pricing type, and capacity.") +
  table(["Field / choice", "How to use it"], [["Class Name, Dance Style, Level", "Use a clear name that parents and staff will recognize."], ["Teacher, Day, Start / End Time", "Select the instructor and enter the normal weekly schedule."], ["Regular (per session)", "Standard Rate is the price of one session. Monthly charges use the billable sessions."], ["Seasonal (flat fee)", "Standard Rate is a one-time program fee, charged once per enrollment."], ["Capacity", "Optional advisory maximum; review warnings before enrolling."]]) +
  note("One month versus every month", "To correct a cancellation or extra session for a particular month, use <b>Class Fees</b>. To change the class's normal rate for future billing, edit the class. Seasonal charges do not receive multi-class or sibling discounts."));

page("families", "04 · PEOPLE", "Create and maintain families", "One family groups a parent's children and their fee notices.",
  await shot("families", "Figure 6. Families list showing parent contact details and student counts.") +
  steps(["Open <b>Families</b> and search first to avoid adding the same household twice.", "Use the add-family action. Enter <b>Family Name</b>, <b>Parent/Guardian Name</b>, phone, and other available contact details, then save.", "Open the family record to review its children and update contact information through the edit action.", "When adding a sibling, select the <b>same Family</b> on the student form."]) +
  note("Why family matching matters", "Sibling billing and combined parent messages use the family record. A shared surname is not enough. Registration approval matches parent phone or email; conflicting matches require review before approval."));

page("students", "04 · PEOPLE", "Add and update students", "Keep each student's family, contact, and class information together.",
  await shot("students", "Figure 7. Students list with family, active classes, and status.") +
  steps(["Open <b>Students</b> and search for the student first.", "Choose the add-student action. Enter <b>Student Name</b> and select the correct <b>Family</b>.", "Add date of birth, gender, relevant medical/allergy notes, general notes, and emergency contact details as available. Select <b>Create Student</b>.", "Open the student's record to review details and use its edit action for corrections.", "Add the student's class through <b>Enrollments</b>. Creating or importing a student alone does not assign a class."]) +
  note("Bringing in an existing roster?", `Use <b>Import CSV</b> for bulk student creation. See ${ref("csv", "Import and export spreadsheets")} for the template, matching rules, and limitations.`));

page("registration-form", "05 · PARENT REGISTRATION", "Share the registration form", "Parents submit a request; staff review it before enrollment.",
  cols(await shot("registration-form", "Figure 8. Public registration form.", "portrait"),
    steps(["Share the studio website's <b>/register</b> address with the parent. Staff can also open <b>Enrollment Form</b> from Enrollments.", "Ask the parent to complete their name, email, and phone; the student's information; and the requested class.", "Complete the emergency contact information and review the studio policy and photo/video consent choices.", "Select <b>Submit Registration</b> and wait for the confirmation screen.", "Staff review the request under <b>Registration Requests</b>. Submission alone does not mean the student has been enrolled."]) +
    note("Returning families", "Ask parents to use the same parent contact details for siblings. This helps the app identify their existing family.") +
    note("Email confirmation", "A registration acknowledgement can be emailed when email sending is configured. The on-screen submission confirmation remains the immediate result.")));

page("review-registration", "05 · PARENT REGISTRATION", "Review and process requests", "Verify the matching preview before approving.",
  cols(await shot("review-registration-focus", "Figure 9. Registration review and family/student matching preview.", "portrait"),
    steps(["Open <b>Registration Requests</b>. The <b>Pending</b> tab shows requests awaiting review.", "Select <b>Review</b>. Check the parent, student, requested class, emergency contact, and consent details.", "Read <b>On approval</b>: it explains whether the app will match an existing family/student or create a new one.", "If the details and match are correct, select <b>Approve &amp; Process</b>. The app creates or reuses the family and student and creates or reuses the class enrollment.", "Use <b>Processed</b> to review completed requests. Use <b>Reject</b> only after reviewing an unsuitable or duplicate request; rejected items appear under <b>Rejected</b>."]) +
    note("Unexpected match?", "Cancel the review and check the existing family contacts before proceeding. Conflicting phone/email matches are blocked. Ask the parent or implementation team to help resolve details that cannot be corrected in the current screen.")));

page("enrollments", "06 · ENROLLMENT", "Enroll a student in a class", "Enrollments connect students to the programs they attend.",
  await shot("enrollments", "Figure 10. Enrollments list with class, schedule, start date, and status.") +
  steps(["Choose <b>Enrollments → Add Enrollment</b>.", "Select the <b>Student</b> and <b>Class</b>. Check any capacity warning, then select <b>Create Enrollment</b>.", "Confirm the new enrollment appears with the correct student and class. Review the displayed start date because enrollment dates affect billing.", "When a student stops a class, select <b>End</b> on that enrollment and confirm <b>End Enrollment</b> only after checking the student and class."]) +
  note("Dates and duplicate enrollments", "The current add form selects a student and class; it does not offer a backdated start-date field. Ask your implementation team about historical corrections. The app prevents duplicate active enrollment in the same class, and ending an enrollment preserves its historical billing relevance."));

page("monthly-routine", "07 · MONTHLY BILLING", "Your monthly billing routine", "Follow this order before sending fees to parents.",
  `<div class="process">${["Confirm enrollments", "Generate bills", "Review class fees", "Recalculate & verify", "Finalize fees", "Notify & collect"].map((x,i)=>`<div><b>${String(i+1).padStart(2,"0")}</b><span>${x}</span></div>`).join("")}</div>` +
  steps(["Check active students, family groupings, and class enrollments. Resolve start/end-date issues before billing.", "Open <b>Billing</b>, select the intended month, and choose <b>Generate Bills for [month]</b>. This also creates the month's class-fee rows.", "Open <b>Class Fees</b> for the same month. Review sessions, rates, flat fees, and the monthly total. Save any necessary overrides.", "Return to affected bills and <b>Recalculate</b> those with no payments, or regenerate the month to update eligible unpaid records. Check discounts and adjustments.", "Return to <b>Class Fees</b> and select <b>Finalize</b> for each reviewed row, or <b>Finalize All for [month]</b>. Recheck the bill totals before sending.", "Send the combined family notice. As payments arrive, record each amount against the correct student's bill."]) +
  note("Do not skip the review", "Fee finalization confirms that the class-fee rows have been reviewed; it does not recalculate existing bills. Bills with recorded payments cannot be recalculated. Use a documented adjustment to correct those bills.") +
  note("Scheduled work", "Automatic bill generation and email reminders depend on the deployment configuration. Confirm activation with your implementation team. Continue checking the month manually rather than assuming a scheduled job succeeded."));

page("billing", "07 · MONTHLY BILLING", "Generate and find monthly bills", "Choose the month first, then use the status and search filters.",
  await shot("billing", "Figure 11. Billing workspace before any bills have been generated for the selected month.") +
  steps(["Select the billing month beside <b>Generate Bills for [month]</b>, then generate if bills have not yet been prepared.", "Read the result: created, updated, and skipped. Bills with recorded payments are skipped during regeneration.", "Use the <b>UNPAID</b>, <b>PARTIAL</b>, <b>PAID</b>, and <b>OVERPAID</b> buttons to show or hide each status. Paid bills are hidden by default.", "Search by student or family. Expand a family to see its student bill rows; select a student bill to inspect the calculation."]) +
  note("Totals and export follow the filters", "The Billing summary cards and <b>Export CSV</b> reflect the bills matching the current month, search, and status choices. Enable all statuses and clear search when you need the whole month.") +
  p("An empty list can mean no bills have been generated, the selected month is wrong, or filters exclude all records."));

page("class-fees", "07 · MONTHLY BILLING", "Review and finalize class fees", "Use month-specific overrides for cancellations or extra sessions.",
  await shot("class-fees", "Figure 12. Class Monthly Fees before generation creates this month's fee rows.") +
  steps(["Open <b>Class Fees</b> and choose the same month used in Billing. Fee rows appear after monthly bills are first generated.", "Select <b>Edit</b> on a class. Review <b>Billable Sessions</b>, <b>Rate ($)</b>, <b>Flat Fee ($)</b>, and <b>Monthly Class Fee ($)</b>.", "Enter the correct monthly total as well as the supporting session/rate values. Add a useful note and select <b>Save Override</b>.", "Recalculate affected bills that have no payments and verify the totals. Then finalize the reviewed fee rows."]) +
  note("Finalization has a scope", "Editing a fee clears its finalized status. Parent fee notices and reminders are blocked until all contributing class fees are finalized. <b>Finalize All</b> applies to the selected month, including rows hidden by the class filter."));

page("billing-examples", "07 · MONTHLY BILLING", "Understand the fee calculation", "Illustrative examples in USD; use the studio's saved discount policy.",
  p("A student's bill combines class charges, eligible discounts, and any one-month adjustment. The sibling discount is calculated after the multi-class discount. Seasonal and other ineligible charges are added without either discount.") +
  table(["Example: two eligible classes + a qualifying sibling", "Amount"], [["Regular class A: 4 sessions × $20", "$80.00"], ["Regular class B: 4 sessions × $25", "$100.00"], ["Eligible tuition subtotal", "$180.00"], ["Multi-class discount at 5%", "−$9.00"], ["Subtotal after multi-class discount", "$171.00"], ["Sibling discount at 5% of $171", "−$8.55"], ["Final amount due before adjustments", "<b>$162.45</b>"], ["Optional seasonal program, not discount eligible", "+$150.00"], ["Total including the seasonal program", "<b>$312.45</b>"]]) +
  cols(h("Multi-class and siblings") + p("At least two discount-eligible class charges qualify for the multi-class discount. Siblings must share one family; at least two active students in that family must have enrollment overlapping the billed month."), h("Partial months and seasonal fees") + p("Regular fees are prorated to the student's enrolled dates and scheduled sessions. A seasonal flat fee is charged once per enrollment, not again every month. Check individual bill details for the actual calculation.")) +
  note("Balance", "Balance = final amount due − net amount paid. For a $162.45 bill with a $100 payment, the remaining balance is $62.45. A negative balance represents a credit/overpayment."));

page("payments", "08 · PAYMENTS", "Record money received", "Record a payment only after the money has actually arrived.",
  await shot("payments", "Figure 13. Payments ledger before payments have been recorded.") +
  steps(["Open <b>Billing</b>, choose the month, expand the family, and find the student's bill. Select <b>Record Payment</b>.", "Check the student, billed month, and balance. Enter the amount received and the actual payment date.", "Choose the method: <b>Zelle</b>, <b>Cash</b>, <b>Check</b>, or <b>Other</b>. Record the reference or notes where available, then save.", "Verify the bill's paid amount, balance, and status. Open <b>Payments</b> to find the transaction using its date and method filters."]) +
  note("One transfer covering siblings", "Allocate the transfer across the relevant student bills. For example, a $180 transfer covering $100 for one child and $80 for another requires two payment entries. Do not record the full $180 against both bills.") +
  note("Recording is not collecting", "This app records payments; selecting a method does not charge a card, withdraw funds, or initiate a Zelle transfer."));

page("adjustments", "08 · PAYMENTS", "Correct charges and record refunds", "An adjustment changes what is owed; a refund records money returned.",
  h("Make a one-month adjustment") + steps(["Find the bill in <b>Billing</b> and select <b>Adjust</b>.", "Enter <b>Adjustment ($)</b>: positive adds a charge; negative reduces it. Write a clear <b>Note</b>.", "Select <b>Save Adjustment</b>, then review the final amount due and balance. This field is the bill's adjustment total: editing it replaces the previous adjustment amount."]) +
  h("Return an overpayment") + steps(["Confirm the credit balance. If reducing a previously paid fee, first save the appropriate negative adjustment.", "Return the money using the agreed payment method outside the app.", "Select <b>Record Refund</b> on the overpaid bill. Enter the amount returned, return date, method, and reason; save and verify the remaining balance."]) +
  table(["Worked example", "Result"], [["A $100 bill has been paid in full", "Paid $100; balance $0"], ["Save a −$20 adjustment", "Due $80; paid $100; credit $20; OVERPAID"], ["Return and record a $20 refund", "Due $80; net paid $80; balance $0; PAID"]]) +
  note("Keep the cash record correct", "Refunds cannot exceed the collected overpayment. Do not also enter a refund as an expense: the refund already reduces tuition income on its return date. A bill with any recorded payments cannot be recalculated; use an adjustment for a fee correction."));

page("parent-messages", "09 · PARENT COMMUNICATION", "Send a family fee notice", "Review the combined message and recipient before sending.",
  h("Open the family message") + p("From <b>Billing</b>, use the family's notification action, or open a pending family notification from <b>Notifications</b>. The <b>Send Notification</b> window shows the family contacts and a preview of the fee message.") +
  steps(["Confirm the selected month, family, contact details, and the fees for each child.", "If a finalization warning appears, review and finalize the named class fees first. Confirm that affected bills have also been recalculated where needed.", "Choose the sending method below and check the result before closing the window."]) +
  table(["Action", "What it does"], [["Copy Message", "Copies the preview for manual sending."], ["Open in WhatsApp", "Opens the wa.me link with the message prepared. Review the recipient and message, then press Send in WhatsApp."], ["Send Email", "Sends through the configured studio email service; shown when the family has an email address."], ["Mark as Sent", "Records a manually sent notice. It does not send a message by itself."], ["Send Payment Reminder", "Sends an email reminder for eligible overdue, unpaid/partial bills, using the remaining balance."]]) +
  note("Manual sending sequence", "Finalize and review the bills → copy/open the message → send it to the parent → return to the app and mark it sent. Do not mark a message sent if the external send failed.") +
  note("Check the WhatsApp conversation", "Opening the wa.me link prepares the message; you must press Send in WhatsApp. Check the conversation to confirm it was sent, then return to the app and select Mark as Sent."));

page("notifications", "09 · PARENT COMMUNICATION", "Review notifications and reminders", "Use the log to check what happened after a send attempt.",
  await shot("notifications", "Figure 14. Notifications page with the selected month, pending notices, and notification log.") +
  steps(["Open <b>Notifications</b> and select the relevant month under <b>Pending for</b>.", "Review pending family notices and open a message when ready to send.", "Check the <b>Notification Log</b> for send attempts and failures. Review family contact details and service configuration when a send fails.", "For overdue balances, use <b>Send Payment Reminder</b> in the family message window when a manual follow-up is appropriate."]) +
  note("Scheduled reminders", "When email scheduling is active, email reminders use the due-day and reminder-delay settings, and target unpaid or partially paid bills. Successful scheduled reminders are sent once per bill; failed attempts can remain eligible for retry. Unfinalized class fees prevent sending.") +
  p("No pending notices can mean that there are no bills for the month or that the existing bills have already been marked notified. Check Billing if you expected to see more families."));

page("expenses", "10 · STUDIO FINANCES", "Record studio expenses", "Capture what the studio spent and when it was paid.",
  await shot("expenses", "Figure 15. Expenses list with category, teacher, amount, and payment method.") +
  steps(["Open <b>Expenses</b> and select <b>Add Expense</b>.", "Enter the actual date, choose the category, and write a specific description.", "Enter the amount and payment method. Select a teacher when the payment relates to an instructor; add any notes and save.", "Use category and date filters to review spending. Select <b>Edit</b> beside an entry to correct it."]) +
  cols(h("Typical categories") + p("Studio rent, instructor/choreographer, costumes, jewelry/props, competition/event fees, advertising, software/subscriptions, music/editing, supplies, travel, and miscellaneous."), h("Before saving") + p("Check the payment date, amount, and category against the receipt. Keep the receipt in your studio's normal document storage. A teacher selection links the cost to that teacher's record.")));

page("other-income", "10 · STUDIO FINANCES", "Record other income", "Use this for receipts outside normal student bill payments.",
  await shot("income", "Figure 16. Other Income list with date, category, description, amount, and method.") +
  steps(["Choose <b>Other Income → Add Income</b>.", "Enter the receipt date and select a category such as Registration Fee, Workshop/Camp, Performance Fee, Costume Income, Private Lesson, or Miscellaneous.", "Enter a clear description, the amount received, payment method, and any notes; save.", "Review entries with date/category filters and use <b>Edit</b> when a correction is needed."]) +
  note("Avoid counting a receipt twice", "Money paid against a student bill belongs in <b>Record Payment</b>. If a workshop or seasonal charge is already on a student bill, record the receipt against that bill; do not also add the same receipt as Other Income."));

page("financial-report", "10 · STUDIO FINANCES", "Read the Financial Report", "Measure income, expenses, and net profit for a chosen period.",
  await shot("financial-report", "Figure 17. Financial Report with Monthly, Yearly, and All-Time views.") +
  steps(["Open <b>Financial Report</b>.", "Choose <b>Monthly</b> and a month, <b>Yearly</b> and a year, or <b>All-Time</b>.", "Read tuition/payments collected, other income, total income, total expenses, and net profit.", "Expand category breakdowns where offered. Use the yearly view to review the monthly trend."]) +
  table(["Figure", "Meaning"], [["Total income", "Tuition payments received, less recorded refunds, plus other income."], ["Total expenses", "Recorded studio expenses for the selected period."], ["Net profit", "Total income minus total expenses."]]) +
  note("Cash timing matters", "An August bill paid in September contributes to September's collected income. Outstanding bills are not yet cash income. Refunds reduce collected income in the period when the money was returned."));

page("appearance", "11 · OWNER SETTINGS", "Update branding and appearance", "The owner can save changes to the studio's presentation.",
  await shot("settings-appearance", "Figure 18. Settings → Appearance: theme, font size, studio logo, and name.") +
  steps(["Open <b>Settings → Appearance</b>.", "Choose the preset theme and font size, then select <b>Save Appearance</b>.", "Use <b>Upload Logo</b> to choose the studio logo. Supported files are PNG, JPEG, WebP, or SVG, up to 5 MB.", "Enter the studio name and select <b>Save Name</b>."]) +
  note("Check the saved result", "Appearance changes apply across the admin app. The studio's saved branding also contributes to the standard email presentation. Saving these settings requires the owner account."));

page("billing-settings", "11 · OWNER SETTINGS", "Set discounts and reminder timing", "Use decimal fractions when entering discount percentages.",
  await shot("settings-billing", "Figure 19. Settings → Billing: discount policy and reminder schedule.") +
  steps(["Open <b>Settings → Billing</b> as the owner.", "Enter the <b>Multi-Class Discount</b> and <b>Sibling Discount</b>. For 5%, enter <b>0.05</b>; for 10%, enter <b>0.10</b>. Choose <b>Save Discount Policy</b>.", "Set <b>Due Day of Month</b> and <b>Reminder Days After Due</b>, then choose <b>Save Reminder Settings</b>.", "Review an eligible bill after generation/recalculation to confirm the intended policy is reflected."]) +
  note("Existing bills", "Saving a policy does not automatically rewrite every existing bill. Recalculate eligible bills without payments when appropriate. Bills with recorded payments require a deliberate adjustment if a correction is needed.") +
  p("Reminder timing only results in automatic email sending when the scheduled email service is active and the month's class fees are finalized. To send a WhatsApp message, use Open in WhatsApp and send it yourself."));

page("integrations", "11 · OWNER SETTINGS", "Manage email sending", "Use the connection details supplied by your email administrator.",
  await shot("settings-integrations", "Figure 20. Settings → Integrations. Configured account values are concealed in this guide.") +
  steps(["Open <b>Settings → Integrations</b> as the owner.", "Enter the supplied SMTP Host, Port, User, Password, and From Address. Use the secure-connection setting specified for that account.", "Select <b>Save Email Settings</b>. Leaving the host blank disables email sending.", "A blank password field preserves an already stored password. Enter a replacement only when changing it."]) +
  note("Confirm email sending", "Ask the implementation team to verify email sending with an agreed test recipient before relying on parent notices.") +
  note("Send through WhatsApp", "In the family message window, select <b>Open in WhatsApp</b>. The wa.me link opens the prepared message. Check the recipient, send the message in WhatsApp, then return to the app and select <b>Mark as Sent</b>."));

page("email-templates", "11 · OWNER SETTINGS", "Edit email wording", "Change the message while retaining the studio's standard email layout.",
  await shot("settings-emails", "Figure 21. Settings → Email Templates with template selector, subject, body, and placeholders.") +
  steps(["Open <b>Settings → Email Templates</b> as the owner.", "Select the message: Registration Received, Enrollment Confirmed, Monthly Fee Notice, or Payment Reminder.", "Edit <b>Subject</b> and <b>Body</b>. Keep the exact placeholder names and double braces shown under that template, such as <b>{{parentName}}</b>.", "Choose <b>Save Template</b>. Use <b>Reset to Default</b> if you want to restore the standard wording for the selected template."]) +
  note("What changes", "The subject and body are editable. The surrounding branded header and footer are fixed. Each template has its own supported placeholders; use the list shown for the selected message.") +
  p("Read the saved message for tone, spelling, and clear payment instructions. These templates control email wording. Review WhatsApp messages separately in the family message preview before sending."));

page("csv", "12 · SPREADSHEETS", "Import and export spreadsheets", "Use the import template when bringing students into the app.",
  await shot("students", "Figure 22. Students page: Import CSV and Export CSV are available above the roster.", "short") + steps(["Open <b>Students → Import CSV</b>, then <b>Download CSV Template</b>.", "Replace the example row with your students. Keep the headings unchanged and save as CSV.", "Choose the file and review the preview/errors. Correct invalid rows before importing.", "Run the import and read the created, skipped, and error results. Check the roster and then add class enrollments separately."]) +
  table(["Template heading", "What to enter"], [["Student Name", "Required student name."], ["Family Name; Parent/Guardian Name", "Household and parent names, especially when creating a new family."], ["Parent Email; Parent Phone", "At least one contact for matching. A new family also needs the required parent/phone details."], ["Date of Birth; Gender; Status", "Use YYYY-MM-DD for dates; readable gender values; Active or Inactive."]]) +
  note("Matching and export scope", "Import matches families using parent phone/email and skips an existing student with the same name in that family. Conflicts are reported for review. Student export downloads the roster, rather than only the current search/page. Billing export follows the selected month and visible filters. The student export headings differ from the import template; do not re-upload an export unchanged."));

page("troubleshooting", "13 · HELP", "Solve common problems", "Check these items before asking for support.",
  table(["Problem", "What to do"], [["I cannot sign in / I am returned to login", "Check the website and assigned credentials. Sign in again after an expired session. Ask your administrator to confirm the account is active."], ["A Save or Create button is disabled", "Complete required fields and resolve displayed validation messages. Some settings forms require an actual change before Save becomes available."], ["A student or family looks duplicated", "Compare parent phone/email and family selection. Stop before approving another registration and ask for help resolving conflicting records."], ["No bills or class-fee rows appear", "Check the month. On Billing, clear search and enable all statuses. Generate that month's bills if they do not yet exist."], ["A paid bill has disappeared from Billing", "Enable the PAID status filter; it is hidden by default."], ["A fee notice is blocked", "Review and finalize each named class fee for the billed month, then verify the bill totals and retry."], ["The bill did not change after a fee edit", "The override does not automatically recalculate the bill. Recalculate if there are no payments; otherwise use a justified adjustment."], ["Recalculate is disabled", "The bill already has recorded payments. Preserve that history and use an adjustment for a fee correction."], ["A parent message did not send", "For WhatsApp, open the wa.me link, check the recipient, and press Send in WhatsApp. Check the conversation before retrying. For email, review the result/log and ask for help with email settings if needed."], ["CSV rows failed or were skipped", "Read each result, compare headings with the template, resolve contact matches, and correct only the rows that need attention."], ["Report totals differ from Billing", "Match the period and remember: financial reports use payment/refund dates; Billing groups amounts by the month billed."], ["The app will not load", "Check your connection and refresh once. If it persists, send the page name, time, and exact error to your implementation team."]]) +
  p("For support, include the action you attempted, selected month, relevant record name, and a screenshot of the error. Share personal details only through your agreed support channel; never include passwords."));

page("checklists", "APPENDIX A", "Printable operating checklists", "Use these during handover and routine studio work.",
  cols(h("Daily opening") + bullets(["☐ Sign in and review the Dashboard.", "☐ Check the notification bell.", "☐ Review pending registration requests.", "☐ Confirm family matching before approval.", "☐ Record payments actually received.", "☐ Follow up failed notices and overdue balances.", "☐ Sign out when finished."]),
    h("Monthly close / next month") + bullets(["☐ Confirm enrollments and class schedules.", "☐ Choose the intended billing month.", "☐ Generate bills and review the result.", "☐ Check class sessions/rates and overrides.", "☐ Recalculate eligible affected bills.", "☐ Review discounts and adjustments.", "☐ Finalize all reviewed class-fee rows.", "☐ Send and log family fee notices.", "☐ Allocate payments across student bills.", "☐ Review expenses and other income.", "☐ Reconcile the Financial Report.", "☐ Export the required roster/billing CSVs."])) +
  h("Handover details") + table(["Item", "Studio record"], [["Admin website address", "________________________________________"], ["Parent registration address", "________________________________________"], ["Studio owner / administrator", "________________________________________"], ["Implementation support contact", "________________________________________"], ["Email sending verified on", "________________________________________"], ["Automatic billing / email reminders confirmed", "________________________________________"], ["Open in WhatsApp manual sending checked", "________________________________________"]]) +
  note("Account recovery and backups", "Keep credentials in your chosen password manager. Agree account recovery, hosting support, and backup arrangements with your implementation team. CSV exports are useful working copies, not a complete system backup."));

page("glossary", "APPENDIX B", "Glossary and status reference", "A shared vocabulary for studio administration.",
  table(["Term", "Meaning"], [["Family", "The household record grouping parent contacts and students for combined messages and sibling billing."], ["Student", "An individual dancer attached to one family."], ["Enrollment", "A student's participation in a class, with dates and an active/ended status."], ["Regular class", "A class charged by billable session each month."], ["Seasonal class", "A flat-fee program charged once per enrollment; excluded from both discounts."], ["Class monthly fee", "A specific class's sessions/rate/total for one billing month."], ["Override", "A saved change to a class's fee for one month."], ["Finalized", "A class fee whose session count and fee have been reviewed and confirmed for sending notices."], ["Adjustment", "A one-month addition or reduction to a student's bill; not a cash transaction."], ["Amount paid", "Payments received against a bill, reduced by recorded refunds."], ["Balance", "Final amount due minus net paid. A negative figure is a credit."], ["UNPAID", "The bill still requires payment and has no positive net payment covering it."], ["PARTIAL", "Some money has been received and a positive balance remains."], ["PAID", "The balance is zero."], ["OVERPAID", "The bill has a credit balance because net paid exceeds the amount due."], ["Pending / Processed / Rejected", "Registration review states: awaiting review, completed processing, or declined."], ["Net profit", "Collected income plus other income, minus studio expenses, for the selected period."]]) +
  note("Edition notes", "This manual describes the app reviewed on 08 September 2026. Screenshots show the current studio demonstration records and some empty starting screens. Amounts in worked examples are illustrative. Configured email account values are concealed. Email sending should be checked at handover."));

page("index", "APPENDIX C", "Alphabetical index", "Select a topic to jump to its instructions.", "INDEX");

const getPage = id => pages.findIndex(x => x.id === id) + 1;
const topics = [
  ["Access & sign-in", "getting-started"], ["Adjustments", "adjustments"], ["Appearance", "appearance"], ["Automatic billing", "monthly-routine"],
  ["Balances & bill statuses", "glossary"], ["Billing examples", "billing-examples"], ["Billing month & filters", "billing"],
  ["Capacity", "classes"], ["Checklists", "checklists"], ["Class pricing", "class-form"], ["CSV import / export", "csv"],
  ["Dashboard", "dashboard"], ["Discount settings", "billing-settings"], ["Email connection", "integrations"], ["Email templates", "email-templates"],
  ["Ending enrollment", "enrollments"], ["Expenses", "expenses"], ["Families & siblings", "families"], ["Fee finalization", "class-fees"],
  ["Financial Report", "financial-report"], ["Handover details", "checklists"], ["Logo", "appearance"], ["Monthly routine", "monthly-routine"],
  ["Notifications & logs", "notifications"], ["Other Income", "other-income"], ["Parent registration", "registration-form"], ["Payments", "payments"],
  ["Recalculation", "class-fees"], ["Refunds", "adjustments"], ["Registration approval", "review-registration"], ["Reminders", "notifications"],
  ["Seasonal programs", "class-form"], ["Sign out", "getting-started"], ["Students", "students"], ["Support", "troubleshooting"],
  ["Teachers", "teachers"], ["WhatsApp", "parent-messages"],
];
const indexRows = topics.map(([label,id])=>`<a class="index-row" href="#${id}"><span>${label}</span><b>${getPage(id)}</b></a>`).join("");
pages.find(x=>x.id==="index").body = `<div class="index-grid">${indexRows}</div>` + note("Using this document", "Contents, alphabetical index entries, and in-text references link to their destinations. Page numbers use the PDF's physical page sequence, including the cover. Use your PDF reader's search to locate a button or field name.");
const contentsRows = pages.filter(x=>!["cover","contents"].includes(x.id)).map(x=>`<a class="toc-row" href="#${x.id}"><span>${x.title}</span><b>${getPage(x.id)}</b></a>`).join("");
pages.find(x=>x.id==="contents").body = `<div class="toc-grid">${contentsRows}</div>` + note("How to use the guide", "New to the app? Read pages 3–12, then use the monthly routine on page 13. Returning users can use the alphabetical index. Screenshots are real app captures; visible sample names, dates, and balances will differ from your daily records.");

const css = `
  @page { size:A4; margin:0; }
  * { box-sizing:border-box; }
  body { margin:0; color:#27232a; font-family:Arial, Helvetica, sans-serif; font-size:10.1pt; line-height:1.46; background:#e8e5e8; }
  .page { width:210mm; height:297mm; padding:15mm 17mm 17mm; margin:0 auto; background:white; position:relative; break-after:page; }
  .page:last-child { break-after:auto; }
  .running { display:flex; justify-content:space-between; color:#776d77; font-size:7.3pt; letter-spacing:1.2px; text-transform:uppercase; border-bottom:1px solid #e6dde3; padding-bottom:3mm; margin-bottom:6mm; }
  .section { color:#9b1b5e; font-size:8pt; font-weight:700; letter-spacing:1.5px; margin-bottom:2mm; }
  h1 { font-family:Georgia, 'Times New Roman', serif; font-weight:400; font-size:27pt; line-height:1.12; margin:0 0 2.5mm; letter-spacing:-.5px; }
  .subtitle { color:#766d76; margin:0 0 5mm; font-size:10pt; }
  h3 { font-size:11pt; margin:4mm 0 2mm; color:#76204f; }
  p { margin:2.4mm 0; }
  figure { margin:4mm 0; border:1px solid #e8e0e5; border-radius:2mm; padding:2mm; background:#fff; }
  figure img { width:100%; height:111mm; object-fit:contain; display:block; }
  figure.short img { height:77mm; }
  figure.portrait img { height:173mm; }
  figure.compact img { height:88mm; }
  figcaption { font-size:7.6pt; color:#766d76; padding:2mm 1mm 0; line-height:1.3; }
  .columns { display:grid; grid-template-columns:1fr 1fr; gap:6mm; align-items:start; }
  .columns figure { margin-top:0; }
  ul { padding-left:4.5mm; margin:2mm 0; }
  li { margin:0 0 2mm; padding-left:.5mm; }
  ol.steps { list-style:none; counter-reset:step; padding:0; margin:3mm 0; }
  .steps li { position:relative; padding-left:8mm; margin-bottom:3mm; }
  .steps li:before { counter-increment:step; content:counter(step); position:absolute; left:0; top:.3mm; width:5.4mm; height:5.4mm; line-height:5.4mm; text-align:center; background:#f5e5ef; color:#9b1b5e; border-radius:50%; font-size:8pt; font-weight:bold; }
  aside { border-left:3px solid #9b1b5e; background:#faf3f7; padding:3mm 4mm; margin:4mm 0; font-size:9pt; break-inside:avoid; }
  aside strong { color:#76204f; }
  aside p { margin:1mm 0 0; }
  table { width:100%; border-collapse:collapse; margin:3mm 0; font-size:9pt; line-height:1.36; }
  th { text-align:left; background:#76204f; color:white; padding:2.5mm 3mm; font-size:8.4pt; }
  td { padding:2.4mm 3mm; border-bottom:1px solid #e8e0e5; vertical-align:top; }
  tr:nth-child(even) td { background:#faf7f9; }
  td:first-child { width:36%; font-weight:500; }
  .footer { position:absolute; left:17mm; right:17mm; bottom:9mm; display:flex; justify-content:space-between; border-top:1px solid #e6dde3; padding-top:2.6mm; font-size:7.3pt; color:#847780; }
  a { color:#8b1b57; text-decoration:none; }
  .toc-grid { columns:2; column-gap:8mm; }
  .toc-row,.index-row { display:flex; justify-content:space-between; gap:3mm; padding:2.6mm 0; border-bottom:1px solid #eadfe6; break-inside:avoid; font-size:9.2pt; }
  .toc-row b,.index-row b { color:#9b1b5e; }
  .index-grid { columns:2; column-gap:9mm; }
  .index-row { padding:2.4mm 0; }
  .process { display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; margin:6mm 0; }
  .process div { background:#f8edf4; padding:4mm; display:flex; flex-direction:column; gap:2mm; }
  .process b { color:#b67195; font:23pt Georgia,serif; }
  .process span { font-size:9pt; font-weight:bold; }
  .cover { background:#fcf7fa; padding-top:24mm; }
  .cover .running { border:0; margin-bottom:20mm; }
  .cover .section { margin-top:8mm; }
  .cover h1 { font-size:43pt; max-width:170mm; line-height:1.06; margin-top:7mm; }
  .cover .subtitle { font-size:17pt; color:#9b1b5e; margin-top:7mm; }
  .cover-mark { position:absolute; right:19mm; top:28mm; width:25mm; height:25mm; object-fit:contain; }
  .cover-rule { width:24mm; height:1mm; background:#c29b62; margin-top:12mm; }
  .cover-description { color:#70626c; font-size:12pt; margin-top:7mm; line-height:1.65; }
  .cover-flow { display:flex; gap:6mm; align-items:center; color:#8e315e; font-size:11pt; margin-top:18mm; }
  .cover-flow i { color:#ba9aae; font-style:normal; }
  .cover-meta { display:flex; gap:23mm; margin-top:26mm; font-size:10pt; color:#665662; line-height:1.7; }
  .cover-meta b { font-size:8pt; text-transform:uppercase; letter-spacing:1px; }
  .cover-small { margin-top:10mm; font-size:7pt; letter-spacing:1.7px; color:#a08596; }
  #troubleshooting table { font-size:9.2pt; }
  #troubleshooting td { padding:3mm; }
  #glossary td { padding:2.2mm 3mm; }
  @media screen { .page { margin:12px auto; box-shadow:0 2px 16px #0002; } }
`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Malhaar Dance Company — Client User Manual</title><meta name="author" content="Malhaar Dance Company"><style>${css}</style></head><body>${pages.map((x,i)=>`<section class="page ${i===0?"cover":""}" id="${x.id}"><div class="running"><span>Malhaar Dance Company</span><span>User manual · Edition 1.0</span></div><div class="section">${x.section}</div><h1>${x.title}</h1><p class="subtitle">${x.subtitle}</p><div class="body">${x.body}</div><footer class="footer"><span>Malhaar Dance Company · Client operations guide</span><span>${String(i+1).padStart(2,"0")} / ${pages.length}</span></footer></section>`).join("")}</body></html>`;
const htmlPath = path.join(dir,"Malhaar-Dance-Company-User-Manual.html");
await fs.writeFile(htmlPath,html);
const browser = await chromium.launch({ headless:true });
try {
  const tab = await browser.newPage({ viewport:{width:1000,height:1300},deviceScaleFactor:1 });
  await tab.goto(pathToFileURL(htmlPath).href);
  await tab.evaluate(()=>document.fonts.ready);
  await tab.emulateMedia({media:"print"});
  const validation = await tab.evaluate(()=>{
    const sections=[...document.querySelectorAll('.page')];
    return {
      pages:sections.length,
      brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,
      brokenLinks:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).length,
      overflow:sections.flatMap(s=>{
        const body=s.querySelector('.body').getBoundingClientRect();
        const footer=s.querySelector('.footer').getBoundingClientRect();
        return body.bottom>footer.top-8?[{id:s.id,excess:Math.round(body.bottom-footer.top+8)}]:[];
      }),
    };
  });
  await fs.writeFile(path.join(dir,"validation.json"),JSON.stringify(validation,null,2));
  console.warn(JSON.stringify(validation));
  if(validation.overflow.length||validation.brokenImages||validation.brokenLinks) throw new Error("Manual layout needs correction before PDF export.");
  await tab.pdf({path:path.join(dir,"Malhaar-Dance-Company-User-Manual.pdf"),format:"A4",printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
  await fs.mkdir(path.join(dir,"preview"),{recursive:true});
  for(const id of ["cover","contents","review-registration","billing-examples","csv","troubleshooting","index"]){
    await tab.locator(`#${id}`).screenshot({path:path.join(dir,"preview",`${id}.png`)});
  }
  console.warn(`Built ${pages.length}-page client manual.`);
} finally { await browser.close(); }
