import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import type { SqlClause, SqlTranslationStub } from '@/lib/scholarships-v2/sqlSpec/types';

export type CanonicalLegacyLikeInput = {
  id: string;
  description: string;
  searchParams: string;
  moreFilters: MoreFiltersJson | null;
};

export type ClauseDiffCategory = 'missing' | 'extra' | 'mismatch' | 'stubbed';

export type ClauseDiffEntry = {
  category: ClauseDiffCategory;
  key: string;
  legacyClause?: string;
  v2Clause?: string;
  reason?: string;
};

export type ClauseParityReport = {
  inputId: string;
  summary: {
    missing: number;
    extra: number;
    mismatch: number;
    stubbed: number;
    parityScore: number;
  };
  diffs: ClauseDiffEntry[];
  legacyClauses: SqlClause[];
  v2Clauses: SqlClause[];
  v2Stubs: SqlTranslationStub[];
};
