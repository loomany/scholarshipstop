#!/usr/bin/env node
/** Verify .env.example has no secret-like values (names only in output). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lines = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8').split(/\r?\n/);
const suspicious = [];
const safe = new Set([
  'REQUIRED_SET_ON_VPS',
  'OPTIONAL_SET_ON_VPS',
  'UNUSED_CONFIRM_DELETE',
  '',
  '0',
  '1',
  'false',
  'true',
  'whisper-1',
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-5.4',
  'v2',
  '2026-03-30-base',
  'flux',
  'essay_reuse',
]);

for (const line of lines) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq < 0) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (val.startsWith('your_') || safe.has(val)) continue;
  if (/REQUIRED_SET_ON_VPS|OPTIONAL_SET_ON_VPS/.test(val)) continue;
  if (/^\d+$/.test(val)) continue;
  if (/^(true|false)$/i.test(val)) continue;
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) continue;
  suspicious.push(key);
}

console.log(JSON.stringify({ ok: suspicious.length === 0, suspiciousKeys: suspicious }));
