/**
 * Fal-generated monochrome logos for the **homepage** Featured Brands carousel only.
 * Files: `public/images/featured-brands/domains/{key}.webp` where `key` = {@link brandDomainToLogoFileKey}.
 * Not used on scholarship detail pages.
 */

export const HOME_FEATURED_LOGO_DIR = '/images/featured-brands' as const;
export const HOME_FEATURED_DOMAIN_LOGO_SUBDIR = 'domains' as const;

/** Stable filename stem from domain, e.g. `wellsfargo.com` → `wellsfargo-com` */
export function brandDomainToLogoFileKey(brandDomain: string): string {
  const s = brandDomain
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/\./g, '-');
  return s || 'brand';
}

export function homeFeaturedDomainLogoPublicPath(brandDomain: string): string {
  const key = brandDomainToLogoFileKey(brandDomain);
  return `${HOME_FEATURED_LOGO_DIR}/${HOME_FEATURED_DOMAIN_LOGO_SUBDIR}/${key}.webp`;
}

/**
 * CSS `transform: scale()` for the homepage featured logo image (after padding + object-contain).
 * Wider wordmarks use lower values so they do not touch the orange frame; compact marks can go higher.
 * Default is large in-frame; tune per-domain when a mark clips or still looks small.
 */
export const DEFAULT_FEATURED_HOME_LOGO_UI_SCALE = 1.4;

const FEATURED_HOME_LOGO_UI_SCALE_BY_KEY: Partial<Record<string, number>> = {
  // Long / wide wordmarks — largest safe scale without hitting orange border
  'northropgrumman-com': 1.22,
  'bankofamerica-com': 1.24,
  'microsoft-com': 1.26,
  'att-com': 1.26,
  'boeing-com': 1.26,
  'nestle-com': 1.24,
  'pfizer-com': 1.28,
  'fedex-com': 1.3,
  'google-com': 1.28,
  'coca-cola-com': 1.28,
  'se-com': 1.28,
  // Medium width
  'wellsfargo-com': 1.38,
  'ups-com': 1.38,
  'toyota-com': 1.34,
  'samsung-com': 1.38,
  // Compact marks — fill frame aggressively; padding keeps air from border
  'nike-com': 1.52,
  'mcdonalds-com': 1.48,
  'amd-com': 1.46,
  'ford-com': 1.48
};

export function featuredHomeLogoUiScale(brandDomain: string): number {
  const key = brandDomainToLogoFileKey(brandDomain);
  return FEATURED_HOME_LOGO_UI_SCALE_BY_KEY[key] ?? DEFAULT_FEATURED_HOME_LOGO_UI_SCALE;
}
