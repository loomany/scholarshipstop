import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';

function baseDraft(gpa: string): StoredOnboardingDraft {
  return {
    v: 8,
    preferredHostCountryCodes: [],
    landingDestinationScreenCompleted: true,
    activeStep: 4,
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
    step3: { gpa },
    step4: { state: 'Florida' }
  };
}

test('buildCompleteScholarshipUserProfile preserves GPA bucket selection snapshot', () => {
  const built = buildCompleteScholarshipUserProfile(baseDraft('gpa_2_5_plus'));
  assert.equal(built.ok, true);
  if (!built.ok) return;

  assert.equal(built.profile.gpa, 'gpa_2_5_plus');
  assert.deepEqual(built.profile.savedFiltersSnapshot, {
    profileGpaSelection: 'gpa_2_5_plus'
  });
});

test('buildCompleteScholarshipUserProfile leaves exact GPA without bucket snapshot', () => {
  const built = buildCompleteScholarshipUserProfile(baseDraft('3.5'));
  assert.equal(built.ok, true);
  if (!built.ok) return;

  assert.equal(built.profile.gpa, '3.5');
  assert.equal(built.profile.savedFiltersSnapshot, null);
});
