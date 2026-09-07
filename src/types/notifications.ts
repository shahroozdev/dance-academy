export type FamilyNotificationPreview = {
  familyId: string;
  familyName: string;
  parentGuardianName: string;
  phone: string;
  email: string | null;
  month: string;
  students: { billingId: string; name: string; finalAmountDue: number }[];
  total: number;
  message: string;
  waLink: string;
  alreadySent: boolean;
  // False when any class contributing to these bills hasn't had its billable session count
  // finalized yet for this month — every send action is blocked while this is false.
  finalized: boolean;
  unfinalizedClassNames: string[];
};

export type PendingFamilyNotification = {
  familyId: string;
  familyName: string;
  studentCount: number;
  total: number;
};

