import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';

/** Guests start with the landing questionnaire, then land in Best recommendation. */
export const HOME_PRIMARY_CTA_GUEST_HREF = '/get-scholarships';

/** Signed-in users go straight to the Best recommendation hub view. */
export const HOME_PRIMARY_CTA_AUTH_HREF =
  SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF;

export function homePrimaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated
    ? HOME_PRIMARY_CTA_AUTH_HREF
    : HOME_PRIMARY_CTA_GUEST_HREF;
}
