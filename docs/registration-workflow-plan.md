# Registration Workflow Plan — Varsha Clarification

## Current workflow

1. The public form lists every active class, including its dance style, and requires the parent to
   choose one specific class.
2. Submission creates a pending registration and sends the registration-received email.
3. In Registration Requests, staff reviews family matching and clicks **Approve & Process**.
4. Approval creates or matches the family and student, immediately enrolls the student in the class
   selected by the parent, marks the request processed, and immediately attempts to send the
   enrollment-confirmation email.

## Workflow requested by Varsha

1. The public form lists only distinct dance styles/programs currently represented by active
   classes. Parents do not choose a level, batch, or specific class.
2. Submission remains pending and sends only the registration-received acknowledgement.
3. Staff reviews the request, evaluates the student, verifies the family match, and selects the
   final active class. The class remains the source of its own fee, so levels may share a fee today
   and use different fees later without changing registration.
4. Clicking **Finalize Enrollment** creates or matches the family/student, creates the enrollment in
   the staff-selected class, and marks the request processed. It does not email the parent.
5. The processed request shows a separate **Send Enrollment Email** action. A successful send is
   timestamped so staff can see that the confirmation was already sent and avoid accidental repeats.

## Compatibility and data migration

- Existing registration requests keep their class association.
- Existing requests receive a dance style derived from their associated class where possible.
- Previously processed class registrations are marked as already notified at their processing time,
  reflecting the old workflow and preventing an accidental duplicate email.
- Imported historical requests without a class remain viewable but cannot send an enrollment email
  until they have an assigned enrollment through the appropriate admin workflow.

## Verification

- Validate style-only public submission and acknowledgement email variables.
- Validate staff-selected class enrollment and inactive-class rejection.
- Prove finalization does not send an email.
- Validate manual enrollment-email sending, failure behavior, and sent timestamp.
- Run focused tests, full TypeScript checking, lint, and the existing automated test suite.
