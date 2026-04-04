/**
 * Deterministic seo_tags[] from structured columns + configurable text rules.
 * Used by backfill (Phase B) and later by live enrichment.
 */

import type { Json } from '@/types_db';
import type { SeoCanonicalTag } from '@/lib/scholarships/seoTags/vocabulary';
import {
  ALL_SEO_TAGS,
  isSeoCanonicalTag
} from '@/lib/scholarships/seoTags/vocabulary';

export type SeoTagTextRulesFile = {
  defaultFields?: string[];
  tags: Record<string, { needles?: string[]; fields?: string[] }>;
};

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

/** Minimal row shape for derivation (backfill select list). */
export type SeoTagSourceRow = {
  title: string | null;
  summary_short: string | null;
  description: string | null;
  requirements_text: string | null;
  eligibility_text: string | null;
  eligibility_tags: Json | null;
  catalog_education_levels: Json | null;
  gpa_bucket: string | null;
  easy_apply_flags: Json | null;
  field_of_study: Json | null;
  study_levels: Json | null;
  payout_method: string | null;
  award_amount_numeric_sort: number | null;
  deadline_bucket: string | null;
  is_verified: boolean | null;
  financial_need_considered: boolean | null;
  citizenship_statuses: Json | null;
};

const GPA_BUCKET_TO_TAG: Record<string, SeoCanonicalTag> = {
  gpa_none: 'no_gpa_requirement',
  gpa_2: 'gpa_2_0',
  gpa_25: 'gpa_2_5',
  gpa_3: 'gpa_3_0',
  gpa_35: 'gpa_3_5'
};

const EDU_LEVEL_ALIASES: Record<string, SeoCanonicalTag> = {
  high_school: 'high_school',
  'high school': 'high_school',
  high_school_senior: 'high_school_senior',
  undergraduate: 'undergraduate',
  bachelor: 'undergraduate',
  graduate: 'graduate',
  masters: 'graduate',
  phd: 'phd',
  doctoral: 'phd',
  community_college: 'community_college',
  trade_school: 'trade_school'
};

function normalizeHaystack(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function fieldText(
  row: SeoTagSourceRow,
  field: string
): string {
  switch (field) {
    case 'title':
      return row.title ?? '';
    case 'summary_short':
      return row.summary_short ?? '';
    case 'description':
      return row.description ?? '';
    case 'requirements_text':
      return row.requirements_text ?? '';
    case 'eligibility_text':
      return row.eligibility_text ?? '';
    default:
      return '';
  }
}

function tagsFromStructured(row: SeoTagSourceRow, out: Set<SeoCanonicalTag>): void {
  for (const t of jsonStringArray(row.eligibility_tags)) {
    if (isSeoCanonicalTag(t)) out.add(t);
  }

  for (const raw of jsonStringArray(row.catalog_education_levels)) {
    const trimmed = raw.trim();
    if (isSeoCanonicalTag(trimmed)) {
      out.add(trimmed);
      continue;
    }
    const k = trimmed.toLowerCase().replace(/\s+/g, '_');
    const tag = EDU_LEVEL_ALIASES[k] ?? EDU_LEVEL_ALIASES[trimmed.toLowerCase()];
    if (tag) out.add(tag);
  }

  for (const f of jsonStringArray(row.easy_apply_flags)) {
    if (isSeoCanonicalTag(f)) out.add(f);
    if (f === 'gpa_none') out.add('no_gpa_requirement');
  }

  const gb = row.gpa_bucket?.trim();
  if (gb && GPA_BUCKET_TO_TAG[gb]) {
    out.add(GPA_BUCKET_TO_TAG[gb]);
  }

  for (const fos of jsonStringArray(row.field_of_study)) {
    const s = fos.toLowerCase();
    if (s.includes('computer science') || s.includes('software')) {
      out.add('computer_science');
    } else if (s.includes('engineering')) {
      out.add('engineering');
    } else if (s === 'stem' || s.includes('stem')) {
      out.add('stem');
    }
  }

  for (const sl of jsonStringArray(row.study_levels)) {
    const k = sl.trim().toLowerCase();
    if (k.includes('high school')) out.add('high_school');
    if (k.includes('undergraduate') || k.includes('bachelor')) {
      out.add('undergraduate');
    }
    if (k.includes('graduate') || k.includes('master')) out.add('graduate');
    if (k.includes('phd') || k.includes('doctoral')) out.add('phd');
  }

  const pm = row.payout_method?.trim();
  if (pm === 'college') out.add('payout_college');
  if (pm === 'student') out.add('payout_student');
  if (pm === 'non_monetary') out.add('payout_non_monetary');
  if (pm === 'not_stated') out.add('payout_not_stated');

  const amt = row.award_amount_numeric_sort;
  if (amt != null && Number.isFinite(Number(amt))) {
    const n = Number(amt);
    if (n <= 5000) out.add('under_5000');
    if (n <= 10000) out.add('under_10000');
  }

  const db = row.deadline_bucket?.trim();
  if (db === 'lt_1d' || db === 'd1_7') {
    out.add('closing_soon');
  }

  if (row.is_verified === true) {
    out.add('verified_source');
  }

  if (row.financial_need_considered === true) {
    out.add('financial_need');
  }

  for (const c of jsonStringArray(row.citizenship_statuses)) {
    const s = c.toLowerCase();
    if (
      s.includes('international') ||
      s.includes('f-1') ||
      s.includes('foreign')
    ) {
      out.add('international_students');
    }
  }
}

function tagsFromTextRules(
  row: SeoTagSourceRow,
  rules: SeoTagTextRulesFile,
  out: Set<SeoCanonicalTag>
): void {
  const defaultFields = rules.defaultFields ?? [
    'title',
    'summary_short',
    'description',
    'requirements_text',
    'eligibility_text'
  ];

  for (const [tagKey, cfg] of Object.entries(rules.tags)) {
    if (!isSeoCanonicalTag(tagKey)) continue;
    const needles = cfg.needles ?? [];
    if (needles.length === 0) continue;
    const fields = cfg.fields?.length ? cfg.fields : defaultFields;
    const hay = normalizeHaystack(fields.map((f) => fieldText(row, f)));
    if (!hay) continue;
    for (const n of needles) {
      if (n && hay.includes(n.toLowerCase())) {
        out.add(tagKey);
        break;
      }
    }
  }
}

/**
 * Returns unique canonical tags in stable sort order (ALL_SEO_TAGS order).
 */
export function deriveSeoTagsFromRow(
  row: SeoTagSourceRow,
  textRules: SeoTagTextRulesFile
): SeoCanonicalTag[] {
  const out = new Set<SeoCanonicalTag>();
  tagsFromStructured(row, out);
  tagsFromTextRules(row, textRules, out);

  const rank = new Map(ALL_SEO_TAGS.map((t, i) => [t, i]));
  return Array.from(out).sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}
