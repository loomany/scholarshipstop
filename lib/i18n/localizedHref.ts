import { tabToHubPath, type ScholarshipHubPathTabInput } from '@/app/scholarships/scholarshipHubPath';
import { localizedPath, normalizeCanonicalPath } from '@/lib/i18n/paths';
import {
  getStage2LocaleFromPathname,
  isStage2PilotCanonicalPath,
  STAGE2_PILOT_LANGUAGE_LABELS,
  STAGE2_PILOT_LOCALES,
  stage2CanonicalPathFromPathname,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import {
  localizedSubscriptionPath,
  SUBSCRIPTION_CANONICAL_PATH
} from '@/lib/i18n/subscriptionPageCopy';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';
import { isResourcePilotSlug } from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
import { categoryIsPromotedSeo } from '@/lib/scholarships/categorySeoAllowlist';

export type LocalizedUiLocale = Stage2PilotLocale | 'en';

const STAGE2_PILOT_HUB_PATHS = new Set([
  '/',
  '/scholarships',
  '/essays',
  '/providers',
  '/compare',
  '/resources'
]);

/**
 * Canonical helper for public UI links.
 * - `en` → unprefixed canonical path (always).
 * - `es` / `fr` → `/es/...` or `/fr/...` only when a published localized page exists.
 * - Never returns `/en/...`.
 * - Returns `null` when no localized target (callers should hide the link).
 */
export function localizedPilotHref(
  locale: LocalizedUiLocale,
  canonicalPath: string
): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  if (locale === 'en') return normalized;
  if (!isStage2PilotCanonicalPath(normalized)) return null;
  if (!getLocalizedPilotPage(locale, normalized)) return null;
  return localizedPath(locale, normalized);
}

/** @see localizedPilotHref */
export function hrefForLocalizedUi(
  locale: LocalizedUiLocale,
  canonicalPath: string
): string | null {
  return localizedPilotHref(locale, canonicalPath);
}

