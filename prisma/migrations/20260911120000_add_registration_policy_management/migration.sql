ALTER TABLE "StudioSettings"
ADD COLUMN "registrationPolicyTitle" TEXT NOT NULL DEFAULT 'Regular Class Guide — 2026–2027 Academic Year',
ADD COLUMN "registrationPolicyContent" TEXT NOT NULL DEFAULT $policy$Please Read First

Attendance & Pick-Up
Inform the instructor as soon as possible about an absence or delay. Students should arrive on time and must be picked up at the end of each class by a parent or authorized adult.

Practice at Home
A short 10–15 minute review a few times each week makes a meaningful difference.

Pay Tuition in Advance
Notify the instructor before the new month if payment will be delayed or the student is discontinuing.

Keep Malhaar Material Confidential
Do not share songs, choreography, class details, teaching material/videos, or any private studio information with friends or anyone outside of class.

Maintain a Respectful Environment
Gossip, bullying, comparisons, or negative comments about any child, instructor, or group are not tolerated.

Support a Focused Classroom
To help students stay engaged and build confidence, parents are asked to wait outside during class. Children who feel unsure at first will be supported with patience as they become comfortable over the first few classes.

Honor Confirmed Commitments
Once a student is confirmed for a performance, required rehearsals, arrival times, costumes, and instructions must be followed.

Respect Instructor Decisions and Studio Rules
Malhaar determines choreography, formations, costumes, props, stage placement, and presentation requirements.

Attendance, Class & Communication
• Students should be dressed appropriately, with hair secured and a labeled water bottle.
• No food, gum, toys, or unnecessary valuables in the dance area.
• Check parent-group messages regularly. Discuss individual concerns, fees, or absences privately with the instructor.
• Inform the instructor about injuries, allergies, or limitations.

Performances, Costumes & Media
• If performance opportunities arise during the session, details regarding participation, rehearsals, schedules, and arrival times will be communicated to families in advance.
• Performance, costume, jewelry, venue, photography, or workshop charges are separate and will be communicated in advance.
• Rented costumes, jewelry, and props must be handled carefully and returned on time using the provided instructions.
• Do not post or forward class, practice, rehearsal, or performance videos unless Malhaar gives permission.

Fees & Discounts
• $20 per scheduled class. Tuition is paid in advance before the month begins or by the communicated due date.
• A 5% multiple-class discount applies when one student is enrolled in two or more different classes.
• A 5% sibling discount applies to each sibling when siblings are enrolled. Eligible students may receive both discounts.$policy$,
ADD COLUMN "registrationPolicyAgreementLabel" TEXT NOT NULL DEFAULT 'I have read and agree to the studio''s policies and procedures.',
ADD COLUMN "registrationPolicyVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "RegistrationRequest"
ADD COLUMN "policyTitleSnapshot" TEXT,
ADD COLUMN "policyContentSnapshot" TEXT,
ADD COLUMN "policyAgreementLabelSnapshot" TEXT,
ADD COLUMN "policyVersion" INTEGER,
ADD COLUMN "policyAgreedAt" TIMESTAMP(3);
