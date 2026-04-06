import type { CanonicalLegacyLikeInput } from '@/lib/scholarships-v2/parity/types';

export const SHADOW_EVAL_FIXTURES: CanonicalLegacyLikeInput[] = [
  {
    id: 'mixed-category-and-l2',
    description: 'Category ids with category_page present (L2-like route takes priority).',
    searchParams:
      'tab=matches&category=stem,arts&category_page=engineering&state=ca,ny&deadline=1_4_weeks',
    moreFilters: {
      deadlinePreset: 'w1_4',
      amountMin: 100,
      amountMax: 5000,
      applicantsMin: 0,
      applicantsMax: 1000,
      includeRequirementTypes: ['essay'],
      dataCompleteness: { low: false, medium: true, high: false, verified: false },
      payout: { college: false, student: true, nonMonetary: false, notStated: false },
      includeEligibility: ['veterans'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: ['gpa_3'],
      includeLocationLabels: [],
      includeEasyApply: ['easy_apply'],
      filterStateInput: ''
    }
  },
  {
    id: 'deadline-alias-variant',
    description: 'Legacy deadline alias gt_4w should normalize to gt4w semantics.',
    searchParams: 'tab=matches&deadline=gt_4w&state=fl',
    moreFilters: {
      deadlinePreset: 'gt4w',
      amountMin: 0,
      amountMax: 3000,
      applicantsMin: 10,
      applicantsMax: 50,
      includeRequirementTypes: ['document'],
      dataCompleteness: { low: false, medium: false, high: true, verified: false },
      payout: { college: true, student: false, nonMonetary: false, notStated: false },
      includeEligibility: ['first_generation'],
      includeEducationLevels: ['graduate'],
      includeGpaBuckets: ['gpa_35'],
      includeLocationLabels: [],
      includeEasyApply: ['no_essay'],
      filterStateInput: 'Florida'
    }
  },
  {
    id: 'id-list-combination',
    description: 'Saved tab with saved/ignored ids checks id-set semantics and ignored exclusion behavior.',
    searchParams:
      'tab=saved&saved=11111111-1111-1111-1111-111111111111,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&ignored=22222222-2222-2222-2222-222222222222',
    moreFilters: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 10000,
      applicantsMin: 0,
      applicantsMax: 200000,
      includeRequirementTypes: ['resume'],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: true, notStated: false },
      includeEligibility: ['women'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  },
  {
    id: 'combined-payout-completeness',
    description: 'Combined payout + completeness flags with multi-state and eligibility text-fallback.',
    searchParams: 'tab=matches&q=florida%20grant&state=fl,ga&deadline=1-7_days',
    moreFilters: {
      deadlinePreset: 'd1_7',
      amountMin: 250,
      amountMax: 12000,
      applicantsMin: 0,
      applicantsMax: 5000,
      includeRequirementTypes: ['question', 'resume'],
      dataCompleteness: { low: true, medium: true, high: false, verified: true },
      payout: { college: false, student: true, nonMonetary: true, notStated: true },
      includeEligibility: ['first_generation', 'low_income'],
      includeEducationLevels: ['high_school'],
      includeGpaBuckets: ['gpa_25'],
      includeLocationLabels: [],
      includeEasyApply: ['quick_apply', 'few_requirements'],
      filterStateInput: ''
    }
  },
  {
    id: 'category-payout-completeness-combo',
    description: 'Category + payout + completeness combined with deadline alias and state filter.',
    searchParams: 'tab=matches&category=business,stem&state=tx&deadline=less_than_1_day',
    moreFilters: {
      deadlinePreset: 'lt1d',
      amountMin: 500,
      amountMax: 15000,
      applicantsMin: 1,
      applicantsMax: 2000,
      includeRequirementTypes: ['photo'],
      dataCompleteness: { low: false, medium: true, high: true, verified: true },
      payout: { college: true, student: true, nonMonetary: false, notStated: false },
      includeEligibility: ['minority'],
      includeEducationLevels: ['undergraduate'],
      includeGpaBuckets: ['gpa_3'],
      includeLocationLabels: [],
      includeEasyApply: ['easy_apply'],
      filterStateInput: 'Texas'
    }
  },
  {
    id: 'eligibility-gpa-state-combo',
    description: 'Eligibility + GPA + state with multi-facet requirement exclusions.',
    searchParams: 'tab=matches&state=wa,or&deadline=1_7_days',
    moreFilters: {
      deadlinePreset: 'd1_7',
      amountMin: 100,
      amountMax: 8000,
      applicantsMin: 0,
      applicantsMax: 1200,
      includeRequirementTypes: ['video', 'transcript'],
      dataCompleteness: { low: true, medium: false, high: false, verified: false },
      payout: { college: false, student: false, nonMonetary: true, notStated: true },
      includeEligibility: ['first_generation', 'financial_need'],
      includeEducationLevels: ['graduate'],
      includeGpaBuckets: ['gpa_25', 'gpa_3'],
      includeLocationLabels: [],
      includeEasyApply: ['quick_apply'],
      filterStateInput: ''
    }
  },
  {
    id: 'id-list-tab-interactions',
    description: 'Ignored tab with mixed saved/ignored/submitted IDs to validate tab id-set behavior.',
    searchParams:
      'tab=ignored&ignored=33333333-3333-3333-3333-333333333333,44444444-4444-4444-4444-444444444444&saved=11111111-1111-1111-1111-111111111111&submitted=55555555-5555-5555-5555-555555555555',
    moreFilters: {
      deadlinePreset: 'any',
      amountMin: 0,
      amountMax: 25000,
      applicantsMin: 0,
      applicantsMax: 50000,
      includeRequirementTypes: [],
      dataCompleteness: { low: false, medium: false, high: false, verified: false },
      payout: { college: false, student: true, nonMonetary: false, notStated: false },
      includeEligibility: ['women'],
      includeEducationLevels: ['high_school'],
      includeGpaBuckets: [],
      includeLocationLabels: [],
      includeEasyApply: [],
      filterStateInput: ''
    }
  }
];
