# Updates Summary

## 2026-10-12

- Registration now completes safely when the email service is slow or unavailable instead of remaining stuck on “Submitting.”
- Final regression checks strengthened automatic cleanup so temporary acceptance-test records can be removed reliably after an interrupted run.

## 2026-10-11

- Student profiles and payment month choices now include the complete monthly history instead of stopping after a fixed number of months.
- Changing a class-month from no fee to a positive fee now also updates affected family bills that did not previously contain a line for that class.
- Monthly Class Counts now shows separately recorded extra rehearsals apart from regular classes and displays their combined total, preventing the same rehearsal from being counted twice.
- Monthly bill generation now skips unchanged existing bills, repairs inactive-class charges when needed, and safely creates only missing bills while retrying temporary database conflicts.

## 2026-10-09

- Student profiles now show a month-by-month billing ledger with the amount due, amount paid, remaining balance, and status for each month.
- Recording a payment now clearly identifies its billing month and lets staff choose a full remaining payment or a partial payment.
- Class Monthly Fees shows active classes by default, with an option to review all historical classes when needed.
- Deactivating a class now stops billing from the current month while preserving its earlier billing history.
- Existing unpaid bills are automatically corrected when an inactive class should no longer be charged, including bills whose previous total was zero.
- Seasonal fees can be repaired into their correct earlier month without a mistaken later charge blocking the correction.
- Added Monthly Class Counts, where teachers can record the number of classes actually held and add notes without directly changing parent bills.
- Teacher-reported counts remain pending until staff explicitly applies them from Class Monthly Fees; affected unpaid bills then recalculate automatically, while paid bills remain protected for review.
- Payment notes are now visible on the bill detail page to make month-specific payment history easier to understand.

## 2026-09-20

- Class-fee overrides now immediately update every affected unpaid bill, while paid bills remain protected and appear in the billing review queue.
- The manual billing-review page now loads its review filter correctly and shows a clear error instead of an empty list if billing records cannot be loaded.

- The notification bell now shows paid bills requiring manual review and current-month class fees awaiting finalization, so billing exceptions cannot remain hidden.
- When a paid bill is protected from automatic recalculation, Billing shows the exact reason and guides staff to adjust it or mark it reviewed when no adjustment is needed.
- Billing has a dedicated manual-review view across all months, and saving an adjustment automatically clears the related review alert.

## 2026-09-19

- Billing-impacting changes now automatically refresh affected unpaid bills after class-fee edits, no-class months, class or student breaks, enrollment date and status changes, extra rehearsals, registration approval, and First Class Date corrections. Bills with payments remain protected, and changed class-fee months require staff finalization again before parent notices.
- Added each class's First Class Date to the Classes list so staff can verify when billing begins without opening the class; corrected Bharatanatyam Beginner Elgin's saved September class fee to two sessions and $40.
- Classes now have an editable First Class Date. Billing excludes earlier months, counts only scheduled sessions from that date in the first month, and prevents a student’s first billable date from preceding the class itself.
- Existing classes inherit their earliest enrollment date as the first class date, while unused fee rows from earlier months are removed so new classes do not show misleading historical fees.
- The compact enrollment Actions menu now includes clear icons for every option, making each action faster to recognize.
- Enrollment rows now use one compact Actions menu for billing pauses, date correction, ending, re-enrollment, and accidental removal, making the table easier to scan.
- Modal titles now keep clear space around the close button, so longer headings wrap cleanly instead of appearing underneath the icon.
- Classes can now have summer-break or inactive month ranges scheduled in advance, so automatic billing excludes those months and resumes afterward without ending the class.
- Staff can add each additional rehearsal or performance session separately from the class profile before or after billing, with its date, per-session or hourly quantity, rate, calculated charge, and notes.
- Extra-session charges apply only to students whose enrollment includes the session date, and a seasonal program's one-time fee is not charged again when later rehearsals are added.
- The Enrollments page now has a Remove option for accidental enrollments. Connected unpaid bills are recalculated automatically, while enrollments connected to payments remain protected.
- Families can store multiple parents or guardians, while one contact is selected as the primary billing contact used by the existing notification workflow.
- Staff can combine a duplicate family into the correct existing family, preserving guardian contacts and registration history, moving all students, recalculating unpaid sibling discounts, and removing the empty duplicate.

## 2026-09-18

- Staff can mark an individual class as having no classes for a selected month, setting that class-month to zero sessions and $0 without deactivating the ongoing class.
- An enrollment can now be paused for one or more complete billing months while the student remains enrolled; billing resumes automatically after the selected end month.
- A paused student is excluded from class tuition and sibling-discount qualification only during the paused months.
- Class Monthly Fees now explains how to enter extra rehearsals and includes a session-count × rate calculator, while still allowing an exact one-month fee for hourly or differently priced rehearsals.
- Staff can recalculate every unpaid bill affected by a class-month change in one action, while bills with recorded payments remain protected.
- The individual bill adjustment form now clearly explains how to apply a one-student, one-month tuition exception without changing their ongoing enrollment.

