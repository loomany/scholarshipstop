import type { UserIntent } from '@/lib/iqAssessmentTypes';

export const DEFAULT_USER_INTENT: UserIntent = 'scholarship_match';

const validIntents = new Set<UserIntent>([
  'general_iq',
  'essay_prep',
  'college_fit',
  'scholarship_match',
  'provider_research',
  'deadline_strategy'
]);

export function parseUserIntent(value: string | null | undefined): UserIntent {
  if (value && validIntents.has(value as UserIntent)) {
    return value as UserIntent;
  }

  return DEFAULT_USER_INTENT;
}

export function buildIqAssessmentHref(intent: UserIntent): string {
  return `/iq/assessment?intent=${encodeURIComponent(intent)}`;
}
