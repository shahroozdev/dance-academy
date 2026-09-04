# 2. Database Schema (Prisma)

Design principles from the requirements doc, encoded directly into constraints:

- **One student + one class = one Enrollment row** (§4.4) — no attempt to fold enrollments into
  the Student table, because a student can have 1–N classes and rosters must be generated from
  enrollments, not typed manually (§4.4, §4.5).
- **Class Monthly Fee is a historical snapshot, never recalculated retroactively** (§5) — editing a
  Class's standard rate must never change a past month's stored fee.
- **Monthly Student Billing = exactly one row per (student, month)** (§6) — enforced with a unique
  constraint, not a convention.
- **Payments are additive and immutable** (§10) — Amount Paid/Balance/Status are always derived by
  summing linked Payment rows, never hand-edited.
- **Financial income is derived from actual Payments**, not from Billing due-amounts (§11.1) — the
  Expense/Income reporting layer reads `Payment.paymentDate`, never `MonthlyStudentBilling`.
- **Emergency contact fields live on `Student`, not just `RegistrationRequest`** — §3.1 collects
  them on the public form, but §4.1/§4.2's "minimum fields" lists omit them for Family/Student. That's
  a gap in the requirements doc, not an intentional decision: safety-contact info collected once
  must not become unreachable after the request is approved and archived. The approval flow (§Phase 2)
  copies these three fields onto the created/matched `Student` row; they're also editable directly
  from `/admin/students/[id]/edit` for students added without going through public registration.

## 2.1 Full schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Auth ----------

enum AdminRole {
  OWNER
  STAFF
}