## 2026-09-17

- Enrollment start and end boundaries are now stored as calendar dates without a time or timezone, preventing a browser or server location from changing which sessions are billed.
- Registration approval, manual enrollment, and enrollment correction now use a clearly identified First Billable Date. Guidance explains that sessions before it are excluded and sessions on or after it are billed.
- Existing enrollment timestamps are converted once to their previously displayed studio calendar dates, allowing affected September bills to calculate the first class correctly after recalculation.
- Enrollment dates now display consistently in enrollment lists, student profiles, class profiles, rosters, and the date-correction form.

## 2026-09-15

- Student and family profiles now include a permanent delete option for administrators. To prevent accidental removal, the exact name must be entered before deletion; deleting a family also clearly warns that all connected students and history will be removed.
- Staff can now enter the student's actual class start date when adding an enrollment and correct it later from the Enrollments page, so late data entry still produces accurate mid-month billing.
- Enrollment date correction explains when to recalculate an affected unpaid bill and when to use a billing adjustment because payments already exist.

## 2026-09-11

- Registration Policies in Settings now provides a guided three-step editing experience, formatting help, clearer version information, and explicit explanations of previews, publishing, and restoring defaults.
- The registration form's policy area now appears as a polished Review & Consent step, with easier-to-scan policy cards and a clearly separated consent panel explaining which choice is required and which is optional.
- Parents now see the Regular Class Guide directly before the required studio-policy agreement on the registration form, beside it on larger screens and above it on smaller screens.
- Owners can edit the registration policy title, full policy text, and required agreement wording from a new Registration Policies section in Settings, with a live parent preview and an option to restore the supplied guide.
- Every new registration preserves the exact policy version and wording accepted by the parent, along with the agreement date and time, which staff can review later even after policies change.

## 2026-09-10

- Due Date & Payment Reminders now includes information icons explaining that bills are generated automatically on the first day of each month, how the due day is applied, and when the one-time overdue reminder is sent.
- Every staff notification switch in Settings now has an information icon explaining what triggers the alert, who it informs, and what the notification is for before the admin turns it on or off.
- Enrollment finalization now includes an enabled-by-default option to send the parent confirmation email immediately, with an information tooltip explaining that staff can turn it off and send later. If email delivery fails, the enrollment remains finalized and staff is guided to retry from Processed registrations.
- Registration review now has a searchable family picker that loads active families in small batches as staff scroll, keeping the review window fast even with thousands of family records.
- The Students list now shows both the student's original Joined Date and their automatically calculated Time with Malhaar; joining dates are kept consistent across time zones.
- Added a dedicated Dance Programs section where staff can manage parent-facing programs such as Bollywood and Bharatanatyam once, without creating duplicate program entries for every level.
- Every class now belongs to a Dance Program while keeping its own level, batch name, schedule, teacher, and fee, so different levels can use the same fee today and different fees in the future.
- The registration form now shows active Dance Programs that have an available class, and registration review only offers classes within the program selected by the parent.
- Existing class and registration dance-style information has been preserved and converted into the new Dance Programs structure.
- Student profiles and the Students list now automatically show each student's time with Malhaar in completed years and months, calculated from the original joining date.
- Staff can set or correct the original joining date when adding or editing a student, and CSV student imports/exports now include it.

## 2026-09-09

- The public registration form now asks parents only for a dance style or program; staff chooses the final level, batch, and class after evaluating the student.
- Registration review now includes the active-class assignment and clearly explains that finalizing creates the enrollment without emailing the parent.
- Enrollment confirmation is now a separate staff-controlled email action after finalization, and the registration list shows when it was sent.
- The enrollment-confirmation email no longer says that a monthly fee notice will be sent after billing is generated.

## 2026-09-08

- Tooltips now appear when hovering over icon-only buttons, table action buttons, and toolbar buttons across the admin — including the close button on pop-ups and side panels, the notification bell, and the Export/Import CSV buttons. Buttons that hide their label on smaller screens also show the tooltip at all sizes.

## 2026-09-08

