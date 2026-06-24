#!/usr/bin/env node
/** Fix site.env for docker compose (escape multiline PEM, no stdout secrets). */
import fs from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node fix-site-env-for-docker.mjs <path>');
  process.exit(1);
}

const raw = fs.readFileSync(path, 'utf8');
const lines = raw.split(/\r?\n/);
const out = [];
let key = null;
let buf = [];

function flush() {
  if (!key) return;
  let val = buf.join('\n').trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (/[\n\r"=]/.test(val) || val.includes('-----BEGIN')) {
    val = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    out.push(`${key}="${val}"`);
  } else {
    out.push(`${key}=${val}`);
  }
  key = null;
  buf = [];
}

for (const line of lines) {
  if (!line.trim() || line.trim().startsWith('#')) {
    flush();
    out.push(line);
    continue;
  }
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) {
    flush();
    key = m[1];
    buf = [m[2]];
  } else if (key) {
    buf.push(line);
  } else {
    out.push(line);
  }
}
flush();

fs.writeFileSync(path, `${out.join('\n')}\n`, { mode: 0o600 });
console.log(JSON.stringify({ ok: true, keys: out.filter((l) => l.includes('=') && !l.startsWith('#')).length }));
