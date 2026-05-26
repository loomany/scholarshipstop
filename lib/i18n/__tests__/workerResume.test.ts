import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyRelaxedWaveAudit,
  mergeNextSafeStartWave,
  parseResumeMode,
  resolveActualStartWave
} from '../../../scripts/i18n/scholarship-detail-autopilot/worker-resume';

describe('workerResume', () => {
  it('auto: env startWave=188, DB nextSafe=190 → actualStartWave=190', () => {
    const r = resolveActualStartWave({
      requestedStartWave: 188,
      nextSafeStartWave: 190,
      resumeMode: 'auto'
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.actualStartWave, 190);
      assert.equal(r.adjusted, true);
    }
  });

  it('strict: env startWave=188, DB nextSafe=190 → mismatch', () => {
    const r = resolveActualStartWave({
      requestedStartWave: 188,
      nextSafeStartWave: 190,
      resumeMode: 'strict'
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'strict_mismatch');
  });

  it('defaults resume mode to auto', () => {
    assert.equal(parseResumeMode(undefined), 'auto');
    assert.equal(parseResumeMode('auto'), 'auto');
    assert.equal(parseResumeMode('strict'), 'strict');
  });

  it('mergeNextSafeStartWave prefers higher state/db value', () => {
    assert.equal(mergeNextSafeStartWave(190, 188), 190);
    assert.equal(mergeNextSafeStartWave(null, 188), 188);
    assert.equal(mergeNextSafeStartWave(185, 190), 190);
  });

  it('classifies complete vs polluted vs partial', () => {
    const complete = classifyRelaxedWaveAudit({
      total: 300,
      distinctSourceIds: 150,
      es: 150,
      fr: 150,
      qualityBelow85: 0,
      statuses: { published: 300 }
    });
    assert.equal(complete, 'complete');

    const polluted = classifyRelaxedWaveAudit({
      total: 1000,
      distinctSourceIds: 504,
      es: 500,
      fr: 500,
      qualityBelow85: 0,
      statuses: { published: 1000 }
    });
    assert.equal(polluted, 'polluted_valid');

    const partial = classifyRelaxedWaveAudit({
      total: 100,
      distinctSourceIds: 60,
      es: 50,
      fr: 50,
      qualityBelow85: 2,
      statuses: { published: 98, draft: 2 }
    });
    assert.equal(partial, 'partial_broken');
  });

  it('guard stale env: requested behind nextSafe yields adjusted actual in auto', () => {
    const r = resolveActualStartWave({
      requestedStartWave: 188,
      nextSafeStartWave: 189,
      resumeMode: 'auto'
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.actualStartWave, 189);
      assert.equal(r.requestedStartWave, 188);
    }
  });
});
