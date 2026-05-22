import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyScholarshipDetailTranslation,
  isPublishedScholarshipDetailTranslation
} from '@/lib/i18n/scholarshipPilot/scholarshipDetailTranslationGate';
import { getDetailLanguageSwitcherItems } from '@/lib/i18n/detailLanguageSwitcher';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';

const baseScholarship: Scholarship = {
  id: '99145773-6fc4-41c7-95a3-dcaafde5637b',
  title: 'Climate Stripes Scholarship',
  country: 'USA',
  deadline: '29 May 2026',
  description: 'English description',
  eligibility: ['Merit-based'],
  benefits: '',
  howToApply: [],
  summaryShort: 'English short',
  seoOverview: 'English overview',
  aiStudentSummary: 'English AI'
};

const translation: ContentTranslationRow = {
  id: 't1',
  source_type: 'scholarship_detail',
  source_id: baseScholarship.id,
  locale: 'es',
  source_hash: null,
  source_updated_at: null,
  status: 'published',
  translated_slug: null,
  translated_title: 'Climate Stripes Scholarship',
  translated_meta_title: 'Meta ES',
  translated_meta_description: 'Desc ES',
  translated_summary: 'Resumen ES',
  translated_body: 'Cuerpo ES explicativo',
  translated_faq_json: [
    { question: 'Pregunta?', answer: 'Respuesta.' },
    { question: 'Otra?', answer: 'Sí.' }
  ],
  translated_schema_json: null,
  translated_extra_json: null,
  quality_score: 90,
  machine_model: 'stage5e-scholarship-manual-pilot',
  translated_by: null,
  reviewed_by: null,
  reviewer_notes: null,
  published_at: '2026-05-22T16:00:00.000Z',
  stale_at: null,
  blocked_reason: null,
  created_at: '2026-05-22T16:00:00.000Z',
  updated_at: '2026-05-22T16:00:00.000Z'
};

test('isPublishedScholarshipDetailTranslation requires quality and body', () => {
  assert.equal(
    isPublishedScholarshipDetailTranslation(translation, 'climate-stripes-scholarship-14487'),
    true
  );
  assert.equal(
    isPublishedScholarshipDetailTranslation(
      { ...translation, quality_score: 70 },
      'climate-stripes-scholarship-14487'
    ),
    false
  );
});

test('applyScholarshipDetailTranslation keeps official title and clears English AI', () => {
  const merged = applyScholarshipDetailTranslation(baseScholarship, translation);
  assert.equal(merged.title, 'Climate Stripes Scholarship');
  assert.equal(merged.deadline, '29 May 2026');
  assert.equal(merged.seoOverview, 'Cuerpo ES explicativo');
  assert.equal(merged.aiStudentSummary, null);
  assert.equal(merged.seoFaq?.length, 2);
});

test('pilot scholarship slug exposes en/es/fr switcher', () => {
  const items = getDetailLanguageSwitcherItems(
    '/scholarships/climate-stripes-scholarship-14487'
  );
  assert.equal(items.length, 3);
  assert.ok(items.some((i) => i.locale === 'fr'));
});
