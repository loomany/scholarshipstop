import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBestRecommendationProfileGpaOrParts } from '@/lib/scholarships/bestRecommendationGpa';
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
    email_weekly_free_digest: false,
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

test('exact GPA selection keeps Best recommendation narrow', () => {
  const parts = buildBestRecommendationProfileGpaOrParts(baseProfile({ gpa: 3.5 }));
  assert.deepEqual(parts, [
    'and(gpa_requirement_min.gte.3.5,gpa_requirement_min.lt.3.6)',
    'and(gpa_requirement_min.is.null,gpa_bucket.eq.gpa_3_5_plus)'
  ]);
});

test('bucket GPA selection broadens Best recommendation upward', () => {
  const parts = buildBestRecommendationProfileGpaOrParts(
    baseProfile({
      gpa: 3.5,
      saved_filters_snapshot: { profileGpaSelection: 'gpa_3_5_plus' }
    })
  );
  assert.deepEqual(parts, [
    'gpa_requirement_min.gte.3.5',
    'and(gpa_requirement_min.is.null,gpa_bucket.in.(gpa_3_5_plus))'
  ]);
});

test('lower plus bucket keeps higher GPA buckets included', () => {
  const parts = buildBestRecommendationProfileGpaOrParts(
    baseProfile({
      gpa: 2.5,
      saved_filters_snapshot: { profileGpaSelection: 'gpa_2_5_plus' }
    })
  );
  assert.deepEqual(parts, [
    'gpa_requirement_min.gte.2.5',
    'and(gpa_requirement_min.is.null,gpa_bucket.in.(gpa_2_5_plus,gpa_3_0_plus,gpa_3_5_plus))'
  ]);
});

test('non-threshold exact GPA does not fall back to a broad bucket', () => {
  const parts = buildBestRecommendationProfileGpaOrParts(baseProfile({ gpa: 3.1 }));
  assert.deepEqual(parts, ['and(gpa_requirement_min.gte.3.1,gpa_requirement_min.lt.3.2)']);
});
