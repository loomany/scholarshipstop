import type { SupabaseClient } from '@supabase/supabase-js';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { Database } from '@/types_db';
import {
  MATCH_SCORE_SELECT,
  type ScholarshipMatchScoreRow
} from '@/lib/scholarships/supabase';
import { isEasyApplyFromCatalogEasyIds } from '@/lib/scholarships/easyApply';
import { matchScholarship, type ProfilesRow, type ScholarshipMatchRow } from '@/lib/scholarships/scholarshipMatch';

const PAGE = 1000;

export type ScholarshipMatchEntry = {
  score: number;
  reasons: string[];
  easy: boolean;
};

export type BuiltMatchIndex = {
  byId: Map<string, ScholarshipMatchEntry>;
  /** score > 90, desc */
  idsBest: string[];
  /** score >= 85, desc, max 20 ids */
  idsRecommended: string[];
  /** score > 50, desc */
  idsMatches: string[];
  /** Easy-apply scholarships (catalog rules), sorted by match score desc */
  idsEasy: string[];
  countsUnfiltered: {
    bestMatches: number;
    recommended: number;
    matches: number;
    easyApply: number;
  };
};

function rowToMatchRow(r: ScholarshipMatchScoreRow): ScholarshipMatchRow {
  return {
    id: r.id,
    field_of_study: r.field_of_study,
    study_levels: r.study_levels,
    catalog_education_levels: r.catalog_education_levels,
    citizenship_statuses: r.citizenship_statuses,
    gpa_requirement_min: r.gpa_requirement_min,
    essay_required: r.essay_required,
    requirements_count: r.requirements_count,
    requirement_signals_count: r.requirement_signals_count,
    state_territory_text: r.state_territory_text,
    state_codes: r.state_codes
  };
}

function rowIsEasyApply(r: ScholarshipMatchScoreRow): boolean {
  if (isEasyApplyFromCatalogEasyIds(r.easy_apply_flags ?? [])) return true;
  if (r.essay_required) return false;
  const reqCount = r.requirements_count;
  const signalCount = r.requirement_signals_count;
  const heavyReqCount = reqCount != null && reqCount > 2;
  const heavySignalCount = signalCount != null && signalCount > 2;
  return !heavyReqCount && !heavySignalCount;
}

function sortIdsByScore(
  byId: Map<string, ScholarshipMatchEntry>,
  ids: string[],
  desc = true
): string[] {
  return [...ids].sort((a, b) => {
    const sa = byId.get(a)?.score ?? 0;
    const sb = byId.get(b)?.score ?? 0;
    return desc ? sb - sa : sa - sb;
  });
}

