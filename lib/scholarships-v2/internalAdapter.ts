import type {
  ScholarshipCountsResult,
  ScholarshipListRequest,
  ScholarshipQueryRepository,
  ScholarshipQueryResult,
  ScholarshipRecord,
  UserCollectionTab
} from '@/lib/scholarships-v2/types';

const EMPTY_TAB_COUNTS: Record<UserCollectionTab, number> = {
  saved: 0,
  ignored: 0,
  submitted: 0,
  started: 0
};

/**
 * Internal-only adapter for local verification of v2 pipeline shape.
 * Not wired into routes, pages, or production request path.
 */
export function createInMemoryScholarshipsV2Repository(
  rows: ScholarshipRecord[]
): ScholarshipQueryRepository {
  return {
    async list(_request: ScholarshipListRequest): Promise<ScholarshipQueryResult> {
      return {
        rows,
        total: rows.length
      };
    },
    async counts(_request: ScholarshipListRequest): Promise<ScholarshipCountsResult> {
      return {
        total: rows.length,
        byUserCollectionTab: { ...EMPTY_TAB_COUNTS }
      };
    }
  };
}
