export type ScholarshipsV2Mode = 'catalog' | 'bestMatches' | 'userCollections';

export type ScholarshipSort =
  | 'deadlineSoon'
  | 'amountHighToLow'
  | 'amountLowToHigh'
  | 'recentlyUpdated'
  | 'relevance'
  | 'verifiedFirst'
  | 'fewestApplicants'
  | 'leastRequirements';

export type UserCollectionTab = 'saved' | 'ignored' | 'submitted' | 'started';

export type DeadlinePreset = 'any' | 'lt1d' | 'd1_7' | 'w1_4' | 'gt4w';

export type DataCompletenessFlags = {
  low: boolean;
  medium: boolean;
  high: boolean;
  verified: boolean;
};

export type PayoutFlags = {
  college: boolean;
  student: boolean;
  nonMonetary: boolean;
  notStated: boolean;
};

export type ScholarshipFilterDraftState = {
  applied: Partial<ScholarshipFilterInput>;
  draft: Partial<ScholarshipFilterInput>;
};

export type ScholarshipFilterInput = {
  q: string | null;
  categoryIds: string[];
  categoryPageSlug: string | null;
  catalogSubjectCategoryId: string | null;
  educationLevelIds: string[];
  citizenshipIds: string[];
  fieldsOfStudy: string[];
  stateCodes: string[];
  stateQuery: string | null;
  deadlinePreset: DeadlinePreset;
  minGpa: number | null;
  maxGpa: number | null;
  includeGpaBuckets: string[];
  minAmount: number | null;
  maxAmount: number | null;
  applicantsMin: number | null;
  applicantsMax: number | null;
  includeEligibility: string[];
  excludeRequirementTypes: string[];
  includeEasyApply: string[];
  dataCompleteness: DataCompletenessFlags;
  payout: PayoutFlags;
  userCollectionTab: UserCollectionTab | null;
  savedIds: string[];
  ignoredIds: string[];
  startedIds: string[];
  submittedIds: string[];
};

export type EffectiveScholarshipFilters = ScholarshipFilterInput & {
  mode: ScholarshipsV2Mode;
  page: number;
  pageSize: number;
  sort: ScholarshipSort;
  requestContext: 'applied' | 'draftPreview';
};

export type ScholarshipProfileSignals = {
  educationLevelId?: string | null;
  citizenshipId?: string | null;
  fieldOfStudy?: string | null;
  stateCode?: string | null;
  gpa?: number | null;
};

export type ScholarshipEligibilitySnapshot = {
  educationLevels: string[];
  citizenships: string[];
  eligibleStateCodes: string[];
  stateTerritoryText: string | null;
  fieldsOfStudy: string[];
  minGpa: number | null;
  maxGpa: number | null;
};

export type ScholarshipRecord = {
  id: string;
  title: string;
  updatedAt: string;
  deadlineAt: string | null;
  amountMin: number | null;
  amountMax: number | null;
  isNeedBased: boolean;
  isMeritBased: boolean;
  essayRequired: boolean;
  eligibility: ScholarshipEligibilitySnapshot;
};

export type ScholarshipMatchSignals = {
  profile: ScholarshipProfileSignals;
  scholarship: ScholarshipEligibilitySnapshot;
};

export type ScholarshipMatchScoreBreakdown = {
  total: number;
  education: number;
  citizenship: number;
  state: number;
  fieldOfStudy: number;
  gpa: number;
};

export type ScholarshipListItem = ScholarshipRecord & {
  matchScore?: ScholarshipMatchScoreBreakdown;
};

export type ScholarshipListRequest = {
  filters: EffectiveScholarshipFilters;
  mode: ScholarshipsV2Mode;
};

export type ScholarshipQueryResult = {
  rows: ScholarshipRecord[];
  total: number;
};

export type ScholarshipCountsResult = {
  total: number;
  byUserCollectionTab: Record<UserCollectionTab, number>;
};

export type ScholarshipMetaResult = {
  total: number;
  page: number;
  pageSize: number;
  requestKey: string;
};

export type ScholarshipQueryRepository = {
  list(request: ScholarshipListRequest): Promise<ScholarshipQueryResult>;
  counts(request: ScholarshipListRequest): Promise<ScholarshipCountsResult>;
};
