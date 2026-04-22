'use client';

import {
  loadCompletedLandingQuizDraft
} from '@/lib/onboarding/getScholarshipsLandingDraft';
import { buildScholarshipProfileFilterSeedFromDraftWithoutBirth } from '@/lib/scholarships/profileFilterDefaults';
import {
  HOME_PRIMARY_CTA_AUTH_HREF,
  HOME_PRIMARY_CTA_GUEST_HREF
} from '@/lib/nav/homePrimaryCta';

export type ScholarshipEntryDecisionReason =
  | 'authenticated'
  | 'guest_completed_quiz'
  | 'guest_missing_quiz';

export function guestHasCompletedScholarshipQuiz(): boolean {
  const draft = loadCompletedLandingQuizDraft();
  if (!draft) return false;
  return buildScholarshipProfileFilterSeedFromDraftWithoutBirth(draft) != null;
}

export function resolveScholarshipEntryDecisionClient(
  isAuthenticated: boolean
): { href: string; reason: ScholarshipEntryDecisionReason } {
  if (isAuthenticated) {
    return { href: HOME_PRIMARY_CTA_AUTH_HREF, reason: 'authenticated' };
  }
  const completed = guestHasCompletedScholarshipQuiz();
  if (completed) {
    return {
      href: HOME_PRIMARY_CTA_AUTH_HREF,
      reason: 'guest_completed_quiz'
    };
  }
  return { href: HOME_PRIMARY_CTA_GUEST_HREF, reason: 'guest_missing_quiz' };
}

export function resolveScholarshipEntryHrefClient(
  isAuthenticated: boolean
): string {
  return resolveScholarshipEntryDecisionClient(isAuthenticated).href;
}
