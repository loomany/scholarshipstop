/**
 * Canonical profile shape for scholarship matching / ranking and Supabase `public.profiles`.
 */
export type UserProfile = {
  firstName: string | null;
  lastName: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  dateOfBirth: string | null;
  schoolLevel: string | null;
  schoolLevelLabel: string | null;
  fieldOfStudy: string | null;
  fieldOfStudyLabel: string | null;
  /** Stored as `profiles.citizenship_status` (slug). */
  citizenshipStatus: string | null;
  citizenshipStatusLabel: string | null;
  countryCode: string | null;
  stateRegion: string | null;
  city: string | null;
  gpa: string | null;
  onboardingCompleted: boolean;
};
