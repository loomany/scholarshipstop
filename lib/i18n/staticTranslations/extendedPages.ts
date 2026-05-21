import type { PageDraft } from '@/lib/i18n/staticTranslations/types';
import { STAGE2_EXTENDED_STATIC_PATHS } from '@/lib/i18n/stage2ExtendedStaticPaths';
import { extendedEssayEsPages, extendedEssayFrPages } from '@/lib/i18n/staticTranslations/extendedEssayPages';
import {
  extendedResourceSlugEsPages,
  extendedResourceSlugFrPages
} from '@/lib/i18n/staticTranslations/extendedResourceSlugPages';
import {
  extendedResourceShellEsPages,
  extendedResourceShellFrPages
} from '@/lib/i18n/staticTranslations/extendedResourceShellPages';
import { extendedLegalEsPages, extendedLegalFrPages } from '@/lib/i18n/staticTranslations/extendedLegalPages';
import {
  extendedMarketingEsPages,
  extendedMarketingFrPages
} from '@/lib/i18n/staticTranslations/extendedMarketingPages';

function mergeExtendedPages(
  ...partials: Array<Partial<Record<string, PageDraft>>>
): Record<string, PageDraft> {
  return Object.assign({}, ...partials) as Record<string, PageDraft>;
}

const extendedEsPartial = mergeExtendedPages(
  extendedEssayEsPages,
  extendedResourceSlugEsPages,
  extendedResourceShellEsPages,
  extendedLegalEsPages,
  extendedMarketingEsPages
);

const extendedFrPartial = mergeExtendedPages(
  extendedEssayFrPages,
  extendedResourceSlugFrPages,
  extendedResourceShellFrPages,
  extendedLegalFrPages,
  extendedMarketingFrPages
);

function assertFullCoverage(
  locale: 'es' | 'fr',
  pages: Record<string, PageDraft>
): void {
  const missing = STAGE2_EXTENDED_STATIC_PATHS.filter((path) => !pages[path]);
  if (missing.length > 0) {
    throw new Error(
      `[i18n] Missing ${locale} extended translations for: ${missing.join(', ')}`
    );
  }
}

assertFullCoverage('es', extendedEsPartial);
assertFullCoverage('fr', extendedFrPartial);

export const extendedEsPages = extendedEsPartial as Record<string, PageDraft>;
export const extendedFrPages = extendedFrPartial as Record<string, PageDraft>;

export type { PageDraft } from '@/lib/i18n/staticTranslations/types';
