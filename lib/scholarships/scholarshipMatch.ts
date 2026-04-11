import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import type { Database } from '@/types_db';

export type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export function parseUserGpa(raw: ProfilesRow['gpa']): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === 'prefer_not_to_say' || s === 'n/a') return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Facets that drive hub “best recommendation” SQL + profile defaults (5 × 20% = 100%). */
export type ScholarshipProfileMatchFields = Pick<
  ProfilesRow,
  | 'field_of_study'
  | 'field_of_study_label'
  | 'school_level'
  | 'citizenship_status'
  | 'state_region'
  | 'gpa'
>;

/**
 * Profile completeness for similar-scholarship cards: 100% when all five facets are set.
 * Each missing facet lowers the score by 20 points (used for Best recommendation vs Match % UI).
 */
export function computeScholarshipProfileMatchPercent(
  profile: ScholarshipProfileMatchFields | null | undefined
): number | null {
  if (!profile) return null;

  let filled = 0;
  if (
    (profile.field_of_study?.trim() ?? '') ||
    (profile.field_of_study_label?.trim() ?? '')
  ) {
    filled += 1;
  }
  if (profile.school_level?.trim()) filled += 1;
  if (profile.citizenship_status?.trim()) filled += 1;
  if (normalizeUsStateToCanonical(profile.state_region?.trim() ?? '')) {
    filled += 1;
  }
  if (parseUserGpa(profile.gpa) != null) filled += 1;

  return filled * 20;
}

/**
 * Stable string for cache keys when profile fields that affect hub filters change.
 */
export function scholarshipMatchProfileVersion(p: ProfilesRow): string {
  return [
    p.field_of_study ?? '',
    p.field_of_study_label ?? '',
    p.school_level ?? '',
    p.school_level_label ?? '',
    p.citizenship_status ?? '',
    String(p.gpa ?? ''),
    p.birth_month ?? '',
    p.birth_day != null ? String(p.birth_day) : '',
    p.birth_year != null ? String(p.birth_year) : '',
    p.date_of_birth ?? '',
    p.state_region ?? ''
  ].join('|');
}
