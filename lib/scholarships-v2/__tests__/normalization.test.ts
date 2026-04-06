import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCitizenshipValue,
  normalizeDeadlinePreset,
  normalizeGpaValue,
  normalizeStateInputToCode
} from '@/lib/scholarships-v2/normalization/legacy';

test('normalizeDeadlinePreset handles aliases', () => {
  assert.equal(normalizeDeadlinePreset('1_4_weeks'), 'w1_4');
  assert.equal(normalizeDeadlinePreset('lt_1d'), 'lt1d');
  assert.equal(normalizeDeadlinePreset('unknown'), 'any');
});

test('normalizeStateInputToCode handles names and codes', () => {
  assert.equal(normalizeStateInputToCode('Florida'), 'FL');
  assert.equal(normalizeStateInputToCode('fl'), 'FL');
  assert.equal(normalizeStateInputToCode('not-a-state'), null);
});

test('normalizeCitizenshipValue handles common synonyms', () => {
  assert.equal(normalizeCitizenshipValue('domestic'), 'us_citizen');
  assert.equal(normalizeCitizenshipValue('international_students'), 'international_student');
});

test('normalizeGpaValue handles number/string and special values', () => {
  assert.equal(normalizeGpaValue(3.2), 3.2);
  assert.equal(normalizeGpaValue('3.7'), 3.7);
  assert.equal(normalizeGpaValue('prefer_not_to_say'), null);
});
