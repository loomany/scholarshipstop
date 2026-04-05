import { buildScholarshipsRequestKey } from '@/lib/scholarships-v2/pipeline/requestKey';
import { resolveScholarshipsMode } from '@/lib/scholarships-v2/tabs/userCollections';
import type {
  EffectiveScholarshipFilters,
  ScholarshipCountsResult,
  ScholarshipListRequest,
  ScholarshipMetaResult,
  ScholarshipQueryRepository
} from '@/lib/scholarships-v2/types';

type ScholarshipsCountsInput = {
  repository: ScholarshipQueryRepository;
  filters: EffectiveScholarshipFilters;
};

export async function getScholarshipCounts({
  repository,
  filters
}: ScholarshipsCountsInput): Promise<ScholarshipCountsResult> {
  const mode = resolveScholarshipsMode(filters);
  const request: ScholarshipListRequest = { filters, mode };
  return repository.counts(request);
}

export async function getScholarshipMeta({
  repository,
  filters
}: ScholarshipsCountsInput): Promise<ScholarshipMetaResult> {
  const mode = resolveScholarshipsMode(filters);
  const request: ScholarshipListRequest = { filters, mode };
  const counts = await repository.counts(request);

  return {
    total: counts.total,
    page: filters.page,
    pageSize: filters.pageSize,
    requestKey: buildScholarshipsRequestKey(mode, filters)
  };
}
