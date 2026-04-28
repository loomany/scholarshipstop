import assert from 'node:assert/strict';
import test from 'node:test';

import { scholarshipChunkMostlyDuplicatesPrimary } from '@/lib/providers/providerScholarshipSupplements';

test('duplicate detection: empty inputs are not treated as duplicates', () => {
  assert.equal(scholarshipChunkMostlyDuplicatesPrimary('', 'alpha beta gamma delta epsilon'), false);
  assert.equal(scholarshipChunkMostlyDuplicatesPrimary('alpha beta gamma delta epsilon', ''), false);
});

test('duplicate detection: short chunks are skipped (need enough token words)', () => {
  const primary =
    'national merit scholarship program recognizes achievement among academic highschool students statewide excellence opportunity future higher education advancement learning community statewide regional';
  assert.equal(scholarshipChunkMostlyDuplicatesPrimary('only nine words here that count size word token test case small', primary), false);
});

test('duplicate detection: treats near-copy as duplicate when overlap is high', () => {
  const text =
    'national merit scholarship program recognizes achievement among academic highschool students statewide excellence opportunity future higher education advancement learning community regional statewide merit scholarship scholars recognition academic performance outstanding leaders tomorrow future generations educational access equity excellence opportunity merit scholarship program national foundation support students families communities nationwide excellence scholarship recognition academic merit outstanding achievement leadership service community engagement merit scholarship program national foundation';
  assert.equal(scholarshipChunkMostlyDuplicatesPrimary(text, text), true);
});

test('duplicate detection: mostly new facts vs primary are kept (low overlap)', () => {
  const primary =
    'national merit scholarship program recognizes achievement among academic highschool students statewide excellence opportunity future higher education advancement learning community regional statewide';
  const novel =
    'independent robotics laboratory fellows cohort quarterly stipend renewable funding mentor matching summer internship placement industry partners cohort diversity inclusion stem pathways career readiness portfolio review interview round semifinalists notified spring deadline application portal opens winter deadline requirements vary check official rules governance board trustees oversight compliance monitoring annual reports published transparency';
  assert.equal(scholarshipChunkMostlyDuplicatesPrimary(novel, primary), false);
});
