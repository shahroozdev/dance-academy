/**
 * A teacher as shown on the public website's Instructors page. Deliberately only what is safe to
 * publish: the admin Teachers table also holds email, phone and private notes, none of which
 * belong here.
 */
export type PublicInstructor = {
  name: string;
  /** Names of the dance programs this teacher currently has active classes in. */
  programs: string[];
};
