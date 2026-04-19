export type GpaOption = { value: string; label: string };
export const PROFILE_GPA_SELECTION_SNAPSHOT_KEY = 'profileGpaSelection' as const;

/** Stored in draft / UI when the user opts out; maps to `null` in `profiles.gpa`. */
export const SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY = 'prefer_not_to_say' as const;

/**
 * Coarse GPA filters used in scholarship matching UI. These persist as string values in
 * `profiles.gpa` and are interpreted as the floor GPA for broader matching.
 */
export const SCHOLARSHIP_GPA_BUCKET_OPTIONS: GpaOption[] = [
  { value: 'gpa_2_0_plus', label: 'GPA 2.0+' },
  { value: 'gpa_2_5_plus', label: 'GPA 2.5+' },
  { value: 'gpa_3_0_plus', label: 'GPA 3.0+' },
  { value: 'gpa_3_5_plus', label: 'GPA 3.5+' }
];

const LEGACY_RANGE_SLUGS = new Set([
  'below_2_5',
  '2_5_to_2_9',
  '3_0_to_3_4',
  '3_5_to_3_9',
  '4_0'
]);

/** Discrete GPA from 2.0 through 4.0 (0.1 steps), ascending. */
export const SCHOLARSHIP_GPA_OPTIONS: GpaOption[] = (() => {
  const opts: GpaOption[] = [];
  for (let i = 20; i <= 40; i += 1) {
    const v = (i / 10).toFixed(1);
    opts.push({ value: v, label: v });
  }
  return opts;
})();

const NUMERIC_ALLOWED = new Set(SCHOLARSHIP_GPA_OPTIONS.map((o) => o.value));
const BUCKET_ALLOWED = new Set(
  SCHOLARSHIP_GPA_BUCKET_OPTIONS.map((o) => o.value)
);

export function isGpaBucketChoice(value: string | null | undefined): boolean {
  const t = value?.trim() ?? '';
  return BUCKET_ALLOWED.has(t);
}

export function profileGpaSelectionFromSnapshot(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = (raw as Record<string, unknown>)[PROFILE_GPA_SELECTION_SNAPSHOT_KEY];
  return typeof v === 'string' && BUCKET_ALLOWED.has(v.trim()) ? v.trim() : null;
}

export function resolveStoredProfileGpaChoice(
  rawGpa: string | number | null | undefined,
  savedFiltersSnapshot: unknown
): string {
  const snapshotChoice = profileGpaSelectionFromSnapshot(savedFiltersSnapshot);
  if (snapshotChoice) return snapshotChoice;
  return normalizeGpaForSelect(rawGpa != null && rawGpa !== '' ? String(rawGpa) : '');
}

export function withProfileGpaSelectionSnapshot(
  currentSnapshot: unknown,
  gpaChoice: string
): Record<string, unknown> | null {
  const base =
    currentSnapshot && typeof currentSnapshot === 'object' && !Array.isArray(currentSnapshot)
      ? { ...(currentSnapshot as Record<string, unknown>) }
      : {};
  if (isGpaBucketChoice(gpaChoice)) {
    base[PROFILE_GPA_SELECTION_SNAPSHOT_KEY] = gpaChoice.trim();
  } else {
    delete base[PROFILE_GPA_SELECTION_SNAPSHOT_KEY];
  }
  return Object.keys(base).length > 0 ? base : null;
}

export function migrateLegacyGpaDraftValue(value: string): string {
  const t = value.trim();
  if (LEGACY_RANGE_SLUGS.has(t)) return SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY;
  return value;
}

/** Value for `DarkSelect` when draft is empty, opted out, or unknown. */
export function normalizeGpaForSelect(stored: string): string {
  const migrated = migrateLegacyGpaDraftValue(stored).trim();
  if (!migrated || migrated === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) {
    return SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY;
  }
  if (NUMERIC_ALLOWED.has(migrated)) return migrated;
  if (BUCKET_ALLOWED.has(migrated)) return migrated;
  return SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY;
}

export function isValidGpaValue(value: string): boolean {
  const t = value.trim();
  if (t === '' || t === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) return true;
  return NUMERIC_ALLOWED.has(t) || BUCKET_ALLOWED.has(t);
}

/** Value persisted on `UserProfile` / `profiles.gpa` (null = not provided). */
export function gpaForProfile(raw: string): string | null {
  const t = migrateLegacyGpaDraftValue(raw).trim();
  if (!t || t === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) return null;
  if (NUMERIC_ALLOWED.has(t)) return t;
  if (BUCKET_ALLOWED.has(t)) return t;
  return null;
}

/**
 * Value for Supabase `profiles.gpa`; numeric GPAs stay numeric, broad GPA bucket choices
 * map to their numeric floor so the existing numeric DB column keeps working.
 */
export function gpaForProfileDb(
  raw: string | null | undefined
): number | null {
  if (raw == null || raw === '') return null;
  const t = migrateLegacyGpaDraftValue(String(raw)).trim();
  if (!t || t === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) return null;
  if (t === 'gpa_2_0_plus') return 2.0;
  if (t === 'gpa_2_5_plus') return 2.5;
  if (t === 'gpa_3_0_plus') return 3.0;
  if (t === 'gpa_3_5_plus') return 3.5;
  if (!NUMERIC_ALLOWED.has(t)) return null;
  return Number.parseFloat(t);
}
