# Updates Summary

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
