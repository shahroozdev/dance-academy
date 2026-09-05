// Optional, manual-run mock data for local testing/demoing — not wired into `prisma migrate
// reset`'s seed (prisma.config.ts still points that at seed.ts, which only creates the owner
// login). Run with: npx tsx prisma/seed-mock-data.ts
//
// Covers the scenarios most worth clicking through: a sibling pair with a multi-class student
// (mirrors docs/04-business-logic-billing-discounts.md §4.6's Nia/Leia case), an only-child
// baseline with no discounts, a seasonal flat-fee class, a family with no email on file (exercises
// the "no email" path in notifications/reminders), a pending registration request, and a few
// expense/other-income rows for the financial reports page.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function yearsAgo(n: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

async function main() {
  const existingFamilies = await db.family.count();
  if (existingFamilies > 0) {
    console.warn(
      `Database already has ${existingFamilies} famil${existingFamilies === 1 ? "y" : "ies"} — skipping to avoid duplicates. Clear existing Family/Student/Class rows first if you want to reseed.`,
    );
    return;
  }

  const [bharatBeg, bharatInt, kathakBeg, kathakInt, bollywood, summerIntensive] = await Promise.all([
    db.class.create({
      data: {
        name: "Bharatanatyam Beginner",
        danceStyle: "Bharatanatyam",
        level: "Beginner",
        teacher: "Meera Iyer",
        dayOfWeek: "MONDAY",
        startTime: "16:00",
        endTime: "17:00",
        durationMins: 60,
        standardRate: 20,
        pricingType: "REGULAR",
      },
    }),
    db.class.create({
      data: {
        name: "Bharatanatyam Intermediate",
        danceStyle: "Bharatanatyam",
        level: "Intermediate",
        teacher: "Meera Iyer",
        dayOfWeek: "WEDNESDAY",
        startTime: "16:00",
        endTime: "17:00",
        durationMins: 60,
        standardRate: 22,
        pricingType: "REGULAR",
      },
    }),
    db.class.create({
      data: {
        name: "Kathak Beginner",
        danceStyle: "Kathak",
        level: "Beginner",
        teacher: "Rohan Verma",
        dayOfWeek: "TUESDAY",
        startTime: "17:00",
        endTime: "18:00",
        durationMins: 60,
        standardRate: 20,
        pricingType: "REGULAR",
      },
    }),
    db.class.create({
      data: {
        name: "Kathak Intermediate",
        danceStyle: "Kathak",
        level: "Intermediate",
        teacher: "Rohan Verma",
        dayOfWeek: "THURSDAY",
        startTime: "17:00",
        endTime: "18:15",
        durationMins: 75,
        standardRate: 25,
        pricingType: "REGULAR",
      },
    }),
    db.class.create({
      data: {
        name: "Bollywood Fusion",
        danceStyle: "Bollywood",
        level: "All Levels",
        teacher: "Simran Kaur",
        dayOfWeek: "SATURDAY",
        startTime: "10:00",
        endTime: "10:45",
        durationMins: 45,
        standardRate: 18,
        pricingType: "REGULAR",
      },
    }),
    db.class.create({
      data: {
        name: "Summer Intensive Workshop",
        danceStyle: "Mixed",
        level: "All Levels",
        teacher: "Guest Choreographer",
        standardRate: 150,
        pricingType: "SEASONAL",
      },
    }),
  ]);

  // Sharma siblings — Nia (multi-class + sibling discount both apply) and Leia (sibling discount
  // only), matching the requirements doc's worked example.
  const sharma = await db.family.create({
    data: { familyName: "Sharma Family", parentGuardianName: "Anu Sharma", email: "anu.sharma@example.com", phone: "5551234567" },
  });
  const nia = await db.student.create({
    data: {
      fullName: "Nia Sharma",
      familyId: sharma.id,
      dob: yearsAgo(9),
      gender: "FEMALE",
      emergencyContactName: "Anu Sharma",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5551234567",
    },
  });
  const leia = await db.student.create({
    data: {
      fullName: "Leia Sharma",
      familyId: sharma.id,
      dob: yearsAgo(7),
      gender: "FEMALE",
      emergencyContactName: "Anu Sharma",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5551234567",
    },
  });
  await db.enrollment.createMany({
    data: [
      { studentId: nia.id, classId: bharatBeg.id, startDate: daysAgo(60) },
      { studentId: nia.id, classId: kathakBeg.id, startDate: daysAgo(60) },
      { studentId: leia.id, classId: bharatBeg.id, startDate: daysAgo(45) },
    ],
  });

  // Only child, single class — the no-discount baseline case.
  const nair = await db.family.create({
    data: { familyName: "Nair Family", parentGuardianName: "Priya Nair", email: "priya.nair@example.com", phone: "5552345678" },
  });
  const meera = await db.student.create({
    data: {
      fullName: "Meera Nair",
      familyId: nair.id,
      dob: yearsAgo(10),
      gender: "FEMALE",
      emergencyContactName: "Priya Nair",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5552345678",
    },
  });
  await db.enrollment.create({ data: { studentId: meera.id, classId: kathakInt.id, startDate: daysAgo(90) } });

  // Only child, two classes — multi-class discount only, no sibling discount.
  const patel = await db.family.create({
    data: { familyName: "Patel Family", parentGuardianName: "Ravi Patel", email: "ravi.patel@example.com", phone: "5553456789" },
  });
  const aarav = await db.student.create({
    data: {
      fullName: "Aarav Patel",
      familyId: patel.id,
      dob: yearsAgo(11),
      gender: "MALE",
      emergencyContactName: "Ravi Patel",
      emergencyContactRelationship: "Father",
      emergencyPhone: "5553456789",
    },
  });
  await db.enrollment.createMany({
    data: [
      { studentId: aarav.id, classId: bharatInt.id, startDate: daysAgo(120) },
      { studentId: aarav.id, classId: bollywood.id, startDate: daysAgo(120) },
    ],
  });

  // Siblings in different classes — sibling discount is family-wide, not class-specific.
  const gupta = await db.family.create({
    data: { familyName: "Gupta Family", parentGuardianName: "Sunita Gupta", email: "sunita.gupta@example.com", phone: "5554567890" },
  });
  const diya = await db.student.create({
    data: {
      fullName: "Diya Gupta",
      familyId: gupta.id,
      dob: yearsAgo(8),
      gender: "FEMALE",
      emergencyContactName: "Sunita Gupta",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5554567890",
    },
  });
  const arjun = await db.student.create({
    data: {
      fullName: "Arjun Gupta",
      familyId: gupta.id,
      dob: yearsAgo(6),
      gender: "MALE",
      emergencyContactName: "Sunita Gupta",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5554567890",
    },
  });
  await db.enrollment.createMany({
    data: [
      { studentId: diya.id, classId: kathakBeg.id, startDate: daysAgo(70) },
      { studentId: arjun.id, classId: bollywood.id, startDate: daysAgo(30) },
    ],
  });

  // No email on file — exercises the "no email" fallback path in notifications/reminders.
  const khan = await db.family.create({
    data: { familyName: "Khan Family", parentGuardianName: "Fatima Khan", phone: "5555678901" },
  });
  const zara = await db.student.create({
    data: {
      fullName: "Zara Khan",
      familyId: khan.id,
      dob: yearsAgo(9),
      gender: "FEMALE",
      emergencyContactName: "Fatima Khan",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5555678901",
    },
  });
  await db.enrollment.create({ data: { studentId: zara.id, classId: bharatBeg.id, startDate: daysAgo(20) } });

  // Seasonal flat-fee class, and a name with an apostrophe (matches an existing test fixture).
  const obrien = await db.family.create({
    data: { familyName: "O'Brien Family", parentGuardianName: "Mary Anne O'Brien", email: "mary.obrien@example.com", phone: "5556789012" },
  });
  const kiera = await db.student.create({
    data: {
      fullName: "Kiera O'Brien",
      familyId: obrien.id,
      dob: yearsAgo(12),
      gender: "FEMALE",
      emergencyContactName: "Mary Anne O'Brien",
      emergencyContactRelationship: "Mother",
      emergencyPhone: "5556789012",
    },
  });
  await db.enrollment.create({ data: { studentId: kiera.id, classId: summerIntensive.id, startDate: daysAgo(10) } });

  // A pending registration request, to test the approval queue.
  await db.registrationRequest.create({
    data: {
      parentGuardianName: "Wei Chen",
      parentEmail: "wei.chen@example.com",
      parentPhone: "5557890123",
      studentFullName: "Lily Chen",
      dob: yearsAgo(8),
      gender: "FEMALE",
      requestedClassId: bollywood.id,
      previousDanceExperience: "One year of ballet",
      emergencyContactName: "Wei Chen",
      emergencyContactRelationship: "Father",
      emergencyPhone: "5557890123",
      studioPolicyAgreement: true,
      photoVideoConsent: true,
    },
  });

  // A few expense/other-income rows for the financial reports page.
  await db.expense.createMany({
    data: [
      { date: daysAgo(15), category: "STUDIO_RENT", description: "Monthly studio rent", amount: 1200, paymentMethod: "CHECK" },
      {
        date: daysAgo(10),
        category: "INSTRUCTOR_CHOREOGRAPHER",
        description: "Guest choreographer fee — Summer Intensive",
        amount: 400,
        paymentMethod: "ZELLE",
      },
      { date: daysAgo(5), category: "SUPPLIES", description: "Costume fabric and trim", amount: 85.5, paymentMethod: "CASH" },
    ],
  });
  await db.otherIncome.createMany({
    data: [
      { date: daysAgo(20), category: "REGISTRATION_FEE", description: "New student registration fees", amount: 50, paymentMethod: "ZELLE" },
      { date: daysAgo(8), category: "WORKSHOP_CAMP", description: "Summer Intensive Workshop tuition", amount: 150, paymentMethod: "ZELLE" },
    ],
  });

  console.warn(
    "Seeded mock data: 6 classes, 6 families, 8 students, 10 enrollments, 1 pending registration, 3 expenses, 2 other-income entries.",
  );
  console.warn('Next step: open /admin/billing and click "Generate Bills" for the current month to create bills from these enrollments.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
