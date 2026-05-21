/**
 * Stage 4C.1 — Read-only environment identification (no DB writes).
 * Usage: npx tsx scripts/seo/i18n-stage4c1-environment-check.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvKeys(path: string): Record<string, string> {
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function maskRef(url: string): { host: string; projectRef: string | null; isLocal: boolean } {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const isLocal =
      host === '127.0.0.1' ||
      host === 'localhost' ||
      host.endsWith('.local');
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return { host, projectRef: m?.[1] ?? null, isLocal };
  } catch {
    return { host: url, projectRef: null, isLocal: false };
  }
}

async function readOnlyTableProbe(url: string, anonKey: string, table: string) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: 'application/json'
  };
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=id&limit=1`, {
    headers
  });
  return res.status;
}

async function main() {
  const envPath = join(process.cwd(), '.env.local');
  const loadedFrom = existsSync(envPath) ? '.env.local' : '(missing)';
  const env = existsSync(envPath) ? loadEnvKeys(envPath) : {};
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim() ?? env.SITE_URL?.trim() ?? '';
  const { host, projectRef, isLocal } = maskRef(supabaseUrl);

  let classification: 'local' | 'staging' | 'production-linked' | 'unknown' = 'unknown';
  if (isLocal) classification = 'local';
  else if (siteUrl.includes('scholarshiptop.com') && projectRef) {
    classification = 'production-linked';
  }

  let contentTranslationsStatus: number | null = null;
  if (supabaseUrl && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    contentTranslationsStatus = await readOnlyTableProbe(
      supabaseUrl,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'content_translations'
    );
  }

  const dockerLocalReachable = await fetch('http://127.0.0.1:54321/rest/v1/', {
    signal: AbortSignal.timeout(2000)
  })
    .then((r) => r.status)
    .catch(() => null);

  console.log(
    JSON.stringify(
      {
        loadedFrom,
        classification,
        siteUrlHost: siteUrl ? new URL(siteUrl).host : null,
        supabaseHost: host,
        supabaseProjectRefMasked: projectRef ? `${projectRef.slice(0, 4)}…${projectRef.slice(-4)}` : null,
        isLocalSupabaseUrl: isLocal,
        localDockerSupabaseReachable: dockerLocalReachable != null,
        readOnlyContentTranslationsHttpStatus: contentTranslationsStatus,
        safeForMigrationApply:
          classification === 'local' || classification === 'staging',
        recommendation:
          classification === 'production-linked'
            ? 'STOP: .env.local targets production-linked hosted project. Start Docker + local Supabase OR provide separate staging env file before migration/seed.'
            : classification === 'local'
              ? 'OK for local migration/seed with explicit local URL.'
              : 'Clarify staging target before writes.'
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