- Registration review now lets staff link a child to an existing family when siblings use different parent contact details, with a matching preview before approval.
- The user manual now explains WhatsApp messaging through Open in WhatsApp (wa.me), sending the prepared message, and marking it sent.
- Admin pages now fit beside the sidebar without making the whole page scroll sideways; wide tables still scroll within their own area.
- The fee notification window no longer shows a direct WhatsApp send button while studio WhatsApp integration setup is unavailable. Staff can still open WhatsApp with the message prepared for manual sending.
- Settings now has a dedicated Notifications tab, with staff alerts grouped into Registration, Billing & Payments, Parent Communication, and System alerts. Billing Settings now contains only billing rules and payment timing.
- The Save Billing Alert button now stays visible while scrolling through the billing notification settings.
- **Monthly billing-ready email** — Billing Settings now lets you choose which staff email receives an alert after the automatic monthly billing run. The alert is on by default, can be turned off, and reminds staff to review and finalize class fees before notifying parents.
- **Parent notification confirmations** — Billing Settings can also email staff a checkmarked confirmation after a family fee notice is sent or manually marked as sent, showing the family, billing month, and delivery method. This confirmation is on by default and can be turned off.
- **Complete admin alert controls** — The same Billing Settings card now offers separate switches for new registrations, recorded payments, credits, automatic billing failures, failed parent notices, failed payment reminders, and class fees that still need finalization. Each alert goes only to the configured staff address, and every category can be turned off independently.

## 2026-09-08

- A client user manual is now available as a PDF, with page screenshots, step-by-step instructions, billing examples, troubleshooting, and printable checklists.
- Opening admin with an outdated or disabled sign-in now returns you to the login page instead of showing an error or getting stuck redirecting.

## 2026-09-07

- Admin operations now check that the user is signed in and still has access, and reject invalid submitted values.
- Recalculating an older bill keeps classes that the student attended during that month, even if the enrollment has since ended.
- Adding a student to the same active class twice is blocked, and monthly bills charge each class only once.
- Payment reminders show the remaining balance after partial payments; failed reminders can retry, with a manual reminder button for older failures.
- Overpaid bills now offer Record Refund to track money returned and update collected income on the refund date.
- Family matching now handles phone formatting and email capitalization, and flags conflicting family matches for review.
- Family notifications can now send through the studio's WhatsApp account once its credentials and approved templates are ready; scheduled sending can be enabled after setup.

- **New Teachers section** — Added a Teachers page to the admin sidebar. You can now keep a proper list of instructors with their contact info, and each teacher's page shows every class they teach and how many students are currently enrolled in each. Adding or editing a class now lets you pick the teacher from a dropdown instead of typing their name — this keeps one teacher's name consistent everywhere instead of it being typed slightly differently on different classes.

## 2026-09-05

- **Studio settings expanded** — The Settings page now lets you manage discount percentages, outbound email setup, and WhatsApp connection details yourself, without needing a developer to change any files.
- **Settings page reorganized into tabs** — Settings is now split into clear tabs (Appearance, Billing, Integrations, Email Templates) so related options are grouped together instead of one long page.
- **Theme color picker simplified** — Instead of picking three separate colors, you now choose from a set of ready-made color themes from a single dropdown.
- **Font size setting fixed** — Changing the app's font size in Settings now actually takes effect (previously it didn't visibly change anything).
- **Settings save button reliability fix** — Fixed an issue where re-selecting a value you'd previously saved could leave the Save button stuck disabled, making it look like the change wasn't accepted.
- **Automatic monthly billing** — Monthly student bills are now generated automatically at the start of each month, in addition to the existing manual "Generate Bills" button.
- **Automatic payment reminders** — Families with an unpaid or partially paid bill now automatically receive a one-time reminder email after their bill's due date passes; the due date and reminder timing are configurable in Settings.
- **Customizable email templates** — Added an Email Templates section in Settings where you can edit the wording of the four automatic emails (registration received, enrollment confirmed, monthly fee notice, and payment reminder). Every email keeps a consistent branded look — a colored header with your logo and a footer — while the message text itself is fully editable, with a "reset to default" option if you want to undo your changes. Pick which email to edit from a dropdown.
- **Stronger protection for sensitive settings** — Your email password and WhatsApp access token are now stored encrypted for extra security.
- **Notification bell in the header** — Added a bell icon at the top of the admin app with a badge showing how many things need your attention (pending registration requests, bills that haven't been sent to families yet, and recent failed email sends). Click it to see the breakdown and jump straight to the right page.
- **Fixed a crash when reviewing a registration request** — Opening a pending registration request that had a requested class attached could fail to load. Fixed.

## 2026-09-04

- **Families management** — Added the Families section to the admin sidebar. You can now view all families in a searchable list, create new families with parent/guardian details, view family profiles with linked students, edit family information, and activate or deactivate families.
- **Students management** — Added the Students section. You can now view all students across families, create new student profiles with date of birth and gender, view student details including active enrollments and recent billing history, edit student information, and activate or deactivate students.
- **Classes management** — Added the Classes section. You can now set up dance classes with style, level, teacher, schedule, and pricing (regular per-session or seasonal flat fee), view class details with enrolled students and monthly fee history, edit class information, and activate or deactivate classes.
- **Class roster view** — Added a dedicated roster page for each class showing all currently enrolled students with family and contact details.
- **Enrollments management** — Added the Enrollments section where you can view all enrollments, create new enrollments linking students to classes, and end active enrollments.
- **Error and not-found pages** — Added branded error and page-not-found screens that match the admin design.
