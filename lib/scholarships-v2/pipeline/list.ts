import { scoreScholarshipMatch } from '@/lib/scholarships-v2/matching/scoring';
import { buildScholarshipsRequestKey } from '@/lib/scholarships-v2/pipeline/requestKey';
import { resolveScholarshipsMode } from '@/lib/scholarships-v2/tabs/userCollections';
import type {
  EffectiveScholarshipFilters,
  ScholarshipListItem,
  ScholarshipListRequest,
  ScholarshipProfileSignals,
  ScholarshipQueryRepository,
  ScholarshipsV2Mode
} from '@/lib/scholarships-v2/types';

type ScholarshipsListPipelineInput = {
  repository: ScholarshipQueryRepository;
  filters: EffectiveScholarshipFilters;
};

function sortRowsByMode(
  mode: ScholarshipsV2Mode,
  rows: ScholarshipListItem[]
): ScholarshipListItem[] {
  if (mode === 'bestMatches') {
    return [...rows].sort((a, b) => (b.matchScore?.total ?? 0) - (a.matchScore?.total ?? 0));
  }
  return rows;
}

export async function getScholarshipList({
  repository,
  filters
}: ScholarshipsListPipelineInput): Promise<{ rows: ScholarshipListItem[]; total: number; requestKey: string }> {
  const mode = resolveScholarshipsMode(filters);
  const request: ScholarshipListRequest = { filters, mode };
  const result = await repository.list(request);

  const rows = sortRowsByMode(
    mode,
    result.rows.map((row) => ({ ...row }))
  );

  return {
    rows,
    total: result.total,
    requestKey: buildScholarshipsRequestKey(mode, filters)
  };
}

export async function getBestMatches(input: {
  repository: ScholarshipQueryRepository;
  filters: EffectiveScholarshipFilters;
  profileSignals: ScholarshipProfileSignals;
}): Promise<{ rows: ScholarshipListItem[]; total: number; requestKey: string }> {
  const bestMatchFilters: EffectiveScholarshipFilters = {
    ...input.filters,
    mode: 'bestMatches',
    sort: 'relevance'
  };

  const base = await getScholarshipList({
    repository: input.repository,
    filters: bestMatchFilters
  });

  const scored = base.rows
    .map((scholarship) => ({
      ...scholarship,
      matchScore: scoreScholarshipMatch({
        profile: input.profileSignals,
        scholarship: scholarship.eligibility
      })
    }))
    .sort((a, b) => (b.matchScore?.total ?? 0) - (a.matchScore?.total ?? 0));

  return {
    rows: scored,
    total: base.total,
    requestKey: base.requestKey
  };
}
