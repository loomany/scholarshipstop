/** Guests: marketing `/signup` → onboarding (not the `/signin/...` auth card). */
export const HOME_PRIMARY_CTA_GUEST_HREF = '/signup';

/** Signed-in users go straight to the scholarship hub. */
export const HOME_PRIMARY_CTA_AUTH_HREF = '/scholarships';

export function homePrimaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated
    ? HOME_PRIMARY_CTA_AUTH_HREF
    : HOME_PRIMARY_CTA_GUEST_HREF;
}
