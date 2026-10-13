import { getMonthlyBillingById, getMonthlyBillings } from "@/actions/billing";
import { getClassMonthlyFeeById, getClassMonthlyFees } from "@/actions/class-fees";
import { getClasses, getClassById, getClassRoster } from "@/actions/classes";
import { getContentFestivalById, getContentFestivals } from "@/actions/content-festivals";
import { getContentInquiries, getContentInquirySummary } from "@/actions/content-inquiries";
import { getContentMediaAssets } from "@/actions/content-media";
import { getContentHistory, getContentOverview } from "@/actions/content-overview";
import { getContentPerformanceById, getContentPerformances } from "@/actions/content-performances";
import { getContentPressItemById, getContentPressItems } from "@/actions/content-press";
import { getContentProfileById, getContentProfiles } from "@/actions/content-profiles";
import { getContentWebsiteSettings } from "@/actions/content-settings";
import { getContentSiteMedia } from "@/actions/content-site-media";
import { getContentUsers } from "@/actions/content-users";
import { getDashboardSummary } from "@/actions/dashboard";
import { getEmailTemplates } from "@/actions/email-templates";
import { getEnrollments } from "@/actions/enrollments";
import { getExpenseById, getExpenses } from "@/actions/expenses";
import { getClassExtraSessions } from "@/actions/extra-sessions";
import { getFamilies, getFamilyById } from "@/actions/families";
import { getAvailableYears, getFinancialSummary, getMonthlyTrend } from "@/actions/financial-reports";
import {
  getAdminNotificationSummary,
  getFamilyNotificationPreview,
  getNotificationLogs,
  getPendingNotifications,
} from "@/actions/notifications";
import { getOtherIncomeById, getOtherIncome } from "@/actions/other-income";
import { getPayments } from "@/actions/payments";
import { getActivePrograms, getProgramById, getPrograms } from "@/actions/programs";
import {
  getRegistrationRequests,
  getRegistrationRequestById,
  previewRegistrationApproval,
  getRegistrationFamilyOptions,
  getRegistrationAssignmentClasses,
} from "@/actions/registrations";
import { getStudioSettings } from "@/actions/settings";
import { getStudents, getStudentById } from "@/actions/students";
import { getTeachers, getTeacherById } from "@/actions/teachers";

export const queryRegistry = {
  getFamilies,
  getFamilyById,
  getStudents,
  getStudentById,
  getClasses,
  getClassById,
  getClassRoster,
  getTeachers,
  getTeacherById,
  getEnrollments,
  getClassExtraSessions,
  getRegistrationRequests,
  getRegistrationRequestById,
  previewRegistrationApproval,
  getRegistrationFamilyOptions,
  getRegistrationAssignmentClasses,
  getMonthlyBillings,
  getMonthlyBillingById,
  getClassMonthlyFees,
  getClassMonthlyFeeById,
  getPayments,
  getPrograms,
  getProgramById,
  getActivePrograms,
  getExpenses,
  getExpenseById,
  getOtherIncome,
  getOtherIncomeById,
  getFinancialSummary,
  getMonthlyTrend,
  getAvailableYears,
  getDashboardSummary,
  getStudioSettings,
  getEmailTemplates,
  getFamilyNotificationPreview,
  getPendingNotifications,
  getNotificationLogs,
  getAdminNotificationSummary,
  getContentOverview,
  getContentHistory,
  getContentFestivals,
  getContentFestivalById,
  getContentPerformances,
  getContentPerformanceById,
  getContentPressItems,
  getContentPressItemById,
  getContentMediaAssets,
  getContentProfiles,
  getContentProfileById,
  getContentWebsiteSettings,
  getContentSiteMedia,
  getContentInquiries,
  getContentInquirySummary,
  getContentUsers,
} as const;

export type QueryRegistry = typeof queryRegistry;
export type QueryKey = keyof QueryRegistry;
export type QueryArgs<K extends QueryKey> = Parameters<QueryRegistry[K]>;
export type QueryData<K extends QueryKey> = Awaited<ReturnType<QueryRegistry[K]>>;
