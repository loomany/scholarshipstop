/**
 * Stage 4C.3 — Read-only production checks (no writes).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadEnv(): Record<string, string> {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

function maskRef(url: string): string {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? `${m[1]!.slice(0, 4)}…${m[1]!.slice(-4)}` : url;
}

async function probeTable(url: string, anon: string, table: string) {
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: 'application/json' }
  });
  return res.status;
}

async function fetchLive(path: string) {
  const res = await fetch(`https://scholarshiptop.com${path}`, { redirect: 'follow' });
  return res.status;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const isLocal = url.includes('127.0.0.1') || url.includes('localhost');
  const tableStatus = await probeTable(url, anon, 'content_translations');

  let rowSummary: unknown = null;
  if (tableStatus === 200 && env.SUPABASE_SERVICE_ROLE_KEY) {
    const svc = env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/content_translations?select=source_type,status,locale`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}`, Accept: 'application/json' } }
    );
    if (res.ok) {
      const rows = (await res.json()) as {
        source_type: string;
        status: string;
        locale: string;
      }[];
      const groups: Record<string, number> = {};
      for (const r of rows) {
        const k = `${r.source_type}|${r.status}|${r.locale}`;
        groups[k] = (groups[k] ?? 0) + 1;
      }
      rowSummary = { total: rows.length, groups };
    }
  }

  const live = {
    enStem: await fetchLive('/scholarships/category/stem'),
    esStem: await fetchLive('/es/scholarships/category/stem'),
    frStem: await fetchLive('/fr/scholarships/category/stem')
  };

  console.log(
    JSON.stringify(
      {
        supabaseHost: new URL(url).hostname,
        projectRefMasked: maskRef(url),
        isLocalSupabase: isLocal,
        contentTranslationsHttpStatus: tableStatus,
        tableExists: tableStatus === 200,
        rowSummary,
        liveSiteCategoryRoutes: live
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
