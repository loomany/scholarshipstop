#!/usr/bin/env node
/**
 * Export Railway service env to file. Never prints values to stdout.
 * Usage: node export-railway-service-env.mjs "<ServiceName>" <output-path> [--production-urls]
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceName = process.argv[2];
const out = process.argv[3];
const productionUrls = process.argv.includes('--production-urls');

if (!serviceName || !out) {
  console.error(
    'usage: node export-railway-service-env.mjs "<ServiceName>" <output-path> [--production-urls]'
  );
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = execSync(`railway variable list -s ${JSON.stringify(serviceName)} --json`, {
  encoding: 'utf8',
  cwd: ROOT,
  shell: true,
});

const parsed = JSON.parse(raw);
const map = new Map(Object.entries(parsed).filter(([k]) => !k.startsWith('RAILWAY_')));

if (productionUrls) {
  map.set('SITE_URL', 'https://scholarshiptop.com');
  map.set('NEXT_PUBLIC_SITE_URL', 'https://scholarshiptop.com');
}

function formatEnvLine(key, val) {
  const s = String(val ?? '');
  if (/[\n\r"=]/.test(s) || s.includes('-----BEGIN')) {
    const esc = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `${key}="${esc}"`;
  }
  return `${key}=${s}`;
}

const body = [...map.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => formatEnvLine(k, v))
  .join('\n');

const abs = path.resolve(out);
fs.mkdirSync(path.dirname(abs), { recursive: true });
fs.writeFileSync(abs, `${body}\n`, { mode: 0o600 });
console.log(
  JSON.stringify({ ok: true, service: serviceName, keys: map.size, path: abs })
);