model AdminUser {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         AdminRole @default(STAFF)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

// ---------- Families & Students ----------

model Family {
  id                String   @id @default(cuid())
  familyName        String
  parentGuardianName String
  email             String?
  phone             String   // required — used for WhatsApp notifications
  isActive          Boolean  @default(true)
  notes             String?
  students          Student[]
  registrationReqs  RegistrationRequest[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([phone])
  @@index([email])
}

enum Gender {
  MALE
  FEMALE
  OTHER
  PREFER_NOT_TO_SAY
}

model Student {
  id                 String    @id @default(cuid())
  fullName           String
  familyId           String
  family             Family    @relation(fields: [familyId], references: [id], onDelete: Restrict)
  dob                DateTime?
  gender             Gender?
  joinDate           DateTime  @default(now())
  isActive           Boolean   @default(true)
  medicalNotes       String?
  generalNotes       String?
  emergencyContactName         String? // copied from RegistrationRequest on approval; editable afterward
  emergencyContactRelationship String?
  emergencyPhone                String?
  enrollments        Enrollment[]
  monthlyBillings    MonthlyStudentBilling[]
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([familyId])
  @@index([isActive])
}

// ---------- Classes & Enrollments ----------

enum PricingType {
  REGULAR      // Billable Sessions x Rate
  SEASONAL     // Flat Fee
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

model Class {
  id            String       @id @default(cuid())
  name          String
  danceStyle    String
  level         String?
  teacher       String?
  dayOfWeek     DayOfWeek?
  startTime     String?      // "16:30" - stored as string, display-only
  endTime       String?
  durationMins  Int?
  standardRate  Decimal      @db.Decimal(10, 2) // per-session or flat, depending on pricingType
  pricingType   PricingType  @default(REGULAR)
  discountEligible Boolean   @default(true) // counts toward multi-class discount calc; seasonal/flat classes can be excluded
  isActive      Boolean      @default(true)
  enrollments   Enrollment[]
  monthlyFees   ClassMonthlyFee[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([isActive])
}

enum EnrollmentStatus {
  ACTIVE
  ENDED
}

model Enrollment {
  id        String            @id @default(cuid())
  studentId String
  student   Student           @relation(fields: [studentId], references: [id], onDelete: Restrict)
  classId   String
  class     Class             @relation(fields: [classId], references: [id], onDelete: Restrict)
  startDate DateTime          @default(now())
  endDate   DateTime?
  status    EnrollmentStatus  @default(ACTIVE)
  billingLineItems MonthlyBillingLineItem[]
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@unique([studentId, classId, startDate]) // allows re-enrollment history, prevents accidental dupes at same start
  @@index([studentId])
  @@index([classId])
  @@index([status])
}

// ---------- Class Monthly Fees (historical pricing snapshot) ----------

model ClassMonthlyFee {
  id                String   @id @default(cuid())
  classId           String
  class             Class    @relation(fields: [classId], references: [id], onDelete: Restrict)
  month             DateTime // normalized to first-of-month, e.g. 2026-09-01
  billableSessions  Int?     // null when flat fee
  rate              Decimal? @db.Decimal(10, 2) // per-session rate used this month; null when flat fee
  flatFee           Decimal? @db.Decimal(10, 2) // used when pricingType = SEASONAL
  monthlyClassFee   Decimal  @db.Decimal(10, 2) // = billableSessions*rate OR flatFee; stored, not recomputed later
  isOverridden      Boolean  @default(false) // true once an admin manually edits it
  notes             String?
  lineItems         MonthlyBillingLineItem[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([classId, month])
  @@index([month])
}

// ---------- Monthly Student Billing ----------

enum BillingStatus {
  DRAFT      // generated but not yet finalized/notified
  UNPAID
  PARTIAL
  PAID
  OVERPAID
}

enum NotificationStatus {
  NOT_SENT
  SENT
  FAILED
}

model MonthlyStudentBilling {
  id                   String    @id @default(cuid())
  studentId            String
  student              Student   @relation(fields: [studentId], references: [id], onDelete: Restrict)
  month                DateTime  // normalized to first-of-month
  baseTuition          Decimal   @db.Decimal(10, 2) // sum of applicable class fees
  multiClassDiscount   Decimal   @db.Decimal(10, 2) @default(0) // stored as a negative-facing amount, displayed with minus sign
  siblingDiscount      Decimal   @db.Decimal(10, 2) @default(0)
  adjustment           Decimal   @db.Decimal(10, 2) @default(0) // signed: +20 or -20
  adjustmentNotes      String?
  finalAmountDue       Decimal   @db.Decimal(10, 2)
  amountPaid           Decimal   @db.Decimal(10, 2) @default(0) // cached sum of Payments, recomputed on every payment write
  balance              Decimal   @db.Decimal(10, 2) // finalAmountDue - amountPaid
  status               BillingStatus @default(DRAFT)
  notificationStatus   NotificationStatus @default(NOT_SENT)
  notificationSentAt   DateTime?
  lineItems            MonthlyBillingLineItem[]
  payments             Payment[]
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@unique([studentId, month])
  @@index([month])
  @@index([status])
}

// one row per enrollment/class fee that contributed to a bill — keeps the calculation auditable
model MonthlyBillingLineItem {
  id                 String   @id @default(cuid())
  billingId          String
  billing            MonthlyStudentBilling @relation(fields: [billingId], references: [id], onDelete: Cascade)
  enrollmentId       String
  enrollment         Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Restrict)
  classMonthlyFeeId  String
  classMonthlyFee    ClassMonthlyFee @relation(fields: [classMonthlyFeeId], references: [id], onDelete: Restrict)
  amount             Decimal  @db.Decimal(10, 2)

  @@unique([billingId, enrollmentId])
}

// ---------- Payments ----------

enum PaymentMethod {
  ZELLE
  CASH
  CHECK
  OTHER
}

model Payment {
  id            String        @id @default(cuid())
  billingId     String
  billing       MonthlyStudentBilling @relation(fields: [billingId], references: [id], onDelete: Restrict)
  paymentDate   DateTime
  amount        Decimal       @db.Decimal(10, 2)
  method        PaymentMethod
  reference     String?
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([billingId])
  @@index([paymentDate])
}

// ---------- Registration Requests ----------

enum RegistrationStatus {
  PENDING
  PROCESSED
  REJECTED
}

model RegistrationRequest {
  id                          String   @id @default(cuid())
  parentGuardianName          String
  parentEmail                 String?
  parentPhone                 String
  studentFullName             String
  dob                         DateTime?
  gender                      Gender?
  requestedClassId            String?
  requestedClass              Class?   @relation(fields: [requestedClassId], references: [id])
  previousDanceExperience     String?
  emergencyContactName        String
  emergencyContactRelationship String
  emergencyPhone              String
  studioPolicyAgreement       Boolean  @default(false)
  photoVideoConsent           Boolean  @default(false)
  status                      RegistrationStatus @default(PENDING)
  matchedFamilyId             String?
  matchedFamily                Family? @relation(fields: [matchedFamilyId], references: [id])
  matchedStudentId            String?
  processedByAdminId          String?
  processedAt                 DateTime?
  createdAt                   DateTime @default(now())

  @@index([status])
}
```

_(Note: `Class` needs a back-relation `registrationRequests RegistrationRequest[]` for the
`requestedClass` relation above — added in the actual `schema.prisma` file, omitted here only for
readability.)_

## 2.2 Expenses & ad-hoc income

```prisma
enum ExpenseCategory {
  STUDIO_RENT
  INSTRUCTOR_CHOREOGRAPHER
  COSTUMES
  JEWELRY_PROPS
  COMPETITION_EVENT_FEES
  ADVERTISING
  SOFTWARE_SUBSCRIPTIONS
  MUSIC_EDITING
  SUPPLIES
  TRAVEL
  MISCELLANEOUS
}

model Expense {
  id            String          @id @default(cuid())
  date          DateTime
  category      ExpenseCategory
  description   String
  amount        Decimal         @db.Decimal(10, 2)
  paymentMethod PaymentMethod
  notes         String?
  receiptUrl    String?         // optional file upload (Vercel Blob / Supabase Storage)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([date])
  @@index([category])
}

enum OtherIncomeCategory {
  REGISTRATION_FEE
  WORKSHOP_CAMP
  PERFORMANCE_FEE
  COSTUME_INCOME
  PRIVATE_LESSON
  MISCELLANEOUS
}

// Tuition income is derived from Payment rows automatically (§11.1) — this table is only
// for the non-tuition income types the doc explicitly calls out.
model OtherIncome {
  id            String              @id @default(cuid())
  date          DateTime
  category      OtherIncomeCategory
  description   String
  amount        Decimal             @db.Decimal(10, 2)
  paymentMethod PaymentMethod
  notes         String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  @@index([date])
  @@index([category])
}
```

## 2.3 Notification log (audit trail for WhatsApp sends)

```prisma
enum NotificationChannel {
  WHATSAPP
  EMAIL
  MANUAL
}

model NotificationLog {
  id               String              @id @default(cuid())
  familyId         String
  month            DateTime
  channel          NotificationChannel
  status           NotificationStatus  @default(NOT_SENT)
  messageContent   String
  providerMessageId String?
  errorMessage     String?
  sentAt           DateTime?
  createdAt        DateTime            @default(now())

  @@index([familyId, month])
}
```

## 2.4 Key relationships at a glance

```
Family 1---N Student 1---N Enrollment N---1 Class 1---N ClassMonthlyFee
                 |                                            |
                 |--- N MonthlyStudentBilling                 |
                              |--- N MonthlyBillingLineItem ---|  (references both Enrollment & ClassMonthlyFee)
                              |--- N Payment

RegistrationRequest --(on approval)--> Family (find-or-create) + Student (find-or-create) + Enrollment (create)
```

## 2.5 Notes on future extensibility (§14)

Performances, competition teams, costume rentals, and rehearsals are intentionally **not**
modeled yet, but the schema supports adding them without touching Family/Student:
a future `Performance` or `CompetitionTeam` model can simply add its own `StudentXParticipation`
join table referencing `Student.id`, exactly the same pattern `Enrollment` already uses.
