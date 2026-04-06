/** Guest home CTAs land on onboarding GPA step (step 3). */
export const HOME_PRIMARY_CTA_GUEST_HREF = '/onboarding?step=3';

export const HOME_PRIMARY_CTA_AUTH_HREF = '/scholarships';

export function homePrimaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated
    ? HOME_PRIMARY_CTA_AUTH_HREF
    : HOME_PRIMARY_CTA_GUEST_HREF;
}
