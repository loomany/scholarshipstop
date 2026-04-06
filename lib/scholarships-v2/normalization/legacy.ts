import { normalizeUsStateToCanonical, US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';
import type { DeadlinePreset } from '@/lib/scholarships-v2/types';

const DEADLINE_ALIASES: Record<string, DeadlinePreset> = {
  any: 'any',
  lt1d: 'lt1d',
  d1_7: 'd1_7',
  w1_4: 'w1_4',
  gt4w: 'gt4w',
  '1_4_weeks': 'w1_4',
  '1-4_weeks': 'w1_4',
  less_than_1_day: 'lt1d',
  lt_1d: 'lt1d',
  '1_7_days': 'd1_7',
  '1-7_days': 'd1_7',
  more_than_4_weeks: 'gt4w',
  gt_4w: 'gt4w'
};

const CITIZENSHIP_ALIASES: Record<string, string> = {
  us: 'us_citizen',
  us_citizen: 'us_citizen',
  us_permanent_resident: 'us_permanent_resident',
  domestic: 'us_citizen',
  international: 'international_student',
  international_student: 'international_student',
  international_students: 'international_student'
};

function normalizeString(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export function normalizeDeadlinePreset(raw: string | null | undefined): DeadlinePreset {
  const key = raw?.trim().toLowerCase();
  if (!key) return 'any';
  return DEADLINE_ALIASES[key] ?? 'any';
}

export function normalizeStateInputToCode(raw: string | null | undefined): string | null {
  const v = normalizeString(raw);
  if (!v) return null;
  const upper = v.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const canon = normalizeUsStateToCanonical(v);
  if (!canon) return null;
  return US_STATE_NAME_TO_CODE[canon] ?? null;
}

export function normalizeCitizenshipValue(raw: string | null | undefined): string | null {
  const key = raw?.trim().toLowerCase();
  if (!key) return null;
  return CITIZENSHIP_ALIASES[key] ?? key;
}

export function normalizeGpaValue(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = String(raw).trim().toLowerCase();
  if (!text || text === 'prefer_not_to_say' || text === 'n/a') return null;
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseCommaValues(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

export function parseCommaUuids(raw: string | null | undefined): string[] {
  return parseCommaValues(raw).filter((s) => /^[0-9a-f-]{36}$/i.test(s));
}

export function parseCommaStateCodes(raw: string | null | undefined): string[] {
  return parseCommaValues(raw)
    .map((s) => s.toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
}
