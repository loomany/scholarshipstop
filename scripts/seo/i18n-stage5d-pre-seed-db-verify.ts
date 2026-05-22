/**
 * Stage 5D-2 — Pre-seed production read-only verification.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { PROVIDER_PILOT_SLUGS } from '@/lib/i18n/providerPilot/providerPilotSlugs';
import type { Database } from '@/types_db';

function loadEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
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

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !service || !anon) {
    console.error('Missing Supabase env in .env.local');
    process.exit(1);
  }

  const admin = createClient<Database>(url, service, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const pub = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const counts: Record<string, number | null> = {};
  for (const t of ['provider_profile', 'scholarship_category', 'resource_article']) {
    const { count, error } = await admin
      .from('content_translations')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', t);
    if (error) throw error;
    counts[t] = count;
  }

  const { data: providers } = await admin
    .from('providers')
    .select('id, slug')
    .in('slug', [...PROVIDER_PILOT_SLUGS]);

  const { count: anonNonPub } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'published');

  const base = process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com';
  const routeChecks: Record<string, number> = {};
  for (const path of [
    '/providers/loyola-university-chicago',
    '/providers/harvard-university',
    '/providers/university-of-michigan',
    '/es/providers/loyola-university-chicago',
    '/fr/providers/loyola-university-chicago'
  ]) {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, { redirect: 'manual' });
    routeChecks[path] = res.status;
  }

  console.log(
    JSON.stringify(
      {
        contentTranslationCounts: counts,
        pilotProviders: providers,
        anonNonPublishedVisible: anonNonPub,
        rlsPublishedOnlyPass: anonNonPub === 0,
        productionRouteChecks: routeChecks
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
