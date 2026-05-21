import { getTranslationSourceHash } from '@/lib/i18n/contentTranslationsServer';

/** Stable hash from EN fields used for staleness detection. */
export function buildResourceSourceHash(input: {
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  body_html: string | null;
  faq: unknown;
  updated_at: string | null;
}): string {
  return getTranslationSourceHash({
    title: input.title,
    metaTitle: input.meta_title,
    metaDescription: input.meta_description,
    bodyHtml: input.body_html,
    faq: input.faq,
    updatedAt: input.updated_at
  });
}
