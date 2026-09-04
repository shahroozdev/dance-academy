import { getClasses, getClassById, getClassRoster } from "@/actions/classes";
import { getEnrollments } from "@/actions/enrollments";
import { getFamilies, getFamilyById } from "@/actions/families";
import {
  getRegistrationRequests,
  getRegistrationRequestById,
  previewRegistrationApproval,
} from "@/actions/registrations";
import { getStudents, getStudentById } from "@/actions/students";

export const queryRegistry = {
  getFamilies,
  getFamilyById,
  getStudents,
  getStudentById,
  getClasses,
  getClassById,
  getClassRoster,
  getEnrollments,
  getRegistrationRequests,
  getRegistrationRequestById,
  previewRegistrationApproval,
} as const;

export type QueryRegistry = typeof queryRegistry;
export type QueryKey = keyof QueryRegistry;
export type QueryArgs<K extends QueryKey> = Parameters<QueryRegistry[K]>;
export type QueryData<K extends QueryKey> = Awaited<ReturnType<QueryRegistry[K]>>;
