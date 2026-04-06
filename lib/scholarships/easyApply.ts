import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';

/**
 * Single source of truth for “easy apply” (sidebar tab, match index, SQL filter should stay aligned).
 * Mirrors catalog chips: No Essay, Few Requirements, Easy / Quick Apply, plus row fallbacks.
 */
const EASY_CATALOG_IDS = new Set([
  'no_essay',
  'easy_apply',
  'quick_apply',
  'few_requirements'
]);

export function isEasyApplyFromCatalogEasyIds(easyApplyIds: string[]): boolean {
  return easyApplyIds.some((id) => EASY_CATALOG_IDS.has(id));
}

export function isEasyApplyScholarship(s: Scholarship): boolean {
  const cat = getScholarshipCatalog(s);
  if (isEasyApplyFromCatalogEasyIds(cat.easyApplyIds)) return true;

  const reqC = s.requirementsCount ?? s.eligibility?.length ?? null;
  const sig = s.requirementSignalsCount ?? null;
  if (!s.essayRequired) {
    const lightReq =
      (reqC == null || reqC <= 2) && (sig == null || sig <= 2);
    if (lightReq) return true;
  }

  const diff = s.aiDifficultyLevel?.trim().toLowerCase() ?? '';
  if (diff === 'easy' || diff.includes('easy')) return true;

  return false;
}
