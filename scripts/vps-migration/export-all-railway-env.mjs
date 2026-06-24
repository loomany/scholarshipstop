#!/usr/bin/env node
/** Export all Railway service env files to local staging dir (no values printed). */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGING = path.join(ROOT, '.vps-env-staging');
const EXPORT = path.join(ROOT, 'scripts/vps-migration/export-railway-service-env.mjs');

const SERVICES = [
  { railway: 'Сайт', file: 'site.env', productionUrls: true },
  { railway: 'Скрипты', file: 'scripts.env' },
  { railway: 'Сео генерация', file: 'seo-generation.env' },
  { railway: 'Сео индексация', file: 'seo-indexing.env' },
  { railway: 'Сео Аудит', file: 'seo-audit.env' },
  { railway: 'Рассылка', file: 'mailing.env' },
  { railway: 'Рассылка провайдеры', file: 'mailing-providers.env' },
  { railway: 'Контент Хаб', file: 'content-hub.env' },
  { railway: 'Перевод', file: 'translation.env' },
];

fs.mkdirSync(STAGING, { recursive: true });
const summary = [];

for (const s of SERVICES) {
  const out = path.join(STAGING, s.file);
  const args = [EXPORT, s.railway, out];
  if (s.productionUrls) args.push('--production-urls');
  const r = spawnSync('node', args, { encoding: 'utf8', cwd: ROOT });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  const meta = JSON.parse(r.stdout.trim());
  summary.push({ file: s.file, service: s.railway, keys: meta.keys });
}

console.log(JSON.stringify({ ok: true, staging: STAGING, summary }, null, 2));