/** For breadcrumbs/JSON-LD on localized pages where the path is always published. */
export function hrefForLocalizedUiRequired(
  locale: LocalizedUiLocale,
  canonicalPath: string
): string {
  const funnel = localizedFunnelHref(locale, canonicalPath);
  if (funnel) return funnel;
  const querySplit = canonicalPath.match(/^([^?#]*)([?#].*)?$/);
  const pathOnly = querySplit?.[1] ?? canonicalPath;
  const suffix = querySplit?.[2] ?? '';
  const hubTabMatch = pathOnly.match(/^\/scholarships\/hub\/([^/]+)$/);
  if (hubTabMatch && locale !== 'en') {
    return `${localizedScholarshipHubTabHref(
      locale,
      hubTabMatch[1] as Parameters<typeof localizedScholarshipHubTabHref>[1]
    )}${suffix}`;
  }
  const localized = hrefForLocalizedUi(locale, pathOnly);
  if (localized) return `${localized}${suffix}`;
  const resourceSlug = resourcePilotArticleSlug(pathOnly);
  if (resourceSlug && locale !== 'en') {
    return `${localizedResourcePilotArticleHref(locale, resourceSlug)}${suffix}`;
  }
  const providerSlug = providerProfileDetailSlug(pathOnly);
  if (providerSlug && locale !== 'en') {
    return `${localizedProviderProfileHref(locale, providerSlug)}${suffix}`;
  }
  if (locale !== 'en') {
    if (pathOnly === '/') return `/${locale}${suffix}`;
    if (STAGE2_PILOT_HUB_PATHS.has(pathOnly)) {
      return `/${locale}${pathOnly}${suffix}`;
    }
    if (isLocalizedCompareSubhubPath(pathOnly)) {
      return `/${locale}${pathOnly}${suffix}`;
    }
  }
  return `${normalizeCanonicalPath(pathOnly)}${suffix}`;
}

/**
 * Locale-aware href for Stage 2 funnel paths (`/get-scholarships`, `/signin/*`).
 * Preserves query string. Returns `null` for non-funnel paths or `en`.
 */
export function localizedFunnelHref(
  locale: LocalizedUiLocale,
  href: string
): string | null {
  if (locale === 'en') return null;
  const [pathPart, ...rest] = href.split(/(?=[?#])/);
  const path = normalizeCanonicalPath(pathPart ?? href);
  if (!isLocalizedFunnelPath(path)) return null;
  const suffix = rest.join('');
  return `/${locale}${path}${suffix}`;
}

export function sectionPathForLocale(
  locale: LocalizedUiLocale,
  canonicalPath: string
): string {
  if (locale === 'en') return normalizeCanonicalPath(canonicalPath);
  return (
    localizedPilotHref(locale, canonicalPath) ??
    normalizeCanonicalPath(canonicalPath)
  );
}

/** Hub tab path with locale prefix when `/es|fr/scholarships` is published. */
export function localizedScholarshipHubTabHref(
  locale: LocalizedUiLocale,
  tab: ScholarshipHubPathTabInput
): string {
  const hubPath = tabToHubPath(tab);
  if (locale === 'en') return hubPath;
  // Dynamic `[locale]/scholarships/[[...slugPath]]` always exists for ES/FR pilot.
  const hubRoot =
    localizedPilotHref(locale, '/scholarships') ?? `/${locale}/scholarships`;
  return `${hubRoot}${hubPath.slice('/scholarships'.length)}`;
}

/**
 * Prefix ES/FR on browser hub catalog pathnames from `buildHubCatalogBrowserUrl`
 * (e.g. `/scholarships/hub/matches` → `/es/scholarships/hub/matches`).
 */
export function localizedHubCatalogBrowserPath(
  locale: LocalizedUiLocale,
  englishPathname: string
): string {
  if (locale === 'en') return englishPathname;
  const [pathPart, ...rest] = englishPathname.split(/(?=[?#])/);
  const canonical = normalizeCanonicalPath(pathPart ?? englishPathname);
  const suffix = rest.join('');
  if (canonical === '/scholarships') {
    const hubRoot =
      localizedPilotHref(locale, '/scholarships') ?? `/${locale}/scholarships`;
    return `${hubRoot}${suffix}`;
  }
  const hubTabMatch = canonical.match(/^\/scholarships\/hub\/([^/]+)$/);
  if (hubTabMatch) {
    return `${localizedScholarshipHubTabHref(
      locale,
      hubTabMatch[1] as ScholarshipHubPathTabInput
    )}${suffix}`;
  }
  return englishPathname;
}

/** Only for audit tooling — never use in ES/FR public nav. */
export function localizedPilotHrefWithEnglishFallback(
  locale: LocalizedUiLocale,
  canonicalPath: string
): string {
  return localizedPilotHref(locale, canonicalPath) ?? normalizeCanonicalPath(canonicalPath);
}

export type Stage2LanguageSwitcherItem = {
  locale: Stage2PilotLocale | 'en';
  label: string;
  href: string;
  current: boolean;
};

/**
 * Hub tab paths (`/scholarships/hub/<tab>`) are not in `STAGE2_PILOT_CANONICAL_PATHS`
 * because they share a catch-all `[locale]/scholarships/[[...slugPath]]` route, but
 * they DO have ES/FR equivalents via `localizedScholarshipHubTabHref`.
 */
function hubTabSegment(canonicalPath: string): ScholarshipHubPathTabInput | null {
  const match = canonicalPath.match(/^\/scholarships\/hub\/([^/]+)$/);
  if (!match) return null;
  return match[1] as ScholarshipHubPathTabInput;
}

/** Stage 4D resource_article pilot (`/resources/{slug}` with published ES/FR). */
function resourcePilotArticleSlug(canonicalPath: string): string | null {
  const match = canonicalPath.match(/^\/resources\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  return isResourcePilotSlug(slug) ? slug : null;
}

export function localizedResourcePilotArticleHref(
  locale: LocalizedUiLocale,
  slug: string
): string {
  const path = `/resources/${slug}`;
  if (locale === 'en') return normalizeCanonicalPath(path);
  return normalizeCanonicalPath(`/${locale}${path}`);
}

/** Provider detail (`/providers/{slug}`) with published ES/FR translation gate on route. */
function providerProfileDetailSlug(canonicalPath: string): string | null {
  const match = canonicalPath.match(/^\/providers\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  if (!slug || slug === 'page') return null;
  return slug;
}

export function localizedProviderProfileHref(
  locale: LocalizedUiLocale,
  slug: string
): string {
  const path = `/providers/${slug}`;
  if (locale === 'en') return normalizeCanonicalPath(path);
  return normalizeCanonicalPath(`/${locale}${path}`);
}

/** Promoted L1 category SEO (`/scholarships/category/{id}`) with DB pilot translations. */
function categorySeoSlug(canonicalPath: string): string | null {
  const match = canonicalPath.match(/^\/scholarships\/category\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  return categoryIsPromotedSeo(slug) ? slug : null;
}

export function localizedCategorySeoHref(
  locale: LocalizedUiLocale,
  categorySlug: string
): string {
  const path = `/scholarships/category/${categorySlug}`;
  if (locale === 'en') return normalizeCanonicalPath(path);
  return normalizeCanonicalPath(`/${locale}${path}`);
}

/** Locale-aware public pricing page (`/subscription`, `/es/subscription`, `/fr/subscription`). */
export function localizedSubscriptionHref(locale: LocalizedUiLocale): string {
  return localizedSubscriptionPath(locale);
}

export function isLocalizedSubscriptionPath(path: string): boolean {
  const normalized = normalizeCanonicalPath(path.split(/[?#]/, 1)[0] ?? path);
  return (
    normalized === SUBSCRIPTION_CANONICAL_PATH ||
    normalized.startsWith(`${SUBSCRIPTION_CANONICAL_PATH}/`)
  );
}

/** Compare sub-hubs (English DB listings; localized URL + chrome). */
export function isLocalizedCompareSubhubPath(path: string): boolean {
  const normalized = normalizeCanonicalPath(path.split(/[?#]/, 1)[0] ?? path);
  return (
    normalized === '/compare/universities' ||
    normalized === '/compare/states' ||
    normalized.startsWith('/compare/universities/') ||
    normalized.startsWith('/compare/states/')
  );
}

export function getStage2LanguageSwitcherItems({
  pathname,
  currentLocale: _currentLocale
}: {
  pathname: string;
  currentLocale?: Stage2PilotLocale | 'en' | null;
}): Stage2LanguageSwitcherItem[] {
  const canonicalPath = stage2CanonicalPathFromPathname(pathname);
  const hubTab = hubTabSegment(canonicalPath);
  const categorySlug = categorySeoSlug(canonicalPath);
  const resourceSlug = resourcePilotArticleSlug(canonicalPath);
  const isSubscription = isLocalizedSubscriptionPath(canonicalPath);
  const isPilot =
    isStage2PilotCanonicalPath(canonicalPath) ||
    isLocalizedCompareSubhubPath(canonicalPath);
  if (!isPilot && !hubTab && !isSubscription && !categorySlug && !resourceSlug) {
    return [];
  }

  const activeLocale = getStage2LocaleFromPathname(pathname) ?? 'en';

  if (isLocalizedCompareSubhubPath(canonicalPath)) {
    const locales = ['en', ...STAGE2_PILOT_LOCALES] as const;
    return locales
      .map((locale) => ({
        locale,
        label: STAGE2_PILOT_LANGUAGE_LABELS[locale],
        href: hrefForLocalizedUiRequired(locale, canonicalPath),
        current: locale === activeLocale
      }))
      .filter(
        (item) => !item.href.includes('/en/') && !item.href.startsWith('/en')
      );
  }

  if (categorySlug) {
    const locales = ['en', ...STAGE2_PILOT_LOCALES] as const;
    return locales
      .map((locale) => ({
        locale,
        label: STAGE2_PILOT_LANGUAGE_LABELS[locale],
        href: localizedCategorySeoHref(locale, categorySlug),
        current: locale === activeLocale
      }))
      .filter(
        (item) => !item.href.includes('/en/') && !item.href.startsWith('/en')
      );
  }

  if (resourceSlug) {
    const locales = ['en', ...STAGE2_PILOT_LOCALES] as const;
    return locales
      .map((locale) => ({
        locale,
        label: STAGE2_PILOT_LANGUAGE_LABELS[locale],
        href: localizedResourcePilotArticleHref(locale, resourceSlug),
        current: locale === activeLocale
      }))
      .filter(
        (item) => !item.href.includes('/en/') && !item.href.startsWith('/en')
      );
  }

  const locales = ['en', ...STAGE2_PILOT_LOCALES] as const;

  return locales
    .map((locale) => {
      const href = isSubscription
        ? localizedSubscriptionHref(locale)
        : hubTab
          ? localizedScholarshipHubTabHref(locale, hubTab)
          : localizedPilotHref(locale, canonicalPath) ??
            (isLocalizedCompareSubhubPath(canonicalPath)
              ? hrefForLocalizedUiRequired(locale, canonicalPath)
              : null);
      return href
        ? {
            locale,
            label: STAGE2_PILOT_LANGUAGE_LABELS[locale],
            href,
            current: locale === activeLocale
          }
        : null;
    })
    .filter(
      (item): item is Stage2LanguageSwitcherItem =>
        item != null && !item.href.includes('/en/') && !item.href.startsWith('/en')
    );
}

/**
 * Internal links that intentionally stay on English (no ES/FR static page).
 * Locale link audits treat these as allowed when explicitly marked.
 *
 * Funnel/auth paths that DO have a localized wrapper (`/get-scholarships`,
 * `/signin/*`) are intentionally excluded here — ES/FR pages must link to the
 * locale-prefixed version, not the English root.
 */
export function isExplicitEnglishOnlyInternalLink(href: string): boolean {
  const path = normalizeCanonicalPath(href.split(/[?#]/, 1)[0] ?? href);
  if (path.startsWith('/en') || path === '/en') return false;
  if (STAGE2_PILOT_HUB_PATHS.has(path)) return false;

  if (
    path.startsWith('/es/') ||
    path.startsWith('/fr/') ||
    path === '/es' ||
    path === '/fr'
  ) {
    return false;
  }

  if (path.startsWith('/scholarships/hub/')) return false;
  if (path.startsWith('/scholarships/') && path !== '/scholarships') return true;
  if (path.startsWith('/providers/') && path !== '/providers') return true;

  if (isLocalizedSubscriptionPath(path)) return false;

  return (
    path === '/account' ||
    path.startsWith('/account/') ||
    path === '/onboarding' ||
    path.startsWith('/onboarding/') ||
    path.startsWith('/auth/') ||
    path === '/essay' ||
    path.startsWith('/essay/') ||
    path.startsWith('/iq/')
  );
}

const LOCALIZED_FUNNEL_PATHS = new Set([
  '/get-scholarships',
  '/signin',
  '/signin/password_signin',
  '/signin/email_signin',
  '/signin/forgot_password',
  '/signin/signup',
  SUBSCRIPTION_CANONICAL_PATH
]);

/**
 * Returns true if a non-`en` locale link to this English path should be
 * rewritten to the locale-prefixed equivalent (e.g. `/es/get-scholarships`).
 */
export function isLocalizedFunnelPath(path: string): boolean {
  const normalized = normalizeCanonicalPath(path);
  return LOCALIZED_FUNNEL_PATHS.has(normalized);
}
