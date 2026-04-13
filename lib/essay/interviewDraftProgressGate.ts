import type { Json } from '@/types_db';

/** Минимум по каждой из четырёх тем (шкалы в UI), чтобы разрешить «Сгенерировать черновик». */
export const INTERVIEW_DRAFT_MIN_THEME_PERCENT = 50;

/** Рекомендуемый минимум по каждой теме для «сильного» черновика (полный пайплайн без режима preview). */
export const INTERVIEW_DRAFT_STRONG_MIN_PERCENT = 85;

const THEME_KEYS = ['background', 'achievements', 'gap', 'personality'] as const;

export type InterviewThemeKey = (typeof THEME_KEYS)[number];

export type InterviewThemeProgress = Record<InterviewThemeKey, number>;

export function parseInterviewProgressFromJson(
  raw: Json | null | undefined
): InterviewThemeProgress {
  const def: InterviewThemeProgress = {
    background: 0,
    achievements: 0,
    gap: 0,
    personality: 0
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
  const o = raw as Record<string, unknown>;
  for (const k of THEME_KEYS) {
    const v = o[k];
    const n =
      typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    def[k] = Number.isFinite(n)
      ? Math.min(100, Math.max(0, n))
      : 0;
  }
  return def;
}

export function interviewThemesMeetDraftThreshold(
  progress: InterviewThemeProgress | null | undefined
): boolean {
  if (!progress) return false;
  for (const k of THEME_KEYS) {
    if (progress[k] < INTERVIEW_DRAFT_MIN_THEME_PERCENT) return false;
  }
  return true;
}

/** Все темы ≥ порога «сильного» черновика (полная генерация, не preview). */
export function interviewThemesMeetStrongDraftThreshold(
  progress: InterviewThemeProgress | null | undefined
): boolean {
  if (!progress) return false;
  for (const k of THEME_KEYS) {
    if (progress[k] < INTERVIEW_DRAFT_STRONG_MIN_PERCENT) return false;
  }
  return true;
}
