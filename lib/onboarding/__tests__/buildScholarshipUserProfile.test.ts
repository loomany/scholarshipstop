import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

function baseDraft(overrides?: Partial<StoredOnboardingDraft>): StoredOnboardingDraft {
  return {
    v: 8,
    preferredHostCountryCodes: [],
    landingDestinationScreenCompleted: true,
    activeStep: 2,
    step1: {
      birthMonth: '1',
      birthDay: '15',
      birthYear: '2006',
      schoolLevel: 'high_school_freshman',
      fieldOfStudy: 'agriculture_and_related_sciences',
      citizenship: 'international_student'
    },
    step2: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    },
    step3: { gpa: 'gpa_2_5_plus' },
    step4: { state: 'Florida', countryCode: 'US' },
    ...overrides
  };
}

test('buildCompleteScholarshipUserProfile uses minimal profile for US (ignores GPA/school/state draft)', () => {
  const built = buildCompleteScholarshipUserProfile(baseDraft());
  assert.equal(built.ok, true);
  if (!built.ok) return;

  assert.equal(built.profile.countryCode, 'US');
  assert.equal(built.profile.gpa, null);
  assert.equal(built.profile.savedFiltersSnapshot, null);
  assert.equal(built.profile.stateRegion, null);
  assert.equal(built.profile.schoolLevel, null);
  assert.equal(built.profile.fieldOfStudy, null);
  assert.equal(built.profile.citizenshipStatus, null);
  assert.equal(built.profile.onboardingCompleted, true);
});

test('buildCompleteScholarshipUserProfile uses minimal profile for non-US', () => {
  const built = buildCompleteScholarshipUserProfile(
    baseDraft({ step4: { state: '', countryCode: 'CA' } })
  );
  assert.equal(built.ok, true);
  if (!built.ok) return;

  assert.equal(built.profile.countryCode, 'CA');
  assert.equal(built.profile.gpa, null);
  assert.equal(built.profile.savedFiltersSnapshot, null);
});
