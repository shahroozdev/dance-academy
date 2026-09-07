import { generateMonthlyBilling, recalculateBilling, setBillingAdjustment } from "@/actions/billing";
import {
  finalizeAllClassMonthlyFeesForMonth,
  finalizeClassMonthlyFee,
  unfinalizeClassMonthlyFee,
  updateClassMonthlyFee,
} from "@/actions/class-fees";
import { createClass, updateClass, toggleClassActive } from "@/actions/classes";
import { updateEmailTemplate } from "@/actions/email-templates";
import { createEnrollment, endEnrollment } from "@/actions/enrollments";
import { createExpense, deleteExpense, updateExpense, uploadExpenseReceipt } from "@/actions/expenses";
import {
  createFamily,
  updateFamily,
  toggleFamilyActive,
} from "@/actions/families";
import { markFamilyNotificationSent, sendFamilyNotificationEmail, sendFamilyNotificationWhatsApp, sendFamilyPaymentReminder } from "@/actions/notifications";
import { createOtherIncome, deleteOtherIncome, updateOtherIncome } from "@/actions/other-income";
import { createPayment, createRefund } from "@/actions/payments";
import { approveRegistrationRequest, rejectRegistrationRequest } from "@/actions/registrations";
import { updateStudioSettings, uploadLogo } from "@/actions/settings";
import {
  createStudent,
  updateStudent,
  toggleStudentActive,
  importStudents,
} from "@/actions/students";
import { createTeacher, updateTeacher, toggleTeacherActive } from "@/actions/teachers";

export const mutationRegistry = {
  createFamily,
  updateFamily,
  toggleFamilyActive,
  createStudent,
  updateStudent,
  toggleStudentActive,
  importStudents,
  createClass,
  updateClass,
  toggleClassActive,
  createTeacher,
  updateTeacher,
  toggleTeacherActive,
  createEnrollment,
  endEnrollment,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  generateMonthlyBilling,
  setBillingAdjustment,
  recalculateBilling,
  updateClassMonthlyFee,
  finalizeClassMonthlyFee,
  unfinalizeClassMonthlyFee,
  finalizeAllClassMonthlyFeesForMonth,
  createPayment,
  createRefund,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
  updateStudioSettings,
  uploadLogo,
  updateEmailTemplate,
  markFamilyNotificationSent,
  sendFamilyNotificationEmail,
  sendFamilyNotificationWhatsApp,
  sendFamilyPaymentReminder,
} as const;

export type MutationRegistry = typeof mutationRegistry;
export type MutationKey = keyof MutationRegistry;
export type MutationArgs<K extends MutationKey> = Parameters<MutationRegistry[K]>;
export type MutationData<K extends MutationKey> = Awaited<ReturnType<MutationRegistry[K]>>;
