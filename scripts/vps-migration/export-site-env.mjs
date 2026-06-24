#!/usr/bin/env node
/** Export Railway site env to file (keys+values), never prints values to stdout. */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.argv[2];
if (!out) {
  console.error('usage: node export-site-env.mjs <output-path>');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = execSync('railway variable list -s "Сайт" --kv', {
  encoding: 'utf8',
  cwd: ROOT,
});

const lines = raw
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith('RAILWAY_'));

const map = new Map();
for (const line of lines) {
  const i = line.indexOf('=');
  if (i < 1) continue;
  map.set(line.slice(0, i), line.slice(i + 1));
}

map.set('SITE_URL', 'http://213.155.22.74');
map.set('NEXT_PUBLIC_SITE_URL', 'http://213.155.22.74');

const body = [...map.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, `${body}\n`, { mode: 0o600 });
console.log(JSON.stringify({ ok: true, keys: map.size, path: path.resolve(out) }));
