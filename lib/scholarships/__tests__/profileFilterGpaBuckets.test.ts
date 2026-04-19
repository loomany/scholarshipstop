import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScholarshipProfileFilterSeed } from '@/lib/scholarships/profileFilterDefaults';
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

test('buildScholarshipProfileFilterSeed accumulates GPA buckets the user satisfies', () => {
  const seed = buildScholarshipProfileFilterSeed(
    baseProfile({ gpa: 3.7, school_level: 'high_school_freshman' })
  );
  assert.ok(seed);
  assert.deepEqual(
    Array.from(new Set(seed.gpaBucketIds)).sort(),
    [
      'gpa_2_0_plus',
      'gpa_2_5_plus',
      'gpa_3_0_plus',
      'gpa_3_5_plus',
      'no_gpa_requirement'
    ].sort()
  );
});

test('buildScholarshipProfileFilterSeed GPA 2.1 only clears low buckets', () => {
  const seed = buildScholarshipProfileFilterSeed(baseProfile({ gpa: 2.1 }));
  assert.ok(seed);
  assert.deepEqual(Array.from(new Set(seed!.gpaBucketIds)).sort(), ['gpa_2_0_plus', 'no_gpa_requirement'].sort());
});

test('buildScholarshipProfileFilterSeed prefer_not_to_say yields no GPA filter', () => {
  const seed = buildScholarshipProfileFilterSeed(
    baseProfile({ gpa: 'prefer_not_to_say', school_level: 'high_school_freshman' })
  );
  assert.ok(seed);
  assert.deepEqual(seed!.gpaBucketIds, []);
});

test('buildScholarshipProfileFilterSeed supports upward GPA bucket selection from profile snapshot', () => {
  const seed = buildScholarshipProfileFilterSeed(
    baseProfile({
      gpa: 2.5,
      school_level: 'high_school_freshman',
      saved_filters_snapshot: { profileGpaSelection: 'gpa_2_5_plus' }
    })
  );
  assert.ok(seed);
  assert.deepEqual(
    Array.from(new Set(seed!.gpaBucketIds)).sort(),
    ['gpa_2_5_plus', 'gpa_3_0_plus', 'gpa_3_5_plus'].sort()
  );
});
