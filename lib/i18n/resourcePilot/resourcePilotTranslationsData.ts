import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildResourceSourceHash } from '@/lib/i18n/resourcePilot/buildResourceSourceHash';
import { PILOT_ARTICLES_CORE } from '@/lib/i18n/resourcePilot/pilotArticlesCore';
import { sectionsToHtml } from '@/lib/i18n/resourcePilot/resourcePilotArticleBuilder';
import {
  RESOURCE_PILOT_SLUGS,
  type ResourcePilotSlug
} from '@/lib/i18n/resourcePilot/resourcePilotSlugs';

export type ResourcePilotSeedRow = {
  source_type: 'resource_article';
  source_id: string;
  source_slug: ResourcePilotSlug;
  locale: ContentTranslationLocale;
  status: 'published';
  source_hash: string;
  source_updated_at: string | null;
  quality_score: number;
  published_at: string;
  translated_slug: null;
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: { question: string; answer: string }[];
  translated_extra_json: Record<string, unknown>;
};

const PUBLISHED_AT = '2026-05-21T12:00:00.000Z';

function extraForLocale(locale: ContentTranslationLocale): Record<string, unknown> {
  if (locale === 'es') {
    return {
      faqSectionTitle: 'Preguntas frecuentes',
      backLabel: '← Volver a recursos',
      resourcesHubLabel: 'Recursos de becas',
      homeLabel: 'Inicio'
    };
  }
  return {
    faqSectionTitle: 'Questions fréquentes',
    backLabel: '← Retour aux ressources',
    resourcesHubLabel: 'Ressources bourses',
    homeLabel: 'Accueil'
  };
}

export function getResourcePilotContent(
  slug: ResourcePilotSlug,
  locale: ContentTranslationLocale
) {
  return PILOT_ARTICLES_CORE[slug][locale];
}

export function buildResourcePilotSeedRows(
  slugToMeta: Map<
    ResourcePilotSlug,
    {
      id: string;
      title: string;
      meta_title: string | null;
      meta_description: string | null;
      body_html: string | null;
      faq: unknown;
      updated_at: string | null;
    }
  >
): ResourcePilotSeedRow[] {
  const rows: ResourcePilotSeedRow[] = [];

  for (const slug of RESOURCE_PILOT_SLUGS) {
    const meta = slugToMeta.get(slug);
    if (!meta) {
      throw new Error(`Missing content_posts row for pilot slug: ${slug}`);
    }
    const sourceHash = buildResourceSourceHash({
      title: meta.title,
      meta_title: meta.meta_title,
      meta_description: meta.meta_description,
      body_html: meta.body_html,
      faq: meta.faq,
      updated_at: meta.updated_at
    });

    for (const locale of ['es', 'fr'] as const) {
      const content = PILOT_ARTICLES_CORE[slug][locale];
      rows.push({
        source_type: 'resource_article',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: sourceHash,
        source_updated_at: meta.updated_at,
        quality_score: 90,
        published_at: PUBLISHED_AT,
        translated_slug: null,
        translated_title: content.translated_title,
        translated_meta_title: content.translated_meta_title,
        translated_meta_description: content.translated_meta_description,
        translated_summary: content.translated_summary,
        translated_body: sectionsToHtml(content.sections),
        translated_faq_json: content.translated_faq_json,
        translated_extra_json: extraForLocale(locale)
      });
    }
  }

  return rows;
}
