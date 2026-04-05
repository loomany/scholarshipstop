import { DEFAULT_SCHOLARSHIP_FILTERS } from '@/lib/scholarships-v2/filters/contract';
import {
  normalizeCitizenshipValue,
  normalizeDeadlinePreset,
  normalizeGpaValue,
  normalizeStateInputToCode
} from '@/lib/scholarships-v2/normalization/legacy';
import type { ScholarshipFilterInput } from '@/lib/scholarships-v2/types';

function cleanString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeStringArray(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function normalizeNullableNumber(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value);
}

export function normalizeScholarshipFilters(
  partial: Partial<ScholarshipFilterInput> | null | undefined
): ScholarshipFilterInput {
  const stateQuery = cleanString(partial?.stateQuery);
  const explicitStateCodes = normalizeStringArray(partial?.stateCodes).map((code) =>
    code.toUpperCase()
  );
  const codeFromStateInput = normalizeStateInputToCode(stateQuery);
  const stateCodes =
    explicitStateCodes.length > 0
      ? explicitStateCodes
      : codeFromStateInput
        ? [codeFromStateInput]
        : [];

  return {
    ...DEFAULT_SCHOLARSHIP_FILTERS,
    q: cleanString(partial?.q),
    categoryIds: normalizeStringArray(partial?.categoryIds).map((value) => value.toLowerCase()),
    categoryPageSlug: cleanString(partial?.categoryPageSlug)?.toLowerCase() ?? null,
    catalogSubjectCategoryId: cleanString(partial?.catalogSubjectCategoryId),
    educationLevelIds: normalizeStringArray(partial?.educationLevelIds),
    citizenshipIds: normalizeStringArray(partial?.citizenshipIds)
      .map((value) => normalizeCitizenshipValue(value) ?? value)
      .sort((a, b) => a.localeCompare(b)),
    fieldsOfStudy: normalizeStringArray(partial?.fieldsOfStudy).map((value) => value.toLowerCase()),
    stateCodes,
    stateQuery,
    deadlinePreset: normalizeDeadlinePreset(partial?.deadlinePreset),
    minGpa: normalizeGpaValue(partial?.minGpa),
    maxGpa: normalizeGpaValue(partial?.maxGpa),
    includeGpaBuckets: normalizeStringArray(partial?.includeGpaBuckets),
    minAmount: normalizeNullableNumber(partial?.minAmount),
    maxAmount: normalizeNullableNumber(partial?.maxAmount),
    applicantsMin: normalizeNullableNumber(partial?.applicantsMin),
    applicantsMax: normalizeNullableNumber(partial?.applicantsMax),
    includeEligibility: normalizeStringArray(partial?.includeEligibility),
    excludeRequirementTypes: normalizeStringArray(partial?.excludeRequirementTypes),
    includeEasyApply: normalizeStringArray(partial?.includeEasyApply),
    dataCompleteness: {
      low: Boolean(partial?.dataCompleteness?.low),
      medium: Boolean(partial?.dataCompleteness?.medium),
      high: Boolean(partial?.dataCompleteness?.high),
      verified: Boolean(partial?.dataCompleteness?.verified)
    },
    payout: {
      college: Boolean(partial?.payout?.college),
      student: Boolean(partial?.payout?.student),
      nonMonetary: Boolean(partial?.payout?.nonMonetary),
      notStated: Boolean(partial?.payout?.notStated)
    },
    userCollectionTab: partial?.userCollectionTab ?? null,
    savedIds: normalizeStringArray(partial?.savedIds),
    ignoredIds: normalizeStringArray(partial?.ignoredIds),
    startedIds: normalizeStringArray(partial?.startedIds),
    submittedIds: normalizeStringArray(partial?.submittedIds)
  };
}
