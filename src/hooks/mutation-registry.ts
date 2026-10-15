import { generateMonthlyBilling, recalculateBilling, resolveBillingManualReview, setBillingAdjustment } from "@/actions/billing";
import {
  finalizeAllClassMonthlyFeesForMonth,
  finalizeClassMonthlyFee,
  markClassMonthlyFeeNoClasses,
  recalculateClassMonthlyFeeBills,
  unfinalizeClassMonthlyFee,
  updateClassMonthlyFee,
} from "@/actions/class-fees";
import { createClassBillingPause, deleteClassBillingPause } from "@/actions/class-pauses";
import { applyReportedClassSessions, reportMonthlyClassSessions } from "@/actions/class-sessions";
import { createClass, updateClass, toggleClassActive } from "@/actions/classes";
import { createFestival, updateFestival } from "@/actions/content-festivals";
import { setInquiryStatus } from "@/actions/content-inquiries";
import {
  addContentMediaLink,
  createContentUploadTicket,
  deleteContentMedia,
  registerContentUpload,
  updateContentMedia,
  uploadContentDocument,
} from "@/actions/content-media";
import { createPerformance, updatePerformance } from "@/actions/content-performances";
import { createPressItem, updatePressItem } from "@/actions/content-press";
import { createProfile, moveProfile, updateProfile } from "@/actions/content-profiles";
import { updateWebsiteSettings } from "@/actions/content-settings";
import { setSiteMediaSlot } from "@/actions/content-site-media";
import { setContentStatus } from "@/actions/content-status";
import { createContentUser, setContentUserPassword, updateContentUser } from "@/actions/content-users";
import { updateEmailTemplate } from "@/actions/email-templates";
import {
  createEnrollment,
  createEnrollmentBillingPause,
  deleteEnrollment,
  deleteEnrollmentBillingPause,
  endEnrollment,
  reactivateEnrollment,
  updateEnrollmentStartDate,
} from "@/actions/enrollments";
import { createExpense, deleteExpense, updateExpense, uploadExpenseReceipt } from "@/actions/expenses";
import { createClassExtraSession, deleteClassExtraSession } from "@/actions/extra-sessions";
import {
  createFamily,
  deleteFamily,
  updateFamily,
  toggleFamilyActive,
} from "@/actions/families";
import { combineFamilies, createFamilyGuardian, deleteFamilyGuardian, setPrimaryFamilyGuardian, updateFamilyGuardian } from "@/actions/family-guardians";
import { submitWebsiteInquiry } from "@/actions/inquiries";
import { markFamilyNotificationSent, sendFamilyNotificationEmail, sendFamilyPaymentReminder } from "@/actions/notifications";
import { createOtherIncome, deleteOtherIncome, updateOtherIncome } from "@/actions/other-income";
import { createPayment, createRefund, updatePayment } from "@/actions/payments";
import { createProgram, toggleProgramActive, updateProgram } from "@/actions/programs";
import {
  approveRegistrationRequest,
  createRegistrationRequest,
  rejectRegistrationRequest,
  sendRegistrationEnrollmentConfirmation,
} from "@/actions/registrations";
import { updateRegistrationPolicy, updateStudioSettings, uploadLogo } from "@/actions/settings";
import {
  createStudent,
  deleteStudent,
  updateStudent,
  toggleStudentActive,
  importStudents,
} from "@/actions/students";
import { createTeacher, updateTeacher, toggleTeacherActive } from "@/actions/teachers";

export const mutationRegistry = {
  createFamily,
  deleteFamily,
  updateFamily,
  toggleFamilyActive,
  createFamilyGuardian,
  updateFamilyGuardian,
  deleteFamilyGuardian,
  setPrimaryFamilyGuardian,
  combineFamilies,
  createStudent,
  deleteStudent,
  updateStudent,
  toggleStudentActive,
  importStudents,
  createClass,
  updateClass,
  toggleClassActive,
  createClassBillingPause,
  deleteClassBillingPause,
  createTeacher,
  updateTeacher,
  toggleTeacherActive,
  createEnrollment,
  createEnrollmentBillingPause,
  deleteEnrollment,
  deleteEnrollmentBillingPause,
  endEnrollment,
  reactivateEnrollment,
  updateEnrollmentStartDate,
  createClassExtraSession,
  deleteClassExtraSession,
  createRegistrationRequest,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  sendRegistrationEnrollmentConfirmation,
  generateMonthlyBilling,
  setBillingAdjustment,
  recalculateBilling,
  resolveBillingManualReview,
  updateClassMonthlyFee,
  finalizeClassMonthlyFee,
  markClassMonthlyFeeNoClasses,
  recalculateClassMonthlyFeeBills,
  unfinalizeClassMonthlyFee,
  finalizeAllClassMonthlyFeesForMonth,
  reportMonthlyClassSessions,
  applyReportedClassSessions,
  createPayment,
  createRefund,
  updatePayment,
  createProgram,
  updateProgram,
  toggleProgramActive,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
  updateStudioSettings,
  updateRegistrationPolicy,
  uploadLogo,
  updateEmailTemplate,
  markFamilyNotificationSent,
  sendFamilyNotificationEmail,
  sendFamilyPaymentReminder,
  submitWebsiteInquiry,
  createFestival,
  updateFestival,
  createPerformance,
  updatePerformance,
  createPressItem,
  updatePressItem,
  setContentStatus,
  createContentUploadTicket,
  registerContentUpload,
  uploadContentDocument,
  setSiteMediaSlot,
  setInquiryStatus,
  addContentMediaLink,
  updateContentMedia,
  deleteContentMedia,
  createProfile,
  updateProfile,
  moveProfile,
  updateWebsiteSettings,
  createContentUser,
  updateContentUser,
  setContentUserPassword,
} as const;

export type MutationRegistry = typeof mutationRegistry;
export type MutationKey = keyof MutationRegistry;
export type MutationArgs<K extends MutationKey> = Parameters<MutationRegistry[K]>;
export type MutationData<K extends MutationKey> = Awaited<ReturnType<MutationRegistry[K]>>;
