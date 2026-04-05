import type { ScholarshipFilterInput } from '@/lib/scholarships-v2/types';

export const DEFAULT_SCHOLARSHIP_FILTERS: ScholarshipFilterInput = {
  q: null,
  categoryIds: [],
  categoryPageSlug: null,
  catalogSubjectCategoryId: null,
  educationLevelIds: [],
  citizenshipIds: [],
  fieldsOfStudy: [],
  stateCodes: [],
  stateQuery: null,
  deadlinePreset: 'any',
  minGpa: null,
  maxGpa: null,
  includeGpaBuckets: [],
  minAmount: null,
  maxAmount: null,
  applicantsMin: null,
  applicantsMax: null,
  includeEligibility: [],
  excludeRequirementTypes: [],
  includeEasyApply: [],
  dataCompleteness: {
    low: false,
    medium: false,
    high: false,
    verified: false
  },
  payout: {
    college: false,
    student: false,
    nonMonetary: false,
    notStated: false
  },
  userCollectionTab: null,
  savedIds: [],
  ignoredIds: [],
  startedIds: [],
  submittedIds: []
};
