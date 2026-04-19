'use client';

import {
  loadCompletedLandingQuizDraft
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import { buildScholarshipProfileFilterSeedFromDraftWithoutBirth } from '@/lib/scholarships/profileFilterDefaults';
import {
  HOME_PRIMARY_CTA_AUTH_HREF,
  HOME_PRIMARY_CTA_GUEST_HREF
} from '@/lib/nav/homePrimaryCta';

export function guestHasCompletedScholarshipQuiz(): boolean {
  const draft = loadCompletedLandingQuizDraft();
  if (!draft) return false;
  return buildScholarshipProfileFilterSeedFromDraftWithoutBirth(draft) != null;
}

export function resolveScholarshipEntryHrefClient(
  isAuthenticated: boolean
): string {
  if (isAuthenticated) return HOME_PRIMARY_CTA_AUTH_HREF;
  return guestHasCompletedScholarshipQuiz()
    ? HOME_PRIMARY_CTA_AUTH_HREF
    : HOME_PRIMARY_CTA_GUEST_HREF;
}
