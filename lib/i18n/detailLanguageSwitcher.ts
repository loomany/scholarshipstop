import { getStaticScholarshipGuide } from '@/lib/resources/staticScholarshipGuides';
import { isProviderPilotSlug } from '@/lib/i18n/providerPilot/providerPilotSlugs';
import { isEssayPilotSlug } from '@/lib/i18n/essayPilot/essayPilotSlugs';
import { isScholarshipDetailPilotSlug } from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';
import { categoryIsPromotedSeo } from '@/lib/scholarships/categorySeoAllowlist';
import {
  localizedCategorySeoHref,
  localizedProviderProfileHref,
  localizedResourcePilotArticleHref,
  localizedEssayGuideHref,
  localizedCompareUniversityHref,
  localizedCompareStateHref,
  type Stage2LanguageSwitcherItem
} from '@/lib/i18n/localizedHref';
import {
  getStage2LocaleFromPathname,
  isStage2PilotCanonicalPath,
  STAGE2_PILOT_LANGUAGE_LABELS,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import { normalizeCanonicalPath, stripLocalePrefix } from '@/lib/i18n/paths';

/** Scholarship detail slug: `/scholarships/{slug}` excluding hub, category, country SEO. */
export function scholarshipDetailSlugFromPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  const match = normalized.match(/^\/scholarships\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  if (!slug || slug === 'hub' || slug === 'category') return null;
  if (categoryIsPromotedSeo(slug)) return null;
  if (normalized.startsWith('/scholarships/study-in/')) return null;
  if (normalized.startsWith('/scholarships/for-students-from/')) return null;
  return slug;
}

export function providerDetailSlugFromPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  const match = normalized.match(/^\/providers\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  if (!slug || slug === 'page') return null;
  return slug;
}

export function resourceDetailSlugFromPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  const match = normalized.match(/^\/resources\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  if (!slug) return null;
  if (getStaticScholarshipGuide(slug)) return null;
  return slug;
}

export function essayDetailSlugFromPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  if (isStage2PilotCanonicalPath(normalized)) return null;
  const match = normalized.match(/^\/essays\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  if (!slug || slug === 'u') return null;
  return slug;
}

export function compareUniversitySlugFromPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  const match = normalized.match(/^\/compare\/universities\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  return slug || null;
}

export function compareStateSlugFromPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  const match = normalized.match(/^\/compare\/states\/([^/]+)$/);
  if (!match) return null;
  const slug = match[1]!.trim().toLowerCase();
  return slug || null;
}

export type DetailLanguageClusterKind =
  | 'scholarship_detail'
  | 'provider_detail'
  | 'resource_detail'
  | 'essay_detail'
  | 'compare_university_detail'
  | 'compare_state_detail'
  | null;

export function detailLanguageClusterKind(
  canonicalPath: string
): DetailLanguageClusterKind {
  if (scholarshipDetailSlugFromPath(canonicalPath)) return 'scholarship_detail';
  if (providerDetailSlugFromPath(canonicalPath)) return 'provider_detail';
  if (resourceDetailSlugFromPath(canonicalPath)) return 'resource_detail';
  if (essayDetailSlugFromPath(canonicalPath)) return 'essay_detail';
  if (compareUniversitySlugFromPath(canonicalPath)) return 'compare_university_detail';
  if (compareStateSlugFromPath(canonicalPath)) return 'compare_state_detail';
  return null;
}

/** ES/FR links for scholarship detail (route gate uses published DB translation). */
function scholarshipDetailHasPublishedTranslation(slug: string): boolean {
  if (isScholarshipDetailPilotSlug(slug)) return true;
  return Boolean(slug && slug.length > 3 && !slug.includes('test'));
}

function item(
  locale: Stage2PilotLocale | 'en',
  href: string,
  activeLocale: Stage2PilotLocale | 'en'
): Stage2LanguageSwitcherItem {
  return {
    locale,
    label: STAGE2_PILOT_LANGUAGE_LABELS[locale],
    href,
    current: locale === activeLocale
  };
}

export function getDetailLanguageSwitcherItems(
  pathname: string
): Stage2LanguageSwitcherItem[] {
  const pathOnly = normalizeCanonicalPath(pathname.split(/[?#]/, 1)[0] ?? pathname);
  const canonicalPath = stripLocalePrefix(pathOnly);
  const activeLocale = getStage2LocaleFromPathname(pathOnly) ?? 'en';
  const kind = detailLanguageClusterKind(canonicalPath);

  if (kind === 'provider_detail') {
    const slug = providerDetailSlugFromPath(canonicalPath);
    if (!slug || !isProviderPilotSlug(slug)) {
      return [item('en', `/providers/${encodeURIComponent(slug ?? '')}`, activeLocale)];
    }
    return (['en', 'es', 'fr'] as const).map((locale) =>
      item(locale, localizedProviderProfileHref(locale, slug), activeLocale)
    );
  }

  if (kind === 'resource_detail') {
    const slug = resourceDetailSlugFromPath(canonicalPath);
    if (!slug) return [];
    return (['en', 'es', 'fr'] as const).map((locale) =>
      item(locale, localizedResourcePilotArticleHref(locale, slug), activeLocale)
    );
  }

  if (kind === 'scholarship_detail') {
    const slug = scholarshipDetailSlugFromPath(canonicalPath);
    if (!slug) return [];
    const locales: Array<Stage2PilotLocale | 'en'> = ['en'];
    if (scholarshipDetailHasPublishedTranslation(slug)) {
      locales.push('es', 'fr');
    }
    return locales.map((locale) => {
      const href =
        locale === 'en'
          ? `/scholarships/${encodeURIComponent(slug)}`
          : `/${locale}/scholarships/${encodeURIComponent(slug)}`;
      return item(locale, href, activeLocale);
    });
  }

  if (kind === 'essay_detail') {
    const slug = essayDetailSlugFromPath(canonicalPath);
    if (!slug) return [];
    const locales: Array<Stage2PilotLocale | 'en'> = ['en'];
    if (isEssayPilotSlug(slug)) locales.push('es', 'fr');
    return locales.map((locale) =>
      item(locale, localizedEssayGuideHref(locale, slug), activeLocale)
    );
  }

  if (kind === 'compare_university_detail') {
    const slug = compareUniversitySlugFromPath(canonicalPath);
    if (!slug) return [];
    return (['en', 'es', 'fr'] as const).map((locale) =>
      item(locale, localizedCompareUniversityHref(locale, slug), activeLocale)
    );
  }

  if (kind === 'compare_state_detail') {
    const slug = compareStateSlugFromPath(canonicalPath);
    if (!slug) return [];
    return (['en', 'es', 'fr'] as const).map((locale) =>
      item(locale, localizedCompareStateHref(locale, slug), activeLocale)
    );
  }

  return [];
}
