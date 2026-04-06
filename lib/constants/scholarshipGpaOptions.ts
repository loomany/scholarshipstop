export type GpaOption = { value: string; label: string };

/** Stored in draft / UI when the user opts out; maps to `null` in `profiles.gpa`. */
export const SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY = 'prefer_not_to_say' as const;

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
  return SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY;
}

export function isValidGpaValue(value: string): boolean {
  const t = value.trim();
  if (t === '' || t === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) return true;
  return NUMERIC_ALLOWED.has(t);
}

/** Value persisted on `UserProfile` / `profiles.gpa` (null = not provided). */
export function gpaForProfile(raw: string): string | null {
  const t = migrateLegacyGpaDraftValue(raw).trim();
  if (!t || t === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) return null;
  if (NUMERIC_ALLOWED.has(t)) return t;
  return null;
}

/** Value for Supabase `profiles.gpa` (numeric column); null = not provided. */
export function gpaForProfileDb(
  raw: string | null | undefined
): number | null {
  if (raw == null || raw === '') return null;
  const t = migrateLegacyGpaDraftValue(String(raw)).trim();
  if (!t || t === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) return null;
  if (!NUMERIC_ALLOWED.has(t)) return null;
  return Number.parseFloat(t);
}
