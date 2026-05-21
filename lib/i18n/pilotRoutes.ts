import type { SupportedLocale } from '@/lib/i18n/types';
import { localizedPath, normalizeCanonicalPath, stripLocalePrefix } from '@/lib/i18n/paths';
import { STAGE2_EXTENDED_STATIC_PATHS } from '@/lib/i18n/stage2ExtendedStaticPaths';

export const STAGE2_PILOT_LOCALES = ['es', 'fr'] as const;
export type Stage2PilotLocale = (typeof STAGE2_PILOT_LOCALES)[number];

export const STAGE2_PILOT_LANGUAGE_LABELS: Record<
  Stage2PilotLocale | 'en',
  string
> = {
  en: 'English',
  es: 'Español',
  fr: 'Français'
};

export const STAGE2_PILOT_CANONICAL_PATHS = [
  '/',
  '/scholarships',
  '/essays',
  '/providers',
  '/compare',
  '/resources',
  '/about',
  '/editorial-policy',
  '/scholarship-verification-methodology',
  '/how-we-rank-scholarships',
  '/how-scholarshiptop-works',
  '/financial-aid-disclaimer',
  '/contact',
  '/corrections',
  '/scholarship-scam-warning',
  '/how-we-make-money',
  '/essays/examples',
  '/essays/checklist',
  '/essays/financial-need',
  '/essays/career-goals',
  '/essays/mistakes',
  '/compare/scholarship-vs-grant',
  '/compare/merit-vs-need-based-scholarships',
  '/compare/no-essay-vs-essay-scholarships',
  '/compare/local-vs-national-scholarships',
  ...STAGE2_EXTENDED_STATIC_PATHS
] as const;

export type Stage2PilotCanonicalPath =
  (typeof STAGE2_PILOT_CANONICAL_PATHS)[number];

const PILOT_LOCALE_SET = new Set<string>(STAGE2_PILOT_LOCALES);
const PILOT_PATH_SET = new Set<string>(STAGE2_PILOT_CANONICAL_PATHS);

export function isStage2PilotLocale(
  value: unknown
): value is Stage2PilotLocale {
  return typeof value === 'string' && PILOT_LOCALE_SET.has(value);
}

export function isStage2PilotCanonicalPath(
  value: unknown
): value is Stage2PilotCanonicalPath {
  if (typeof value !== 'string') return false;
  return PILOT_PATH_SET.has(normalizeCanonicalPath(value));
}

export function pilotCanonicalPathFromSegments(
  segments: readonly string[] | undefined
): string {
  if (!segments || segments.length === 0) return '/';
  const decoded = segments
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean);
  return normalizeCanonicalPath(`/${decoded.join('/')}`);
}

export function getStage2LocaleFromPathname(
  pathname: string
): Stage2PilotLocale | null {
  const first = normalizeCanonicalPath(pathname).split('/').filter(Boolean)[0];
  return isStage2PilotLocale(first) ? first : null;
}

export function stage2CanonicalPathFromPathname(pathname: string): string {
  return stripLocalePrefix(pathname);
}

export function localizedHrefForPilotPath(
  locale: Stage2PilotLocale | 'en',
  canonicalPath: string
): string | null {
  const normalized = normalizeCanonicalPath(canonicalPath);
  if (!isStage2PilotCanonicalPath(normalized)) return null;
  return localizedPath(locale as SupportedLocale, normalized);
}

export type Stage2LanguageSwitcherItem = {
  locale: Stage2PilotLocale | 'en';
  label: string;
  href: string;
  current: boolean;
};
