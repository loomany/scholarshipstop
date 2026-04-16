/**
 * Recent rows in public.content_posts (diagnostics for Content Hub / Connect Hub).
 * Loads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local when present
 * (service role = can see drafts). Falls back to anon key if service role missing.
 *
 * Does not print secrets. Run: npm run content:inspect-recent
 *
 * Notes (Connect Hub worker):
 * - The job that logs "Publication failed/deferred", "watermark processing", etc. is NOT in this
 *   repository (see lib/content-hub/articleScholarshipMatching/runArticleScholarshipMatchingCore.ts).
 * - Find full logs where that worker runs (GitHub Actions in another repo, VPS, Cloudflare Worker,
 *   etc.): search the deployment for those strings or the scheduler name.
 * - If new rows stay on status=review_needed, they will not appear on /resources (site selects
 *   status=published only). Use scripts/publish-unpublished-content.ts after review, or change the
 *   worker to set status=published when appropriate.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

function loadEnvLocal(file) {
  if (!fs.existsSync(file)) {
    console.error(`[inspect-content-posts] Missing: ${file}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=(.*)$/
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
const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const key = service || anon;

if (!url || !key) {
  console.error(
    '[inspect-content-posts] Need NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local'
  );
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json',
  Prefer: 'count=exact'
};

const select =
  'id,title,slug,status,published_at,updated_at,cover_image_url';
const qs = new URLSearchParams({
  select,
  order: 'updated_at.desc.nullslast',
  limit: '25'
});

const res = await fetch(`${url}/rest/v1/content_posts?${qs}`, { headers });
const bodyText = await res.text();
let rows;
try {
  rows = JSON.parse(bodyText);
} catch {
  console.error('[inspect-content-posts] Non-JSON response', res.status, bodyText.slice(0, 500));
  process.exit(1);
}

if (!res.ok) {
  console.error('[inspect-content-posts] HTTP', res.status, rows);
  process.exit(1);
}

const mode = service ? 'service_role' : 'anon_only';
console.log(JSON.stringify({ host: new URL(url).host, mode, count: rows.length }, null, 2));
console.log('---');
for (const r of rows) {
  const cover = r.cover_image_url ? 'yes' : 'no';
  console.log(
    [
      r.updated_at?.slice(0, 19) ?? '(no updated_at)',
      `status=${r.status ?? 'null'}`,
      `slug=${r.slug ?? ''}`,
      `cover=${cover}`,
      (r.title || '').slice(0, 72)
    ].join(' | ')
  );
}
