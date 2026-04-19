/** sessionStorage: one-shot filter seed after `/get-scholarships` quiz (guest or logged-out flow). */
export const LANDING_QUIZ_HUB_SEED_KEY = 'scholarship_landing_quiz_hub_seed_v1';

/**
 * When a guest taps “Edit answers” on Best recommendation, we clear the in-memory landing seed and
 * reopen the hub wizard. On the next hub mount, skip auto-rehydrating the landing seed from
 * persisted quiz storage once so the wizard stays open instead of immediately re-applying the old seed.
 */
export const SCHOLARSHIP_HUB_SKIP_AUTO_LANDING_SEED_ONCE_KEY =
  'scholarship_hub_skip_auto_landing_seed_once_v1';
