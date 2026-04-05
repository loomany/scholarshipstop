import test from 'node:test';
import assert from 'node:assert/strict';

import { SHADOW_EVAL_FIXTURES } from '@/lib/scholarships-v2/parity/fixtures';
import { runShadowEvalHarness } from '@/lib/scholarships-v2/parity/shadowEvalHarness';

test('shadow-eval harness runs canonical fixtures and produces parity report', () => {
  const result = runShadowEvalHarness(SHADOW_EVAL_FIXTURES);

  assert.equal(result.summary.totalInputs, SHADOW_EVAL_FIXTURES.length);
  assert.ok(result.summary.avgParityScore >= 0);
  assert.ok(result.reports.length > 0);

  const ids = new Set(result.reports.map((r) => r.inputId));
  assert.ok(ids.has('mixed-category-and-l2'));
  assert.ok(ids.has('deadline-alias-variant'));
  assert.ok(ids.has('id-list-combination'));
  assert.ok(ids.has('combined-payout-completeness'));
});

test('shadow-eval has no remaining stubbed diffs for canonical fixtures', () => {
  const result = runShadowEvalHarness(SHADOW_EVAL_FIXTURES);
  const allStubKeys = result.reports.flatMap((r) => r.diffs.filter((d) => d.category === 'stubbed').map((d) => d.key));

  assert.equal(allStubKeys.length, 0);
});
