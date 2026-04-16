/** Guest home CTAs go to the scholarships hub (skip registration/onboarding). */
export const HOME_PRIMARY_CTA_GUEST_HREF = '/scholarships';

export const HOME_PRIMARY_CTA_AUTH_HREF = '/scholarships';

export function homePrimaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated
    ? HOME_PRIMARY_CTA_AUTH_HREF
    : HOME_PRIMARY_CTA_GUEST_HREF;
}
