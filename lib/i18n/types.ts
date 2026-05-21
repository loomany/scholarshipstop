export type {
  LocaleDirection,
  RtlLocale,
  SupportedLocale
} from '@/lib/i18n/locales';

export type TranslationStatus =
  | 'missing'
  | 'queued'
  | 'draft_machine'
  | 'draft_agent'
  | 'review_required'
  | 'reviewed'
  | 'published'
  | 'stale'
  | 'blocked';

export type LocalizedAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

export type TranslationSeoRobots = 'index, follow' | 'noindex, follow';

export type TranslatedPageSeoDecision = {
  indexable: boolean;
  robots: TranslationSeoRobots;
  includeInSitemap: boolean;
  includeInHreflang: boolean;
  reasons: string[];
};
