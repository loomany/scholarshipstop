#!/usr/bin/env node
/**
 * Sanitize root .env.example — replace secret-like values with placeholders.
 * Does NOT print secret values. Writes report JSON with key names only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const REPORT_JSON = path.join(
  ROOT,
  'reports/vps-migration/_025-sanitize-stats.json'
);

const OPTIONAL_KEYS = new Set(
  fs
    .readFileSync(path.join(ROOT, 'ops/env/site.env.example'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=OPTIONAL_SET_ON_VPS'))
    .map((l) => l.split('=')[0].trim())
);

const SAFE_LITERALS = new Set([
  '',
  '0',
  '1',
  'true',
  'false',
  'yes',
  'no',
  'on',
  'off',
  'whisper-1',
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-5.4',
  'v2',
  'v11',
  'v11sr',
  'strict',
  'medium',
  'relaxed',
  'flux',
  'essay_reuse',
  'fal',
  '2026-03-30-base',
  'REQUIRED_SET_ON_VPS',
  'OPTIONAL_SET_ON_VPS',
  'UNUSED_CONFIRM_DELETE',
  'yourdomain.com',
  'https://yourdomain.com',
  'your_fal_api_key',
]);

const PLACEHOLDER_ALREADY =
  /^(REQUIRED_SET_ON_VPS|OPTIONAL_SET_ON_VPS|UNUSED_CONFIRM_DELETE|your_|yourdomain)/i;

function stripQuotes(v) {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function looksSecret(value) {
  const v = stripQuotes(value);
  if (!v) return false;
  if (PLACEHOLDER_ALREADY.test(v)) return false;
  if (SAFE_LITERALS.has(v)) return false;
  if (/^https?:\/\/pay\.scholarshiptop\.com\//i.test(v)) return true;
  if (/^GTM-[A-Z0-9]+$/i.test(v)) return true; // could be public but sanitize for consistency
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i.test(v)) return true;
  if (/^sk-[A-Za-z0-9_-]+/i.test(v)) return true;
  if (/^sb_(secret|publishable)_/i.test(v)) return true;
  if (/^re_[A-Za-z0-9]+/i.test(v)) return true;
  if (/^-----BEGIN /i.test(v)) return true;
  if (/^[0-9]{8,}:[A-Za-z0-9_-]{20,}$/.test(v)) return true; // Telegram bot token shape
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return true;
  if (/^[a-f0-9-]{36}:[a-f0-9]+$/i.test(v)) return true; // FAL key shape
  if (/\.iam\.gserviceaccount\.com$/i.test(v)) return true;
  if (/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(v)) return true;
  if (/^https:\/\/scholarshiptop\.com\/?$/i.test(v)) return true;
  if (/^https:\/\/pay\.scholarshiptop\.com\//i.test(v)) return true;
  if (/^no-reply@/i.test(v)) return true;
  if (/^loomany\./i.test(v)) return true;
  if (/^st_[a-z0-9_]+$/i.test(v)) return true;
  if (/^super_secret/i.test(v)) return true;
  if (/^mysecret/i.test(v)) return true;
  if (/^Bot[0-9]+$/i.test(v)) return true;
  if (/^SuperSecret/i.test(v)) return true;
  if (/^kiska/i.test(v)) return true;
  if (/^[0-9]{6,}$/.test(v)) return true; // store ids, chat ids
  if (/^[A-Za-z0-9+/=]{80,}$/.test(v)) return true; // long base64-ish
  if (v.length >= 24 && /[A-Za-z0-9]/.test(v) && !/^[a-z0-9-]+$/i.test(v))
    return true;
  return false;
}

function placeholderForKey(key) {
  if (OPTIONAL_KEYS.has(key)) return 'OPTIONAL_SET_ON_VPS';
  if (/^#.*optional/i.test(key)) return 'OPTIONAL_SET_ON_VPS';
  return 'REQUIRED_SET_ON_VPS';
}

function sanitizeContent(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  const replacedKeys = [];
  let inMultiline = false;
  let multilineKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inMultiline) {
      if (line.includes('-----END')) {
        inMultiline = false;
        multilineKey = null;
      }
      continue;
    }

    if (!line.trim() || line.trim().startsWith('#')) {
      out.push(line);
      continue;
    }

    const eq = line.indexOf('=');
    if (eq === -1) {
      out.push(line);
      continue;
    }

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1);

    if (stripQuotes(value).includes('-----BEGIN ')) {
      replacedKeys.push(key);
      out.push(`${key}=REQUIRED_SET_ON_VPS`);
      inMultiline = true;
      multilineKey = key;
      continue;
    }

    if (looksSecret(value)) {
      replacedKeys.push(key);
      const ph = placeholderForKey(key);
      const quoted = line.includes('"') ? `"${ph}"` : ph;
      out.push(`${key}=${quoted}`);
      continue;
    }

    // Empty assignment with comment-only optional — keep structure
    if (!stripQuotes(value) && OPTIONAL_KEYS.has(key)) {
      out.push(`${key}=OPTIONAL_SET_ON_VPS`);
      continue;
    }

    out.push(line);
  }

  return { content: out.join('\n'), replacedKeys: [...new Set(replacedKeys)] };
}

function main() {
  if (!fs.existsSync(ENV_EXAMPLE)) {
    console.error('Missing .env.example');
    process.exit(1);
  }

  const raw = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  const { content, replacedKeys } = sanitizeContent(raw);

  fs.writeFileSync(ENV_EXAMPLE, content.endsWith('\n') ? content : `${content}\n`);

  const stats = {
    file: '.env.example',
    replacedCount: replacedKeys.length,
    replacedKeys: replacedKeys.sort(),
    rotationRecommended: replacedKeys.some((k) =>
      /SERVICE_ROLE|SECRET|API_KEY|TOKEN|PRIVATE_KEY|WEBHOOK/i.test(k)
    ),
  };

  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(stats, null, 2));

  console.log(
    JSON.stringify({
      ok: true,
      replacedCount: stats.replacedCount,
      rotationRecommended: stats.rotationRecommended,
    })
  );
}

main();
