/**
 * When `false`, onboarding step 2 hides birthday + password fields and completes email
 * signup via magic link (`signInWithOtp`). US onboarding treats DOB like optional (same as
 * landing quiz without birth). Profile form hides DOB fields and does not PATCH birth columns.
 *
 * Set to `true` to restore the previous birthday + password registration UX.
 */
export const ACCOUNT_SHOW_DATE_OF_BIRTH_AND_PASSWORD_FIELDS = false;
