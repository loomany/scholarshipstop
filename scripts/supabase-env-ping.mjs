/**
 * Проверка доступности Supabase из `.env.local` (без вывода секретов).
 *
 * Использует только NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Запуск: npm run supabase:ping-env
 * или:    node scripts/supabase-env-ping.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

function loadEnvLocal(file) {
  if (!fs.existsSync(file)) {
    console.error(`[supabase-env-ping] Файл не найден: ${file}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)=(.*)$/
    );
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnvLocal(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    '[supabase-env-ping] В .env.local нужны NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json'
};

function logLine(label, status, note = '') {
  const ok = status >= 200 && status < 300;
  const tag = ok ? 'OK' : '!!';
  console.log(`[${tag}] ${label}: HTTP ${status}${note ? ` — ${note}` : ''}`);
  return ok;
}

let failed = false;

console.log('[supabase-env-ping] URL:', new URL(url).host);
console.log('---');

try {
  const health = await fetch(`${url}/auth/v1/health`, { headers });
  if (!logLine('Auth /auth/v1/health', health.status)) failed = true;

  const restRoot = await fetch(`${url}/rest/v1/`, { headers });
  if (restRoot.status === 401 || restRoot.status === 404) {
    console.log(
      `[—] REST /rest/v1/: HTTP ${restRoot.status} — ожидаемо для «корня» PostgREST`
    );
  } else {
    logLine('REST /rest/v1/', restRoot.status);
  }

  for (const table of ['questionnaire_responses', 'essay_results']) {
    const r = await fetch(
      `${url}/rest/v1/${table}?select=id&limit=1`,
      { headers }
    );
    if (r.status === 404) {
      console.log(
        `[!!] REST /rest/v1/${table}: HTTP 404 — таблицы нет в проекте (миграции не применены?)`
      );
      failed = true;
    } else {
      logLine(
        `REST /rest/v1/${table}`,
        r.status,
        r.status === 200 ? 'таблица есть' : ''
      );
      if (r.status !== 200) failed = true;
    }
  }
} catch (e) {
  console.error('[supabase-env-ping] Ошибка сети:', e?.message ?? e);
  process.exit(1);
}

console.log('---');
if (failed) {
  console.log('[supabase-env-ping] Итог: есть проблемы (см. строки !!).');
  process.exit(1);
}
console.log('[supabase-env-ping] Итог: базовые проверки прошли.');
process.exit(0);