export async function buildScholarshipMatchIndex(
  supabase: SupabaseClient<Database>,
  profile: ProfilesRow
): Promise<BuiltMatchIndex> {
  const byId = new Map<string, ScholarshipMatchEntry>();
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(MATCH_SCORE_SELECT)
      .eq('is_active', true)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipMatchScoreRow[];
    for (const row of batch) {
      const mr = rowToMatchRow(row);
      const { score, reasons } = matchScholarship(profile, mr);
      const easy = rowIsEasyApply(row);
      byId.set(row.id, { score, reasons, easy });
    }
    if (batch.length < PAGE) break;
    offset += PAGE;
  }

  /**
   * Profile-driven buckets (honest scoring from `matchScholarship`):
   * - Best: strong matches, or top-N by score when few cross a high bar (partial profiles).
   * - Recommended: next band — relevant but not top tier.
   * - Matches: broader personalized list (soft floor so the tab stays useful).
   */
  const sortedPositive = Array.from(byId.entries())
    .filter(([, v]) => v.score > 0)
    .sort((a, b) => b[1].score - a[1].score);

  const STRONG_BEST_MIN = 63;
  const strongBestIds = sortedPositive
    .filter(([, v]) => v.score >= STRONG_BEST_MIN)
    .map(([id]) => id);
  const fallbackBestTake = Math.min(
    Math.max(6, Math.ceil(sortedPositive.length * 0.3)),
    18,
    sortedPositive.length
  );
  const idsBest =
    strongBestIds.length >= 5
      ? strongBestIds.slice(0, 24)
      : sortedPositive.slice(0, fallbackBestTake).map(([id]) => id);

  const bestSet = new Set(idsBest);
  let recommendedPool = sortedPositive.filter(
    ([id, v]) => !bestSet.has(id) && v.score >= 28
  );
  if (recommendedPool.length < 8 && sortedPositive.length > idsBest.length) {
    recommendedPool = sortedPositive.filter(([id]) => !bestSet.has(id));
  }
  const idsRecommended = recommendedPool
    .slice(0, 80)
    .map(([id]) => id);

  const MATCH_FLOOR = 10;
  const idsMatches = sortedPositive
    .filter(([, v]) => v.score >= MATCH_FLOOR)
    .map(([id]) => id);

  const easyIdsAll = Array.from(byId.entries())
    .filter(([, v]) => v.easy)
    .map(([id]) => id);

  const idsEasy = sortIdsByScore(byId, easyIdsAll);

  return {
    byId,
    idsBest,
    idsRecommended,
    idsMatches,
    idsEasy,
    countsUnfiltered: {
      bestMatches: idsBest.length,
      recommended: idsRecommended.length,
      matches: idsMatches.length,
      easyApply: idsEasy.length
    }
  };
}

export function filterIdsByIgnored(ids: string[], ignored: string[]): string[] {
  if (ignored.length === 0) return ids;
  const ign = new Set(ignored);
  return ids.filter((id) => !ign.has(id));
}

/**
 * Next.js `unstable_cache` serializes return values; `Map` becomes a plain object without `.get`.
 * Use this after reading a cached `BuiltMatchIndex`, and anywhere `byId` may not be a real Map.
 */
export function normalizeScholarshipMatchById(
  byId: Map<string, ScholarshipMatchEntry> | Record<string, unknown> | null | undefined
): Map<string, ScholarshipMatchEntry> {
  if (!byId) return new Map();
  if (byId instanceof Map) return byId;
  const m = new Map<string, ScholarshipMatchEntry>();
  for (const [k, v] of Object.entries(byId)) {
    if (v && typeof v === 'object' && typeof (v as ScholarshipMatchEntry).score === 'number') {
      const e = v as Partial<ScholarshipMatchEntry>;
      m.set(k, {
        score: e.score!,
        reasons: Array.isArray(e.reasons) ? e.reasons : [],
        easy: Boolean(e.easy)
      });
    }
  }
  return m;
}

export function rehydrateBuiltMatchIndex(bundle: BuiltMatchIndex): BuiltMatchIndex {
  const b = bundle as BuiltMatchIndex & { byId?: unknown };
  return {
    byId: normalizeScholarshipMatchById(b.byId as Map<string, ScholarshipMatchEntry> | Record<string, unknown>),
    idsBest: Array.isArray(b.idsBest) ? b.idsBest : [],
    idsRecommended: Array.isArray(b.idsRecommended) ? b.idsRecommended : [],
    idsMatches: Array.isArray(b.idsMatches) ? b.idsMatches : [],
    idsEasy: Array.isArray(b.idsEasy) ? b.idsEasy : [],
    countsUnfiltered: b.countsUnfiltered ?? {
      bestMatches: 0,
      recommended: 0,
      matches: 0,
      easyApply: 0
    }
  };
}

export function mergeMatchOntoScholarships(
  list: Scholarship[],
  byId: Map<string, ScholarshipMatchEntry> | Record<string, unknown>
) {
  const map = normalizeScholarshipMatchById(byId);
  return list.map((s) => {
    const m = map.get(s.id);
    if (!m) return s;
    return {
      ...s,
      matchScore: m.score,
      matchReasons: m.reasons
    };
  });
}
