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
