import test from 'node:test';
import assert from 'node:assert/strict';

import { SHADOW_EVAL_FIXTURES } from '@/lib/scholarships-v2/parity/fixtures';
import { runShadowEvalHarness, runShadowEvalHarnessWithArtifact } from '@/lib/scholarships-v2/parity/shadowEvalHarness';
import { buildParityArtifactV1, serializeParityArtifactV1 } from '@/lib/scholarships-v2/parity/reportWriter';
import { assertParityThresholds, evaluateParityThresholds } from '@/lib/scholarships-v2/parity/thresholds';

test('serialized parity artifact uses stable v1 format', () => {
  const harness = runShadowEvalHarnessWithArtifact(SHADOW_EVAL_FIXTURES, '2026-04-05T00:00:00.000Z');
  const serialized = serializeParityArtifactV1(harness.artifact);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.schemaVersion, 'v1');
  assert.equal(parsed.generatedAt, '2026-04-05T00:00:00.000Z');
  assert.equal(parsed.summary.totalInputs, SHADOW_EVAL_FIXTURES.length);
  const fixtureIds = parsed.fixtures.map((f: { id: string }) => f.id);
  const sorted = [...fixtureIds].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(fixtureIds, sorted);
});

test('artifact builder returns per-fixture + aggregate summary payload', () => {
  const harness = runShadowEvalHarness(SHADOW_EVAL_FIXTURES);
  const artifact = buildParityArtifactV1({
    generatedAt: '2026-04-05T00:00:00.000Z',
    reports: harness.reports,
    summary: harness.summary
  });

  assert.equal(artifact.fixtures.length, SHADOW_EVAL_FIXTURES.length);
  assert.equal(artifact.summary.totalInputs, SHADOW_EVAL_FIXTURES.length);
});

test('threshold guards pass for current baseline and fail on strict regression', () => {
  const harness = runShadowEvalHarness(SHADOW_EVAL_FIXTURES);

  assert.doesNotThrow(() =>
    assertParityThresholds(harness.summary)
  );

  assert.doesNotThrow(() =>
    assertParityThresholds(harness.summary, {
      maxMismatch: 50,
      maxStubbed: 50,
      maxMissing: 10,
      maxExtra: 50,
      minAvgParityScore: 10
    })
  );

  const violations = evaluateParityThresholds(harness.summary, {
    maxMismatch: 0,
    maxStubbed: 0,
    maxMissing: 0,
    maxExtra: 0,
    minAvgParityScore: 101
  });
  assert.ok(violations.length > 0);
});
