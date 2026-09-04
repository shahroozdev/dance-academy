import { createClass, updateClass, toggleClassActive } from "@/actions/classes";
import { createEnrollment, endEnrollment } from "@/actions/enrollments";
import {
  createFamily,
  updateFamily,
  toggleFamilyActive,
} from "@/actions/families";
import { approveRegistrationRequest, rejectRegistrationRequest } from "@/actions/registrations";
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
} as const;

export type MutationRegistry = typeof mutationRegistry;
export type MutationKey = keyof MutationRegistry;
export type MutationArgs<K extends MutationKey> = Parameters<MutationRegistry[K]>;
export type MutationData<K extends MutationKey> = Awaited<ReturnType<MutationRegistry[K]>>;
