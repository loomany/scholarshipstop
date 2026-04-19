import test from 'node:test';
import assert from 'node:assert/strict';

import { proposeScholarshipCatalogBackfill } from '../proposeScholarshipCatalogBackfill';
import type { ScholarshipRowForCatalogBackfill } from '../proposeScholarshipCatalogBackfill';

function row(
  over: Partial<ScholarshipRowForCatalogBackfill>
): ScholarshipRowForCatalogBackfill {
  return {
    id: '00000000-0000-0000-0000-000000000099',
    slug: 'test',
    title: 'Test',
    summary_short: null,
    summary_long: null,
    description: null,
    eligibility_text: null,
    requirements_text: null,
    requirements_text_clean: null,
    who_can_apply: null,
    state_territory_text: null,
    institutions_text: null,
    full_content_html: null,
    citizenship_statuses: [],
    catalog_education_levels: [],
    study_levels: [],
    field_of_study: [],
    gpa_bucket: null,
    gpa_requirement_min: null,
    state_codes: [],
    location_tags: [],
    location_scope: null,
    ...over
  };
}

test('infers us_citizen from eligibility text when citizenship_statuses empty', () => {
  const r = row({
    citizenship_statuses: [],
    eligibility_text: 'This scholarship is open to U.S. citizens attending an accredited college.'
  });
  const out = proposeScholarshipCatalogBackfill(r);
  assert.ok(out);
  assert.deepEqual(out!.patch.citizenship_statuses, ['us_citizen']);
});

test('does not add us_citizen for international-exclusive copy', () => {
  const r = row({
    citizenship_statuses: [],
    eligibility_text: 'Open only to international students outside the United States.'
  });
  const out = proposeScholarshipCatalogBackfill(r);
  assert.equal(out?.patch.citizenship_statuses, undefined);
});

test('fills gpa_bucket from minimum GPA in text', () => {
  const r = row({
    gpa_bucket: null,
    gpa_requirement_min: null,
    eligibility_text: 'Applicants must have a GPA of 3.2 or higher.'
  });
  const out = proposeScholarshipCatalogBackfill(r);
  assert.ok(out);
  assert.equal(out!.patch.gpa_bucket, 'gpa_3_0_plus');
  assert.equal(out!.patch.gpa_requirement_min, 3.2);
});

test('merges state_codes and location_tags from state names in blob', () => {
  const r = row({
    state_codes: [],
    location_tags: [],
    eligibility_text: 'Residents of Florida or Georgia may apply.'
  });
  const out = proposeScholarshipCatalogBackfill(r);
  assert.ok(out);
  assert.deepEqual(out!.patch.state_codes, ['FL', 'GA']);
  assert.deepEqual(out!.patch.location_tags, ['FL', 'GA']);
});

test('skips citizenship when already structured', () => {
  const r = row({
    citizenship_statuses: ['international_student'],
    eligibility_text: 'U.S. citizens welcome'
  });
  const out = proposeScholarshipCatalogBackfill(r);
  assert.equal(out?.patch.citizenship_statuses, undefined);
});
