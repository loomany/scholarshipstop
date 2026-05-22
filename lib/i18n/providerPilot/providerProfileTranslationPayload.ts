/**
 * Expected `content_translations` payload shape for source_type = provider_profile.
 * source_id = providers.id (UUID). translated_slug optional; defaults to English slug.
 */
export type ProviderProfileFaqTranslationItem = {
  question: string;
  answer: string;
};

export type ProviderProfileTranslationPayload = {
  translated_title: string;
  translated_meta_title?: string | null;
  translated_meta_description?: string | null;
  translated_summary?: string | null;
  /** Plain text; split on blank lines for about paragraphs (max 2 rendered). */
  translated_body: string;
  translated_faq_json?: ProviderProfileFaqTranslationItem[] | null;
  translated_slug?: string | null;
  /** Optional UI chrome overrides (CTA labels, section headings). */
  translated_extra_json?: Record<string, unknown> | null;
};
