import test from 'node:test';
import assert from 'node:assert/strict';

import { DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { applyPersonalizedProfileFitSql } from '@/lib/scholarships/personalizedListingSql';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';

function baseProfile(over: Partial<ProfilesRow>): ProfilesRow {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: null,
    avatar_url: null,
    field_of_study: null,
    field_of_study_label: null,
    school_level: null,
    school_level_label: null,
    citizenship_status: null,
    citizenship_status_label: null,
    state_region: null,
    gpa: null,
    birth_month: null,
    birth_day: null,
    birth_year: null,
    date_of_birth: null,
    email_verified: false,
    email_notify_best_matches: false,
    email_notify_easy_apply: false,
    email_notify_hot_deadlines: false,
    email_notify_saved_filters: false,
    is_subscribed: false,
    subscription_plan: 'none',
    trial_quota_ai_check_used: 0,
    trial_quota_chat_turns_used: 0,
    trial_quota_humanize_draft_used: 0,
    saved_filters_snapshot: null,
    ...over
  } as ProfilesRow;
}

function captureOrClauses(profile: ProfilesRow): string[] {
  const calls: string[] = [];
  const q = {
    or(part: string) {
      calls.push(part);
      return this;
    }
  };
  applyPersonalizedProfileFitSql(q, profile);
  return calls;
}

test('no citizenship listed SQL includes empty citizenship arrays', () => {
  const calls = captureOrClauses(
    baseProfile({ citizenship_status: DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP })
  );
  assert.ok(calls.some((part) => part.includes('citizenship_statuses.eq.[]')));
  assert.ok(!calls.some((part) => part.includes('citizenship_statuses.cs.["us_citizen"]')));
});

test('strict US citizen SQL does not include empty citizenship arrays', () => {
  const calls = captureOrClauses(baseProfile({ citizenship_status: 'us_citizen' }));
  assert.ok(!calls.some((part) => part.includes('citizenship_statuses.eq.[]')));
});
