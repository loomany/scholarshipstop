/**
 * Phase 3 — Process pending rows in seo_generation_queue (OpenAI → seo_hub_content).
 *
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts --dry-run --limit=50
 *
 * Requires: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js';

import { generateSeoHubWithOpenAi } from '../lib/seo/seoHubContentAi';
import { parseProgrammaticTripleSeoHub } from '../lib/seo/programmaticSeoHubParse';
import { pingGoogleIndexingDirect } from '../lib/seo/googleIndexingQueue';
import { getURL } from '../utils/helpers';
import type { Database, Json } from '../types_db';

const DEFAULT_BATCH = 175;
const MAX_RETRIES = 2;

function loadAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argNum(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const n = parseInt(raw.slice(name.length + 3), 10);
  return Number.isFinite(n) ? n : fallback;
}

function hubUrl(canonicalPath: string): string {
  const base = getURL().replace(/\/$/, '');
  return `${base}/scholarships/${canonicalPath.replace(/^\/+/, '')}`;
}

async function main() {
  const dryRun = argFlag('dry-run');
  const limit = argNum('limit', DEFAULT_BATCH);
  const admin = loadAdmin();

  const { data: rows, error } = await admin
    .from('seo_generation_queue')
    .select('id, canonical_path, filters, priority, grant_count')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  const batch = rows ?? [];
  console.log(`Fetched ${batch.length} pending queue rows (limit=${limit}).\n`);

  const year = new Date().getFullYear();

  for (const row of batch) {
    const pathKey = row.canonical_path.trim().toLowerCase();
    const ctx = parseProgrammaticTripleSeoHub(pathKey);
    if (!ctx) {
      console.warn(`[skip] cannot parse hub context: ${pathKey}`);
      if (!dryRun) {
        await admin
          .from('seo_generation_queue')
          .update({
            status: 'failed',
            error_message: 'parseProgrammaticTripleSeoHub returned null'
          })
          .eq('id', row.id);
      }
      continue;
    }

    const { data: existingHub } = await admin
      .from('seo_hub_content')
      .select('content_html')
      .eq('canonical_path', pathKey)
      .maybeSingle();

    if (existingHub?.content_html?.trim()) {
      console.log(`[skip] hub already has content: ${pathKey}`);
      if (!dryRun) {
        await admin
          .from('seo_generation_queue')
          .update({ status: 'completed', error_message: null })
          .eq('id', row.id);
      }
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY RUN] would generate ${pathKey} (priority=${row.priority}, grants=${row.grant_count ?? '?'})`
      );
      console.log(`           → OpenAI + upsert seo_hub_content + ping indexing`);
      continue;
    }

    await admin
      .from('seo_generation_queue')
      .update({ status: 'processing', error_message: null })
      .eq('id', row.id);

    let lastErr: string | null = null;
    let generated: Awaited<ReturnType<typeof generateSeoHubWithOpenAi>> = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      generated = await generateSeoHubWithOpenAi({
        stateName: ctx.stateLabel,
        topicLabel: ctx.topicLabel,
        degreeLabel: ctx.degreeLabel,
        year
      });
      if (generated) break;
      lastErr = 'OpenAI returned empty payload';
    }

    if (!generated) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: lastErr ?? 'generation_failed'
        })
        .eq('id', row.id);
      console.error(`[fail] ${pathKey}: ${lastErr}`);
      continue;
    }

    const { error: upErr } = await admin.from('seo_hub_content').upsert(
      {
        canonical_path: pathKey,
        title: generated.title,
        h1: generated.h1 ?? null,
        meta_description: generated.meta_description ?? null,
        content_html: generated.content_html,
        cost_of_living_json: generated.cost_of_living as unknown as Json
      },
      { onConflict: 'canonical_path' }
    );

    if (upErr) {
      await admin
        .from('seo_generation_queue')
        .update({ status: 'failed', error_message: upErr.message })
        .eq('id', row.id);
      console.error(`[fail] upsert hub ${pathKey}:`, upErr.message);
      continue;
    }

    await admin
      .from('seo_generation_queue')
      .update({
        status: 'completed',
        error_message: null,
        grant_count: row.grant_count
      })
      .eq('id', row.id);

    const ping = await pingGoogleIndexingDirect(hubUrl(pathKey));
    const skipLabel =
      ping.ok || !('skipped' in ping) || ping.skipped == null
        ? 'n/a'
        : ping.skipped;
    console.log(
      `[ok] ${pathKey} indexed=${ping.ok} skipped=${skipLabel}`
    );
  }

  if (dryRun) {
    console.log('\nDry run finished — no DB writes, no OpenAI calls.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
