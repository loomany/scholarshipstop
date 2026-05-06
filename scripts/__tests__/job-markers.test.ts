import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobStart
} from '../job-markers';

test('createRunId returns uuid-like value', () => {
  const runId = createRunId();
  assert.match(
    runId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

test('marker emitters produce canonical JOB_* lines', () => {
  const logs: string[] = [];
  const errors: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  console.error = (...args: unknown[]) => errors.push(args.map(String).join(' '));

  try {
    const base = { service: 'Сео индексация', job: 'scan-indexing', runId: 'run"1' };
    emitJobStart(base, '2026-05-06T00:00:00.000Z');
    emitJobProgress(base, { processed: 3, success: 2, failed: 1, skipped: 0 });
    emitJobDone(base, 250, { processed: 3, success: 2, failed: 1, skipped: 0 });
    emitJobFailed(base, 251, { processed: 3, success: 2, failed: 1, skipped: 0 }, new Error('boom "x"'));
  } finally {
    console.log = origLog;
    console.error = origError;
  }

  assert.equal(logs.length, 3);
  assert.match(logs[0]!, /^JOB_START service="Сео индексация" job="scan-indexing" runId="run\\"1" timestamp="2026-05-06T00:00:00\.000Z"$/);
  assert.match(logs[1]!, /^JOB_PROGRESS service="Сео индексация" job="scan-indexing" runId="run\\"1" processed=3 success=2 failed=1 skipped=0$/);
  assert.match(logs[2]!, /^JOB_DONE service="Сео индексация" job="scan-indexing" runId="run\\"1" durationMs=250 processed=3 success=2 failed=1 skipped=0 exit=0$/);

  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /^JOB_FAILED service="Сео индексация" job="scan-indexing" runId="run\\"1" durationMs=251 processed=3 success=2 failed=1 skipped=0 error="boom \\"x\\""/);
});
