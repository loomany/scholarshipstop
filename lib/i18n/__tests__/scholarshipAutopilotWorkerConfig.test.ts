import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  hasProductionGuards,
  parseScholarshipAutopilotWorkerConfig,
  validateScholarshipAutopilotWorkerConfig
} from '../../../scripts/i18n/scholarship-detail-autopilot/worker-config';

const ENV_KEYS = [
  'I18N_SCHOLARSHIP_AUTOPILOT',
  'I18N_PILOT_ALLOW_DB_WRITES',
  'I18N_PILOT_ALLOW_PRODUCTION',
  'I18N_WORKER_DRY_RUN',
  'I18N_WORKER_START_WAVE',
  'I18N_WORKER_TARGET',
  'I18N_WORKER_WAVE_SIZE',
  'I18N_WORKER_REQUIRE_LOCK',
  'I18N_WORKER_FORCE_START_WAVE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

const snapshot: Record<string, string | undefined> = {};

describe('scholarshipAutopilotWorkerConfig', () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) snapshot[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it('defaults to dry-run when production guards are absent', () => {
    delete process.env.I18N_PILOT_ALLOW_DB_WRITES;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    const cfg = parseScholarshipAutopilotWorkerConfig();
    assert.equal(cfg.dryRun, true);
    assert.equal(cfg.productionMode, false);
  });

  it('requires start wave for production mode', () => {
    process.env.I18N_SCHOLARSHIP_AUTOPILOT = '1';
    process.env.I18N_PILOT_ALLOW_DB_WRITES = '1';
    process.env.I18N_PILOT_ALLOW_PRODUCTION = '1';
    process.env.I18N_WORKER_DRY_RUN = '0';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    assert.equal(hasProductionGuards(), true);
    const cfg = parseScholarshipAutopilotWorkerConfig();
    const issues = validateScholarshipAutopilotWorkerConfig(cfg);
    assert.ok(issues.some((i) => i.includes('I18N_WORKER_START_WAVE')));
  });

  it('accepts valid production config', () => {
    process.env.I18N_SCHOLARSHIP_AUTOPILOT = '1';
    process.env.I18N_PILOT_ALLOW_DB_WRITES = '1';
    process.env.I18N_PILOT_ALLOW_PRODUCTION = '1';
    process.env.I18N_WORKER_DRY_RUN = '0';
    process.env.I18N_WORKER_START_WAVE = '181';
    process.env.I18N_WORKER_TARGET = '100';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    const cfg = parseScholarshipAutopilotWorkerConfig();
    assert.equal(validateScholarshipAutopilotWorkerConfig(cfg).length, 0);
    assert.equal(cfg.productionMode, true);
    assert.equal(cfg.startWave, 181);
    assert.equal(cfg.forceStartWave, false);
  });

  it('parses force start wave flag', () => {
    process.env.I18N_WORKER_FORCE_START_WAVE = '1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    const cfg = parseScholarshipAutopilotWorkerConfig();
    assert.equal(cfg.forceStartWave, true);
  });
});
