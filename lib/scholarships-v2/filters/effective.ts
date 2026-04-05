import { DEFAULT_SCHOLARSHIP_FILTERS } from '@/lib/scholarships-v2/filters/contract';
import { normalizeScholarshipFilters } from '@/lib/scholarships-v2/filters/normalize';
import type {
  EffectiveScholarshipFilters,
  ScholarshipFilterDraftState,
  ScholarshipFilterInput,
  ScholarshipSort,
  ScholarshipsV2Mode
} from '@/lib/scholarships-v2/types';

type BuildEffectiveFiltersInput = {
  mode: ScholarshipsV2Mode;
  page?: number;
  pageSize?: number;
  sort?: ScholarshipSort;
  publicDefaults?: Partial<ScholarshipFilterInput>;
  profileDefaults?: Partial<ScholarshipFilterInput>;
  modalFilters?: Partial<ScholarshipFilterDraftState>;
  explicitUrlFilters?: Partial<ScholarshipFilterInput>;
  useDraftFilters?: boolean;
};

function clampPositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(Number(value)));
}

function mergeFilterLayers(layers: Array<Partial<ScholarshipFilterInput> | undefined>): ScholarshipFilterInput {
  return normalizeScholarshipFilters(
    layers.reduce<Partial<ScholarshipFilterInput>>((merged, layer) => ({ ...merged, ...layer }), {
      ...DEFAULT_SCHOLARSHIP_FILTERS
    })
  );
}

/**
 * Priority (highest -> lowest): explicit URL filters -> modal layer -> profile defaults -> public defaults.
 */
export function buildEffectiveScholarshipFilters(
  input: BuildEffectiveFiltersInput
): EffectiveScholarshipFilters {
  const appliedModal = normalizeScholarshipFilters(input.modalFilters?.applied);
  const draftModal = normalizeScholarshipFilters(input.modalFilters?.draft);

  const modalLayer = input.useDraftFilters ? draftModal : appliedModal;
  const merged = mergeFilterLayers([
    input.publicDefaults,
    input.profileDefaults,
    modalLayer,
    input.explicitUrlFilters
  ]);

  return {
    ...merged,
    mode: input.mode,
    page: clampPositiveInt(input.page, 1),
    pageSize: clampPositiveInt(input.pageSize, 24),
    sort: input.sort ?? (input.mode === 'bestMatches' ? 'relevance' : 'deadlineSoon'),
    requestContext: input.useDraftFilters ? 'draftPreview' : 'applied'
  };
}
