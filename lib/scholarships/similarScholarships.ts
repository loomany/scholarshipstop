import {
  formatScholarshipAwardDisplay,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';
import {
  isScholarshipUSA,
  normalizeCategoryId,
  scholarshipCategoryIds
} from '@/app/scholarships/scholarshipCategories';
import { scholarshipDeadlineHasPassed as scholarshipDeadlineStateHasPassed } from '@/lib/scholarships/scholarshipDeadlineState';

/** Detail page: max cards shown in the “Similar scholarships” block (API may fetch a small buffer). */
export const SIMILAR_MAX = 8;

/** Канонический slug категории для ссылок и «похожих» (DB `category_slug` или первая категория из данных). */
export function resolveScholarshipCategorySlug(s: Scholarship): string | null {
  const fromDb = s.categorySlug?.trim().toLowerCase();
  if (fromDb) {
    return normalizeCategoryId(fromDb) ?? fromDb;
  }
  const ids = scholarshipCategoryIds(s.categories);
  return ids[0] ?? null;
}

function sameCategorySlug(a: Scholarship, canonicalSlug: string): boolean {
  return resolveScholarshipCategorySlug(a) === canonicalSlug;
}

function deadlineMs(sch: Scholarship): number {
  const d = parseScholarshipDeadlineAnchor(sch.deadlineAt, sch.deadline);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

function recentMs(sch: Scholarship): number {
  const iso = sch.createdAt || sch.updatedAt;
  if (iso) {
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/** Есть парсируемый дедлайн и он уже в прошлом. */
export function scholarshipDeadlineHasPassed(s: Scholarship): boolean {
  return scholarshipDeadlineStateHasPassed(s);
}

export function formatScholarshipAwardLine(s: Scholarship): string {
  const raw = (s.amount ?? s.awardAmount ?? '').trim();
  if (raw) return formatScholarshipAwardDisplay(raw);
  return 'Amount varies';
}

/**
 * @deprecated Similar scholarships are ranked in Postgres via `get_scored_similar_scholarships`.
 * Kept for scripts/tests only.
 *
 * До `targetCount` грантов (по умолчанию 4): та же категория (дедлайн → новее), затем добор новыми.
 */
export function pickSimilarScholarships(
  catalog: Scholarship[],
  current: Scholarship,
  targetCount: number = SIMILAR_MAX
): Scholarship[] {
  const count = Math.max(1, Math.min(8, targetCount));
  const chosen = new Set<string>([current.id]);
  const out: Scholarship[] = [];

  const slug = resolveScholarshipCategorySlug(current);

  if (slug) {
    const sameCat = catalog.filter(
      (s) =>
        s.id !== current.id &&
        isScholarshipUSA(s.country) &&
        sameCategorySlug(s, slug)
    );
    sameCat.sort((a, b) => {
      const da = deadlineMs(a);
      const db = deadlineMs(b);
      if (da !== db) return da - db;
      return recentMs(b) - recentMs(a);
    });
    for (const s of sameCat) {
      if (out.length >= count) break;
      if (chosen.has(s.id)) continue;
      out.push(s);
      chosen.add(s.id);
    }
  }

  if (out.length < count) {
    const fillers = catalog
      .filter(
        (s) =>
          s.id !== current.id &&
          isScholarshipUSA(s.country) &&
          !chosen.has(s.id)
      )
      .sort((a, b) => recentMs(b) - recentMs(a));

    for (const s of fillers) {
      if (out.length >= count) break;
      out.push(s);
      chosen.add(s.id);
    }
  }

  return out;
}
