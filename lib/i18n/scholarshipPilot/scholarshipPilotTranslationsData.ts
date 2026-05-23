import { createHash } from 'node:crypto';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  buildScholarshipPilotLocaleContent,
  type ScholarshipPilotFacts
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotContentFactory';
import {
  scholarshipPilotSlugsForBatch,
  type ScholarshipDetailPilotSlug,
  type ScholarshipPilotBatchId
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';

export type ScholarshipDetailFaqTranslationItem = {
  question: string;
  answer: string;
};

export type ScholarshipDetailPilotSeedRow = {
  source_type: 'scholarship_detail';
  source_id: string;
  source_slug: string;
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
  translated_faq_json: ScholarshipDetailFaqTranslationItem[];
  translated_extra_json: { disclaimer: string };
  machine_model: string;
};

const QUALITY_SCORE = 90;

/** Legacy 5E-1/5E-2 pilots only; scale-up batches load facts from DB at seed time. */
const SCHOLARSHIP_FACTS: Partial<Record<ScholarshipDetailPilotSlug, ScholarshipPilotFacts>> = {
  'climate-stripes-scholarship-14487': {
    officialTitle: 'Climate Stripes Scholarship',
    provider: 'University of Reading',
    amount: '10000 GBP',
    deadline: '29 May 2026'
  },
  'china-university-of-petroleum-scholarship-1461': {
    officialTitle: 'China University of Petroleum Scholarship',
    provider: 'China University of Petroleum-Beijing',
    amount: '25000 CNY',
    deadline: '30 May 2026'
  },
  'creative-arts-scholarship-8932': {
    officialTitle: 'Creative Arts Scholarship',
    provider: 'For a Bright Future Foundation',
    amount: '10000 USD',
    deadline: '30 Jun 2026'
  },
  'fintech-innovation-scholarship-8931': {
    officialTitle: 'Fintech Innovation Scholarship',
    provider: 'For a Bright Future Foundation',
    amount: '10000 USD',
    deadline: '30 Jun 2026'
  },
  'healthcare-scholarship-8928': {
    officialTitle: 'Healthcare Scholarship',
    provider: 'For a Bright Future Foundation',
    amount: '10000 USD',
    deadline: '30 Jun 2026'
  },
  'vice-chancellor-s-scholarship-2905': {
    officialTitle: "Vice-Chancellor's Scholarship",
    provider: 'Bangor University',
    amount: '10000 GBP',
    deadline: '29 May 2026'
  }
};

function buildSourceHash(
  slug: string,
  facts: ScholarshipPilotFacts,
  updatedAt: string | null
): string {
  const stable = JSON.stringify(
    { slug, title: facts.officialTitle, updated_at: updatedAt },
    Object.keys({ slug, title: facts.officialTitle, updated_at: updatedAt }).sort()
  );
  return createHash('sha256').update(stable).digest('hex');
}

export function buildScholarshipDetailPilotSeedRowsForSlugs(
  slugToMeta: Map<string, { id: string; updated_at: string | null }>,
  slugs: readonly string[],
  factsBySlug: Map<string, ScholarshipPilotFacts>,
  machineModel: string,
  publishedAt: string
): ScholarshipDetailPilotSeedRow[] {
  const rows: ScholarshipDetailPilotSeedRow[] = [];
  for (const slug of slugs) {
    const meta = slugToMeta.get(slug);
    const facts = factsBySlug.get(slug) ?? SCHOLARSHIP_FACTS[slug as ScholarshipDetailPilotSlug];
    if (!meta || !facts) {
      continue;
    }
    for (const locale of ['es', 'fr'] as const) {
      const content = buildScholarshipPilotLocaleContent(facts, locale);
      rows.push({
        source_type: 'scholarship_detail',
        source_id: meta.id,
        source_slug: slug,
        locale,
        status: 'published',
        source_hash: buildSourceHash(slug, facts, meta.updated_at),
        source_updated_at: meta.updated_at,
        quality_score: QUALITY_SCORE,
        published_at: publishedAt,
        translated_slug: null,
        translated_title: facts.officialTitle.trim() || slug,
        translated_meta_title: content.translated_meta_title,
        translated_meta_description: content.translated_meta_description,
        translated_summary: content.translated_summary,
        translated_body: content.translated_body,
        translated_faq_json: content.translated_faq_json,
        translated_extra_json: { disclaimer: content.disclaimer },
        machine_model: machineModel
      });
    }
  }
  return rows;
}

export function buildScholarshipDetailPilotSeedRows(
  slugToMeta: Map<string, { id: string; updated_at: string | null }>,
  batch: ScholarshipPilotBatchId,
  machineModel: string,
  publishedAt: string
): ScholarshipDetailPilotSeedRow[] {
  const slugs = scholarshipPilotSlugsForBatch(batch);
  const factsBySlug = new Map<string, ScholarshipPilotFacts>();
  for (const slug of slugs) {
    const f = SCHOLARSHIP_FACTS[slug as ScholarshipDetailPilotSlug];
    if (f) factsBySlug.set(slug, f);
  }
  return buildScholarshipDetailPilotSeedRowsForSlugs(
    slugToMeta,
    slugs,
    factsBySlug,
    machineModel,
    publishedAt
  );
}
