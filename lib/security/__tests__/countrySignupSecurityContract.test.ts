import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(
  'app/api/onboarding/country-signup/route.ts',
  'utf8'
);
const client = readFileSync(
  'lib/onboarding/countryFirstSignupClient.ts',
  'utf8'
);
const wizard = readFileSync(
  'components/onboarding/ScholarshipOnboardingWizard.tsx',
  'utf8'
);
const button = readFileSync('components/ui/Button/Button.tsx', 'utf8');

test('public country signup never confirms email or returns a credential', () => {
  assert.doesNotMatch(route, /email_confirm\s*:\s*true/);
  assert.doesNotMatch(route, /sessionPassword/);
  assert.doesNotMatch(route, /password\s*:/);
  assert.match(route, /email_confirm:\s*false/);
  assert.match(route, /COUNTRY_SIGNUP_MODE/);
});

test('country signup clients never sign in with a server-returned password', () => {
  assert.doesNotMatch(client, /sessionPassword|signInWithPassword/);
  assert.doesNotMatch(wizard, /sessionPassword/);
});

test('loading buttons are natively disabled', () => {
  assert.match(button, /const isDisabled = disabled \|\| loading/);
  assert.match(button, /disabled=\{isDisabled\}/);
});
