/**
 * Assign L2 subject categories from field_of_study, text keywords, seo_tags subject tokens,
 * and legacy category_slug / tags. Does not read or write the database.
 */

import type { Json } from '@/types_db';
import { normalizeCategoryId } from '@/app/scholarships/scholarshipCategories';

import type {
  SubjectCategoryAssignmentSource,
  SubjectCategoryMapFile
} from './subjectCategoryMapTypes';
import { SUBJECT_L2_SLUG_SET } from './taxonomy';

import defaultMap from '@/data/scholarship-subject-category-map.json';

export type SubjectCategoryRowInput = {
  category: string | null;
  category_slug: string | null;
  tags: Json | null;
  field_of_study: Json | null;
  title: string | null;
  description: string | null;
  summary_short: string | null;
  requirements_text: string | null;
  eligibility_text: string | null;
  seo_tags: string[] | null | undefined;
};

export type SubjectCategoryHit = {
  l2Slug: string;
  source: SubjectCategoryAssignmentSource;
  priority: number;
};

export type SubjectCategoryAssignmentResult = {
  l2Slugs: string[];
  primaryL2Slug: string;
  hits: SubjectCategoryHit[];
};

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
}

function normalizeHaystack(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whitespace + punctuation → single spaces for token-boundary matching. */
function tokenizedHay(hay: string): string {
  const t = hay
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t ? ` ${t} ` : ' ';
}

/**
 * Multi-word needles: substring in raw lowercase hay.
 * Single-token needles: whole-token match (avoids "art" in "partner", "law" in "outlaw").
 */
function needleMatches(hay: string, needle: string): boolean {
  const n = needle.toLowerCase().trim();
  if (!n) return false;
  const raw = hay.toLowerCase();
  if (n.includes(' ')) {
    return raw.includes(n);
  }
  return tokenizedHay(raw).includes(` ${n} `);
}

/** Single-token "education" / "teaching" must not fire on gen-ed / PE / higher-ed boilerplate. */
function skipWeakEducationK12Match(hay: string, needle: string, l2: string): boolean {
  if (l2 !== 'education_k12_higher') return false;
  const n = needle.toLowerCase().trim();
  if (n !== 'education' && n !== 'teaching') return false;
  const h = hay.toLowerCase();
  return [
    'physical education',
    'higher education',
    'continuing education',
    'general education',
    'driver education',
    'health education',
    'patient education',
    'adult education',
    'distance education'
  ].some((p) => h.includes(p));
}

/** Single-token "law" must not match "law enforcement". */
function skipWeakLawPreLawMatch(hay: string, needle: string, l2: string): boolean {
  if (l2 !== 'law_pre_law') return false;
  if (needle.toLowerCase().trim() !== 'law') return false;
  const h = hay.toLowerCase();
  return (
    h.includes('law enforcement') ||
    h.includes('law-enforcement') ||
    h.includes('law officer')
  );
}

function consider(
  best: Map<string, { priority: number; source: SubjectCategoryAssignmentSource }>,
  l2: string,
  priority: number,
  source: SubjectCategoryAssignmentSource
): void {
  if (!SUBJECT_L2_SLUG_SET.has(l2)) return;
  const prev = best.get(l2);
  if (!prev || priority < prev.priority) {
    best.set(l2, { priority, source });
  }
}

function applyNeedleRules(
  hay: string,
  rules: { needles: string[]; l2: string; priority: number }[],
  source: SubjectCategoryAssignmentSource,
  best: Map<string, { priority: number; source: SubjectCategoryAssignmentSource }>
): void {
  if (!hay) return;
  for (const rule of rules) {
    for (const n of rule.needles) {
      if (!needleMatches(hay, n)) continue;
      if (skipWeakEducationK12Match(hay, n, rule.l2)) continue;
      if (skipWeakLawPreLawMatch(hay, n, rule.l2)) continue;
      consider(best, rule.l2, rule.priority, source);
      break;
    }
  }
}

function legacyFromRow(
  row: SubjectCategoryRowInput,
  map: SubjectCategoryMapFile
): string | null {
  const slug = row.category_slug?.trim().toLowerCase();
  if (slug) {
    const id = normalizeCategoryId(slug);
    if (id && map.legacyUiCategoryIdToL2[id]) {
      return map.legacyUiCategoryIdToL2[id];
    }
  }
  const cat = row.category?.trim().toLowerCase();
  if (cat) {
    const id = normalizeCategoryId(cat);
    if (id && map.legacyUiCategoryIdToL2[id]) {
      return map.legacyUiCategoryIdToL2[id];
    }
  }
  for (const t of jsonStringArray(row.tags)) {
    const id = normalizeCategoryId(t);
    if (id && map.legacyUiCategoryIdToL2[id]) {
      return map.legacyUiCategoryIdToL2[id];
    }
  }
  return null;
}

const SEO_SUBJECT_TAGS = ['engineering', 'computer_science', 'stem'] as const;

/**
 * @param map optional override (tests); defaults to `data/scholarship-subject-category-map.json`.
 */
export function assignSubjectCategories(
  row: SubjectCategoryRowInput,
  map: SubjectCategoryMapFile = defaultMap as SubjectCategoryMapFile
): SubjectCategoryAssignmentResult {
  const best = new Map<
    string,
    { priority: number; source: SubjectCategoryAssignmentSource }
  >();

  const titleHay = normalizeHaystack([row.title]);
  const titleRules = map.titleKeywordRules ?? [];
  applyNeedleRules(titleHay, titleRules, 'title_keyword', best);

  const fosHay = normalizeHaystack(jsonStringArray(row.field_of_study));
  applyNeedleRules(fosHay, map.fieldOfStudyRules, 'field_of_study', best);

  const textHay = normalizeHaystack([
    row.title,
    row.summary_short,
    row.description,
    row.requirements_text,
    row.eligibility_text
  ]);
  applyNeedleRules(textHay, map.keywordRules, 'keyword', best);

  const tags = row.seo_tags ?? [];
  /** Weaker than title/fos/keyword so specific text wins over broad `stem` tag. */
  const seoStemPriority = 33;
  const seoEngCsPriority = 18;
  for (const k of SEO_SUBJECT_TAGS) {
    if (tags.includes(k)) {
      const l2 = map.seoSubjectTagToL2[k];
      if (l2) {
        const pr =
          k === 'stem' ? seoStemPriority : seoEngCsPriority;
        consider(best, l2, pr, 'seo_subject_tag');
      }
    }
  }

  const leg = legacyFromRow(row, map);
  const looksLikeLawEnforcement =
    textHay.includes('law enforcement') ||
    textHay.includes('law-enforcement') ||
    textHay.includes('police officer') ||
    textHay.includes('sheriff');

  if (
    leg &&
    SUBJECT_L2_SLUG_SET.has(leg) &&
    !(leg === 'law_pre_law' && looksLikeLawEnforcement)
  ) {
    /** Legacy `education` slug is often a parser default — weaker than almost all text/fos rules. */
    const legacyPri = leg === 'education_k12_higher' ? 72 : 40;
    consider(best, leg, legacyPri, 'legacy_category_slug');
  }

  if (best.size === 0) {
    const fb = SUBJECT_L2_SLUG_SET.has(map.fallbackL2Slug)
      ? map.fallbackL2Slug
      : 'open_subject';
    consider(best, fb, 100, 'fallback');
  }

  const entries = Array.from(best.entries()).sort(
    (a, b) =>
      a[1].priority - b[1].priority || a[0].localeCompare(b[0])
  );

  const hits: SubjectCategoryHit[] = entries.map(([l2Slug, meta]) => ({
    l2Slug,
    source: meta.source,
    priority: meta.priority
  }));

  const l2Slugs = hits.map((h) => h.l2Slug);
  const primaryL2Slug = hits[0]?.l2Slug ?? map.fallbackL2Slug;

  return { l2Slugs, primaryL2Slug, hits };
}
