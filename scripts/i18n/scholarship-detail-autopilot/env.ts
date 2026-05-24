import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DATE = process.env.REPORT_DATE ?? '2026-05-24';
export const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
export const IQ = (process.env.IQ_SMOKE_BASE_URL ?? 'https://iq.scholarshiptop.com').replace(/\/$/, '');

export function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[t.slice(0, eq).trim()] = v;
    }
  } catch {
    /* optional */
  }
}

export function assertPublishGuards() {
  if (process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1') {
    throw new Error('Set I18N_PILOT_ALLOW_DB_WRITES=1');
  }
  if (process.env.I18N_PILOT_ALLOW_PRODUCTION !== '1') {
    throw new Error('Set I18N_PILOT_ALLOW_PRODUCTION=1');
  }
  if (process.env.I18N_SCHOLARSHIP_AUTOPILOT !== '1') {
    throw new Error('Set I18N_SCHOLARSHIP_AUTOPILOT=1');
  }
}

export function isDryRun(): boolean {
  return process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1';
}
