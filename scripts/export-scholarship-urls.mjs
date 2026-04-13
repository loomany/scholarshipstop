/**
 * Экспорт URL:
 * - карточки грантов: /scholarships/{uuid|slug} из Supabase (активные, indexable)
 * - SEO: манифест + data/seo-scholarship-content + long-tail + категории
 *
 * Запуск: node scripts/export-scholarship-urls.mjs
 * (читает .env.local при наличии)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'exports');

const SITE_BASE = 'https://scholarshiptop.com';

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function scholarshipPublicPath(row) {
  const sl = row.slug?.trim();
  if (sl && !UUID_LIKE.test(sl)) {
    return `/scholarships/${encodeURIComponent(sl)}`;
  }
  return `/scholarships/${row.id}`;
}

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const LONG_TAIL_SLUGS = [
  'no-essay',
  'closing-soon',
  'undergraduate',
  'under-5000',
  'international-students',
  'high-school',
  'engineering',
  'computer-science',
  'under-10000'
];

const PROMOTED_CATEGORY_SLUGS = [
  'arts',
  'humanities',
  'medical',
  'law',
  'community',
  'biology',
  'safety',
  'music',
  'disability'
];

const CHUNK = 1000;

async function fetchAllScholarshipRows(url, anonKey) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const u = new URL(`${url.replace(/\/$/, '')}/rest/v1/scholarships`);
    u.searchParams.set(
      'select',
      'id,slug,updated_at,is_indexable,is_active'
    );
    u.searchParams.set('is_active', 'eq.true');
    u.searchParams.set('order', 'updated_at.desc');
    u.searchParams.set('limit', String(CHUNK));
    u.searchParams.set('offset', String(offset));

    const res = await fetch(u.toString(), {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Supabase ${res.status}: ${t.slice(0, 500)}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < CHUNK) break;
    offset += CHUNK;
  }
  return rows.filter((r) => r.is_indexable !== false);
}

function buildSeoUrlSet() {
  const manifestPath = path.join(root, 'data', 'seo-scholarship-routes.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestPaths = manifest.routes.map((r) => r.canonicalPath);

  const contentDir = path.join(root, 'data', 'seo-scholarship-content');
  const contentFiles = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'))
    : [];
  const contentPaths = contentFiles.map((f) => {
    const base = f.replace(/\.json$/, '');
    return base.replace(/__/g, '/');
  });

  const seoSet = new Set();
  for (const p of manifestPaths) seoSet.add(`${SITE_BASE}/scholarships/${p}`);
  for (const p of contentPaths) seoSet.add(`${SITE_BASE}/scholarships/${p}`);
  for (const slug of LONG_TAIL_SLUGS) {
    seoSet.add(`${SITE_BASE}/scholarships/${slug}`);
  }
  for (const cat of PROMOTED_CATEGORY_SLUGS) {
    seoSet.add(`${SITE_BASE}/scholarships/category/${cat}`);
  }
  return [...seoSet].sort();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const seoSorted = buildSeoUrlSet();
  fs.writeFileSync(
    path.join(outDir, 'seo-grant-listings-urls.txt'),
    seoSorted.join('\n') + '\n',
    'utf8'
  );
  console.log(
    `OK: ${seoSorted.length} SEO URL → exports/seo-grant-listings-urls.txt`
  );

  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    fs.writeFileSync(
      path.join(outDir, 'scholarship-card-detail-urls.SKIP.txt'),
      'Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local и снова запустите: node scripts/export-scholarship-urls.mjs\n',
      'utf8'
    );
    console.log(
      'Пропуск карточек: нет ключей Supabase → exports/scholarship-card-detail-urls.SKIP.txt'
    );
    return;
  }

  try {
    const rows = await fetchAllScholarshipRows(supabaseUrl, anonKey);
    const detailLines = rows
      .map((r) => `${SITE_BASE}${scholarshipPublicPath(r)}`)
      .sort();
    fs.writeFileSync(
      path.join(outDir, 'scholarship-card-detail-urls.txt'),
      detailLines.join('\n') + '\n',
      'utf8'
    );
    console.log(
      `OK: ${detailLines.length} карточек грантов → exports/scholarship-card-detail-urls.txt`
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fs.writeFileSync(
      path.join(outDir, 'scholarship-card-detail-urls.ERROR.txt'),
      msg + '\n',
      'utf8'
    );
    console.error('Ошибка Supabase:', msg);
  }
}

main();
