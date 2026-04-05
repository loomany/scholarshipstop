import test from 'node:test';
import assert from 'node:assert/strict';

import { buildV2FiltersFromLegacyInput } from '@/lib/scholarships-v2/adapters/buildV2FiltersFromLegacy';
import { buildScholarshipsQuerySpec } from '@/lib/scholarships-v2/querySpec/buildQuerySpec';
import { buildSqlClausesFromQuerySpec } from '@/lib/scholarships-v2/sqlSpec/buildSqlClausesFromQuerySpec';

function buildLegacyReferenceSqlClauses(input: {
  stateCodes: string[];
  deadlineBucket: string;
  eligibilityClause: string;
  educationClause: string;
  gpaBucket: string;
  requirementFields: string[];
  applicantsMin: number;
  applicantsMax: number;
  easyApplyFlag: string;
  payoutMethod: string;
}): string[] {
  return [
    'is_active.eq.true',
    input.eligibilityClause,
    input.educationClause,
    `gpa_bucket.in.(${input.gpaBucket})`,
    input.requirementFields.map((field) => `${field}.eq.true`).join(','),
    `applicants_count.is.null,and(applicants_count.gte.${input.applicantsMin},applicants_count.lte.${input.applicantsMax})`,
    `easy_apply_flags.cs.["${input.easyApplyFlag}"]`,
    'listing_completeness_bucket.eq.standard',
    `payout_method.eq.${input.payoutMethod}`,
    input.stateCodes.map((code) => `state_codes.cs.["${code}"]`).join(','),
    `deadline_bucket.in.(${input.deadlineBucket})`
  ];
}

function clausesFor(input: {
  search: string;
  more: {
    deadlinePreset: 'any' | 'lt1d' | 'd1_7' | 'w1_4' | 'gt4w';
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
    includeRequirementTypes: string[];
    dataCompleteness: { low: boolean; medium: boolean; high: boolean; verified: boolean };
    payout: { college: boolean; student: boolean; nonMonetary: boolean; notStated: boolean };
    includeEligibility: string[];
    includeEducationLevels: string[];
    includeGpaBuckets: string[];
    includeLocationLabels: string[];
    includeEasyApply: string[];
    filterStateInput: string;
  };
}) {
  const filters = buildV2FiltersFromLegacyInput({
    searchParams: new URLSearchParams(input.search),
    moreFilters: input.more
  });
  const spec = buildScholarshipsQuerySpec(filters);
  const sql = buildSqlClausesFromQuerySpec(spec);
  return { filters, spec, sql };
}

test('legacy input -> v2 querySpec -> SQL clauses parity for top facets', () => {
  const { sql } = clausesFor({
    search: 'tab=matches&state=ca,ny&deadline=gt_4w',
    more: {
      deadlinePreset: 'gt4w',
      amountMin: 0,
      amountMax: 2000,
      applicantsMin: 10,
      applicantsMax: 50,
      includeRequirementTypes: ['document'],
      dataCompleteness: { low: false, medium: true, high: false, verified: false },
      payout: { college: false, student: true, nonMonetary: false, notStated: false },
      includeEligibility: ['veterans'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: ['gpa_25'],
      includeLocationLabels: [],
      includeEasyApply: ['easy_apply'],
      filterStateInput: ''
    }
  });

  const ref = buildLegacyReferenceSqlClauses({
    stateCodes: ['CA', 'NY'],
    deadlineBucket: 'gt_28',
    eligibilityClause: 'eligibility_tags.cs.["veterans"]',
    educationClause: 'catalog_education_levels.cs.["undergraduate"]',
    gpaBucket: 'gpa_25',
    requirementFields: ['document_required'],
    applicantsMin: 10,
    applicantsMax: 50,
    easyApplyFlag: 'easy_apply',
    payoutMethod: 'student'
  });

  const clauseStrings = sql.clauses.map((c) => c.clause);
  for (const expected of ref) {
    assert.ok(clauseStrings.includes(expected), `missing expected clause: ${expected}`);
  }
});

test('category and id-list semantics are translated', () => {
  const { sql, spec } = clausesFor({
    search:
      'tab=saved&category=stem,arts&category_page=engineering&saved=11111111-1111-1111-1111-111111111111',
    more: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 1000,
      applicantsMin: 0,
      applicantsMax: 100,
      includeRequirementTypes: [],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: false, notStated: false },
      includeEligibility: [],
      includeEducationLevels: [],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  });

  assert.equal(spec.debug.idListSemantics, 'saved');
  assert.equal(spec.debug.categoryScope, 'categoryPageSlug');

  const clauseStrings = sql.clauses.map((c) => c.clause);
  assert.ok(clauseStrings.includes('id.in.(11111111-1111-1111-1111-111111111111)'));
  assert.ok(clauseStrings.includes('category_page.eq.engineering'));
});

test('translator keeps resume as no-op and emits direct category/text clauses', () => {
  const { sql } = clausesFor({
    search: 'tab=matches&q=florida scholarship',
    more: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 1000,
      applicantsMin: 0,
      applicantsMax: 100,
      includeRequirementTypes: ['resume'],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: false, notStated: false },
      includeEligibility: ['first_generation'],
      includeEducationLevels: [],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  });

  const clauseStrings = sql.clauses.map((c) => c.clause);
  assert.ok(clauseStrings.includes('catalog_text.search.florida scholarship'));
  assert.equal(
    clauseStrings.some((clause) => clause.includes('resume_required') || clause.includes('resume')),
    false
  );
  assert.equal(sql.stubs.length, 0);
});

test('translator keeps eligibility OR semantics across multiple ids and text fallback', () => {
  const { sql } = clausesFor({
    search: 'tab=matches',
    more: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 1000,
      applicantsMin: 0,
      applicantsMax: 100,
      includeRequirementTypes: [],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: false, notStated: false },
      includeEligibility: ['women', 'first_generation'],
      includeEducationLevels: ['graduate', 'undergraduate'],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  });

  const eligibility = sql.clauses.find((c) => c.sourceField === 'eligibility_tags');
  assert.equal(eligibility?.boolean, 'or');
  assert.ok(eligibility?.clause.includes('eligibility_tags.cs.["women"]'));
  assert.ok(eligibility?.clause.includes('eligibility_tags.cs.["first_generation"]'));
  assert.ok(eligibility?.clause.includes('title.ilike.%first generation%'));

  const education = sql.clauses.find((c) => c.sourceField === 'catalog_education_levels');
  assert.equal(education?.boolean, 'or');
  assert.equal(
    education?.clause,
    'catalog_education_levels.cs.["graduate"],catalog_education_levels.cs.["undergraduate"]'
  );
});

test('translator emits OR clause for multi-select requirement filters', () => {
  const { sql } = clausesFor({
    search: 'tab=matches',
    more: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 1000,
      applicantsMin: 0,
      applicantsMax: 100,
      includeRequirementTypes: ['essay', 'question'],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: false, notStated: false },
      includeEligibility: [],
      includeEducationLevels: [],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  });

  const requirementClause = sql.clauses.find((c) => c.sourceField === 'requirement_flags');
  assert.equal(requirementClause?.boolean, 'or');
  assert.equal(requirementClause?.clause, 'essay_required.eq.true,question_required.eq.true');
});
