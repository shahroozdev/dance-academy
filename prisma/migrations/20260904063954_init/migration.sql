-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('REGULAR', 'SEASONAL');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'OVERPAID');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ZELLE', 'CASH', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('STUDIO_RENT', 'INSTRUCTOR_CHOREOGRAPHER', 'COSTUMES', 'JEWELRY_PROPS', 'COMPETITION_EVENT_FEES', 'ADVERTISING', 'SOFTWARE_SUBSCRIPTIONS', 'MUSIC_EDITING', 'SUPPLIES', 'TRAVEL', 'MISCELLANEOUS');

-- CreateEnum
CREATE TYPE "OtherIncomeCategory" AS ENUM ('REGISTRATION_FEE', 'WORKSHOP_CAMP', 'PERFORMANCE_FEE', 'COSTUME_INCOME', 'PRIVATE_LESSON', 'MISCELLANEOUS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'MANUAL');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "parentGuardianName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "medicalNotes" TEXT,
    "generalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "danceStyle" TEXT NOT NULL,
    "level" TEXT,
    "teacher" TEXT,
    "dayOfWeek" "DayOfWeek",
    "startTime" TEXT,
    "endTime" TEXT,
    "durationMins" INTEGER,
    "standardRate" DECIMAL(10,2) NOT NULL,
    "pricingType" "PricingType" NOT NULL DEFAULT 'REGULAR',
    "discountEligible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMonthlyFee" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "billableSessions" INTEGER,
    "rate" DECIMAL(10,2),
    "flatFee" DECIMAL(10,2),
    "monthlyClassFee" DECIMAL(10,2) NOT NULL,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassMonthlyFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyStudentBilling" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "baseTuition" DECIMAL(10,2) NOT NULL,
    "multiClassDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "siblingDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustmentNotes" TEXT,
    "finalAmountDue" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'DRAFT',
    "notificationStatus" "NotificationStatus" NOT NULL DEFAULT 'NOT_SENT',
    "notificationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyStudentBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyBillingLineItem" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "classMonthlyFeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "MonthlyBillingLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL,
    "parentGuardianName" TEXT NOT NULL,
    "parentEmail" TEXT,
    "parentPhone" TEXT NOT NULL,
    "studentFullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "requestedClassId" TEXT,
    "previousDanceExperience" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "emergencyPhone" TEXT NOT NULL,
    "studioPolicyAgreement" BOOLEAN NOT NULL DEFAULT false,
    "photoVideoConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "matchedFamilyId" TEXT,
    "matchedStudentId" TEXT,
    "processedByAdminId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtherIncome" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "OtherIncomeCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtherIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'NOT_SENT',
    "messageContent" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Family_phone_idx" ON "Family"("phone");

-- CreateIndex
CREATE INDEX "Family_email_idx" ON "Family"("email");

-- CreateIndex
CREATE INDEX "Student_familyId_idx" ON "Student"("familyId");

-- CreateIndex
CREATE INDEX "Student_isActive_idx" ON "Student"("isActive");

-- CreateIndex
CREATE INDEX "Class_isActive_idx" ON "Class"("isActive");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_classId_startDate_key" ON "Enrollment"("studentId", "classId", "startDate");

-- CreateIndex
CREATE INDEX "ClassMonthlyFee_month_idx" ON "ClassMonthlyFee"("month");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMonthlyFee_classId_month_key" ON "ClassMonthlyFee"("classId", "month");

-- CreateIndex
CREATE INDEX "MonthlyStudentBilling_month_idx" ON "MonthlyStudentBilling"("month");

-- CreateIndex
CREATE INDEX "MonthlyStudentBilling_status_idx" ON "MonthlyStudentBilling"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyStudentBilling_studentId_month_key" ON "MonthlyStudentBilling"("studentId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBillingLineItem_billingId_enrollmentId_key" ON "MonthlyBillingLineItem"("billingId", "enrollmentId");

-- CreateIndex
CREATE INDEX "Payment_billingId_idx" ON "Payment"("billingId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "RegistrationRequest_status_idx" ON "RegistrationRequest"("status");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "OtherIncome_date_idx" ON "OtherIncome"("date");

-- CreateIndex
CREATE INDEX "OtherIncome_category_idx" ON "OtherIncome"("category");

-- CreateIndex
CREATE INDEX "NotificationLog_familyId_month_idx" ON "NotificationLog"("familyId", "month");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMonthlyFee" ADD CONSTRAINT "ClassMonthlyFee_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyStudentBilling" ADD CONSTRAINT "MonthlyStudentBilling_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBillingLineItem" ADD CONSTRAINT "MonthlyBillingLineItem_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "MonthlyStudentBilling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBillingLineItem" ADD CONSTRAINT "MonthlyBillingLineItem_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBillingLineItem" ADD CONSTRAINT "MonthlyBillingLineItem_classMonthlyFeeId_fkey" FOREIGN KEY ("classMonthlyFeeId") REFERENCES "ClassMonthlyFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "MonthlyStudentBilling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_requestedClassId_fkey" FOREIGN KEY ("requestedClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_matchedFamilyId_fkey" FOREIGN KEY ("matchedFamilyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
