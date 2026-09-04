import { generateMonthlyBilling, recalculateBilling, setBillingAdjustment } from "@/actions/billing";
import { updateClassMonthlyFee } from "@/actions/class-fees";
import { createClass, updateClass, toggleClassActive } from "@/actions/classes";
import { createEnrollment, endEnrollment } from "@/actions/enrollments";
import { createExpense, updateExpense } from "@/actions/expenses";
import {
  createFamily,
  updateFamily,
  toggleFamilyActive,
} from "@/actions/families";
import { markFamilyNotificationSent, sendFamilyNotificationEmail } from "@/actions/notifications";
import { createOtherIncome, updateOtherIncome } from "@/actions/other-income";
import { createPayment } from "@/actions/payments";
import { approveRegistrationRequest, rejectRegistrationRequest } from "@/actions/registrations";
import { updateStudioSettings, uploadLogo } from "@/actions/settings";
import {
  createStudent,
  updateStudent,
  toggleStudentActive,
} from "@/actions/students";

export const mutationRegistry = {
  createFamily,
  updateFamily,
  toggleFamilyActive,
  createStudent,
  updateStudent,
  toggleStudentActive,
  createClass,
  updateClass,
  toggleClassActive,
  createEnrollment,
  endEnrollment,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  generateMonthlyBilling,
  setBillingAdjustment,
  recalculateBilling,
  updateClassMonthlyFee,
  createPayment,
  createExpense,
  updateExpense,
  createOtherIncome,
  updateOtherIncome,
  updateStudioSettings,
  uploadLogo,
  markFamilyNotificationSent,
  sendFamilyNotificationEmail,
} as const;

export type MutationRegistry = typeof mutationRegistry;
export type MutationKey = keyof MutationRegistry;
export type MutationArgs<K extends MutationKey> = Parameters<MutationRegistry[K]>;
export type MutationData<K extends MutationKey> = Awaited<ReturnType<MutationRegistry[K]>>;
