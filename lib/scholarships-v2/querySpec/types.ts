import type { DeadlinePreset, ScholarshipsV2Mode, UserCollectionTab } from '@/lib/scholarships-v2/types';

export type QuerySpecPredicate = {
  field: string;
  operator:
    | 'equals'
    | 'in'
    | 'containsAny'
    | 'range'
    | 'not'
    | 'or'
    | 'textFallback'
    | 'idSet';
  value: unknown;
  note?: string;
};

export type QuerySpecStub = {
  key: string;
  reason: string;
};

export type ScholarshipsQuerySpec = {
  mode: ScholarshipsV2Mode;
  tab: UserCollectionTab | 'matches' | 'bestMatches';
  predicates: QuerySpecPredicate[];
  stubs: QuerySpecStub[];
  debug: {
    deadlinePreset: DeadlinePreset;
    categoryScope: 'none' | 'categoryIds' | 'categoryPageSlug' | 'catalogSubjectCategoryId';
    idListSemantics: 'none' | 'saved' | 'ignored' | 'started' | 'submitted';
  };
};
