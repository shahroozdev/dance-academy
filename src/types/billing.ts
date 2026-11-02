// ---------- Itemized fee notice (parent message) ----------

export type FeeNoticeLine = {
  className: string;
  amount: number;
  rate: number | null;
  discountEligible: boolean;
  seasonal: boolean;
};

export type FeeNoticeStudentBill = {
  name: string;
  finalAmountDue: number;
  amountPaid: number;
  balance: number;
  multiClassDiscount: number;
  siblingDiscount: number;
  adjustment: number;
  lines: FeeNoticeLine[];
};

export type FeeNoticeMonth = { monthLabel: string; students: FeeNoticeStudentBill[] };

// ---------- Outstanding fees ----------

// classId is null for a positive adjustment, which is owed as its own line.
export type OutstandingClassFee = { classId: string | null; className: string; pending: number };

export type OutstandingBill = {
  billingId: string;
  studentId: string;
  studentName: string;
  familyName: string;
  month: string;
  finalAmountDue: number;
  amountPaid: number;
  balance: number;
  pendingClasses: OutstandingClassFee[];
};

export type OutstandingFees = {
  // The class these figures are for (null = all classes), so a label never pairs with other numbers.
  classId: string | null;
  data: OutstandingBill[];
  total: number;
  pages: number;
  studentCount: number;
  amountDue: number;
  classOptions: { id: string; name: string }[];
};
