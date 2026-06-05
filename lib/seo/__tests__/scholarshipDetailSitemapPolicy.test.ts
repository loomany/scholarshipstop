import assert from 'node:assert/strict';
import test from 'node:test';

import { getScholarshipDetailSitemapDecision } from '@/lib/seo/scholarshipDetailSitemapPolicy';
import type { ScholarshipRow } from '@/lib/scholarships/supabase';

function row(
  patch: Partial<ScholarshipRow> = {}
): Partial<ScholarshipRow> & Pick<ScholarshipRow, 'id' | 'slug'> {
  return {
    id: 'scholarship-1',
    slug: 'indexable-scholarship',
    title: 'Indexable Scholarship',
    source: 'Example Catalog',
    provider_name: 'Example Provider',
    provider_url: 'https://example.org',
    provider_mission:
      'Example Provider funds scholarships for students with documented education plans.',
    apply_url: 'https://example.org/apply',
    award_amount_text: '$1,000',
    award_amount_numeric_sort: 1000,
    deadline_text: 'December 31, 2026',
    deadline_date: '2026-12-31',
    is_recurring: false,
    requirements_count: 2,
    requirements_text:
      'Open to students who are enrolled in an accredited program and meet the provider eligibility rules.',
    requirements_text_clean:
      'Open to students who are enrolled in an accredited program and meet the provider eligibility rules.',
    documents_required: ['Transcript', 'Essay'],
    document_required: true,
    essay_required: true,
    summary_short:
      'A focused scholarship listing with enough structured public facts for sitemap inclusion.',
    is_indexable: true,
    updated_at: '2026-06-01T00:00:00.000Z',
    ...patch
  };
}

test('scholarship detail sitemap includes indexable detail rows', () => {
  const result = getScholarshipDetailSitemapDecision(row());

  assert.equal(result.include, true);
  assert.deepEqual(result.reasonCodes, ['detail_policy_indexable']);
});

test('scholarship detail sitemap excludes weak detail rows', () => {
  const result = getScholarshipDetailSitemapDecision(
    row({
      requirements_count: 0,
      requirements_text: null,
      requirements_text_clean: null,
      eligibility_text: null,
      documents_required: null,
      document_required: false,
      essay_required: false,
      transcript_required: false,
      recommendation_required: false,
      provider_mission: null
    })
  );

  assert.equal(result.include, false);
  assert.equal(result.reasonCodes.includes('missing_eligibility'), true);
  assert.equal(
    result.reasonCodes.includes('missing_distinctive_detail_block'),
    true
  );
});

test('scholarship detail sitemap excludes expired detail rows before policy work', () => {
  const result = getScholarshipDetailSitemapDecision(
    row({
      deadline_text: 'May 1, 2024',
      deadline_date: '2024-05-01'
    })
  );

  assert.equal(result.include, false);
  assert.equal(result.reasonCodes.includes('expired_date_guard'), true);
});

test('scholarship detail sitemap surfaces missing policy fields', () => {
  const result = getScholarshipDetailSitemapDecision(
    row({
      summary_short: null
    })
  );

  assert.equal(result.include, false);
  assert.equal(result.reasonCodes.includes('missing_original_summary'), true);
});

test('scholarship detail sitemap excludes count-only thin detail pages', () => {
  const result = getScholarshipDetailSitemapDecision(
    row({
      provider_mission: null,
      requirements_text: null,
      requirements_text_clean: null,
      requirements_count: 2,
      documents_required: null,
      document_required: false,
      essay_required: false,
      transcript_required: false,
      recommendation_required: false,
      study_levels: null,
      field_of_study: null,
      applicant_country_codes: null,
      host_country_codes: null
    })
  );

  assert.equal(result.include, false);
  assert.equal(result.reasonCodes.includes('missing_eligibility'), true);
  assert.equal(
    result.reasonCodes.includes('missing_distinctive_detail_block'),
    true
  );
});

test('scholarship detail sitemap requires an application destination', () => {
  const result = getScholarshipDetailSitemapDecision(
    row({
      provider_url: null,
      apply_url: null,
      url: null
    })
  );

  assert.equal(result.include, false);
  assert.equal(result.reasonCodes.includes('source_needs_confirmation'), true);
});
