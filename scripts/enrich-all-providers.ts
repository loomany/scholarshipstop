/**
 * Ensure every slug in `provider_scholarship_stats` has a `providers` row, then run
 * OpenAI enrichment for each row with an empty `ai_description`.
 *
 *   npx tsx scripts/enrich-all-providers.ts
 *   npx tsx scripts/enrich-all-providers.ts --dry-run
 *   npx tsx scripts/enrich-all-providers.ts --limit=20
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import { enrichProviderData } from '../lib/providers/enrichProviderDataCore';
import {
  fetchProviderOfficialUrlsBySlug,
  fetchProviderSourceUrlsBySlug
} from '../lib/providers/providerOfficialUrl';
import { enqueueProviderUrlsForScript } from './lib/googleIndexing';
import type { Database } from '../types_db';

function loadEnvFiles() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

type StatRow = {
  slug: string;
  display_name: string | null;
  scholarship_count: number;
};

const PROVIDER_STATS = 'provider_scholarship_stats' as unknown as 'scholarships';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** PostgREST sometimes returns HTML bodies (502/Cloudflare) as the error message. */
function isTransientPostgrestError(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes('<!doctype') || m.includes('<html')) return true;
  if (m.includes('bad gateway') || m.includes('cloudflare')) return true;
  if (/\b502\b|\b503\b|\b504\b|\b524\b/.test(m)) return true;
  return false;
}

async function upsertProvidersBatchWithRetry(
  supabase: ReturnType<typeof createClient<Database>>,
  chunk: { slug: string; display_name: string; official_url?: string }[],
  batchLabel: string
): Promise<void> {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.from('providers').upsert(chunk, {
      onConflict: 'slug',
      ignoreDuplicates: true
    });
    if (!error) return;
    const retryable = isTransientPostgrestError(error.message);
    if (!retryable || attempt >= maxAttempts) {
      console.error(`Batch upsert failed at ${batchLabel}:`, error.message);
      process.exit(1);
    }
    const delayMs = Math.min(45_000, 1500 * 2 ** (attempt - 1));
    console.warn(
      `[providers upsert] transient error (attempt ${attempt}/${maxAttempts}), retry in ${delayMs}ms`
    );
    await sleep(delayMs);
  }
}

async function revalidateProviderPages(slugs: string[]): Promise<void> {
  const uniqueSlugs = Array.from(
    new Set(slugs.map((slug) => slug.trim()).filter(Boolean))
  );
  if (uniqueSlugs.length === 0) return;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://scholarshiptop.com';
  const secret = process.env.PROVIDERS_REVALIDATE_SECRET?.trim();
  if (!secret) {
    console.log(
      'Skipping provider page revalidation: PROVIDERS_REVALIDATE_SECRET is missing.'
    );
    return;
  }

  const endpoint = `${siteUrl.replace(/\/+$/, '')}/api/internal/providers/revalidate`;
  console.log(
    `Requesting provider page revalidation for ${uniqueSlugs.length} slug(s)...`
  );

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ slugs: uniqueSlugs })
    });

    if (!response.ok) {
      const details = await response.text();
      console.log(
        `Provider page revalidation failed with HTTP ${response.status}: ${details}`
      );
      return;
    }

    console.log(
      `Provider page revalidation completed for ${uniqueSlugs.length} slug(s).`
    );
  } catch (error) {
    console.log(
      `Provider page revalidation request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function fetchAllStats(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<StatRow[]> {
  const pageSize = 1000;
  const out: StatRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(PROVIDER_STATS)
      .select('slug, display_name, scholarship_count')
      .order('scholarship_count', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = (data ?? []) as StatRow[];
    if (batch.length === 0) break;
    out.push(...batch.filter((r) => r.slug?.trim()));
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function parseLimitArg(): number | null {
  const raw = process.argv.find((a) => a.startsWith('--limit='));
  if (!raw) return null;
  const n = Number.parseInt(raw.slice('--limit='.length), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const enrichLimit = parseLimitArg();
  loadEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();

  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (service role required for writes).'
    );
    process.exit(1);
  }
  if (!openai && !dryRun) {
    console.error('Missing OPENAI_API_KEY (or use --dry-run to only sync provider rows).');
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);

  console.log('Loading provider_scholarship_stats…');
  const stats = await fetchAllStats(supabase);
  console.log(`Found ${stats.length} provider slugs in stats view.`);
  console.log('Loading official provider URLs from scholarships…');
  const officialUrlsBySlug = await fetchProviderOfficialUrlsBySlug(
    supabase,
    stats.map((row) => row.slug)
  );
  const sourceUrlsBySlug = await fetchProviderSourceUrlsBySlug(
    supabase,
    stats.map((row) => row.slug)
  );
  console.log(
    `Found ${officialUrlsBySlug.size} provider slug(s) with an official URL.`
  );

  const upsertRows = stats.map((row) => {
    const slug = row.slug.trim();
    const display_name =
      row.display_name?.trim() || slug.replace(/-/g, ' ');
    const officialUrl = officialUrlsBySlug.get(slug);
    return {
      slug,
      display_name,
      ...(officialUrl ? { official_url: officialUrl } : {})
    };
  });

  let synced = 0;
  const syncedProviderSlugs: string[] = [];
  if (dryRun) {
    synced = upsertRows.length;
    console.log(
      `[dry-run] would upsert ${synced} row(s) from stats (onConflict slug, ignoreDuplicates).`
    );
  } else if (upsertRows.length > 0) {
    const BATCH = 150;
    for (let i = 0; i < upsertRows.length; i += BATCH) {
      const chunk = upsertRows.slice(i, i + BATCH);
      await upsertProvidersBatchWithRetry(
        supabase,
        chunk,
        `offset ${i}`
      );
      synced += chunk.length;
      syncedProviderSlugs.push(...chunk.map((row) => row.slug));
      console.log(
        `Upserted batch ${Math.floor(i / BATCH) + 1} (${chunk.length} rows), cumulative ${synced}/${upsertRows.length}`
      );
    }
    console.log(
      'Sync done: new slugs inserted; existing slugs left unchanged (ignoreDuplicates).'
    );
    if (syncedProviderSlugs.length > 0) {
      const queue = await enqueueProviderUrlsForScript(
        [...new Set(syncedProviderSlugs.map((s) => s.trim()))],
        'script:enrich-all-providers:sync'
      );
      console.log(
        `google indexing queue: +${queue.enqueued} provider URL(s), total queued ${queue.total}`
      );
    }
  } else {
    console.log('No rows from stats to sync.');
  }

  const { data: pending, error: pendErr } = await supabase
    .from('providers')
    .select('id, slug, display_name, ai_description')
    .or('ai_description.is.null,ai_description.eq.')
    .order('created_at', { ascending: true });

  if (pendErr) {
    console.error(pendErr);
    process.exit(1);
  }

  let queue = pending ?? [];
  console.log(
    `Found ${queue.length} provider(s) with empty ai_description ready for enrichment.`
  );

  if (queue.length === 0) {
    console.log('No new providers to enrich. Exiting...');
    process.exit(0);
  }

  if (enrichLimit != null && enrichLimit < queue.length) {
    console.log(
      `Applying --limit=${enrichLimit}: enriching first ${enrichLimit} of ${queue.length} queued.`
    );
    queue = queue.slice(0, enrichLimit);
  } else {
    console.log(`${queue.length} provider(s) queued for enrichment.`);
  }

  if (dryRun) {
    console.log('Dry run: skipping OpenAI calls.');
    process.exit(0);
  }

  let done = 0;
  const enrichedProviderSlugs: string[] = [];
  for (const row of queue) {
    const name = row.display_name?.trim();
    const slug = row.slug?.trim() || 'unknown-slug';
    const officialUrl = officialUrlsBySlug.get(slug) ?? null;
    const sourceUrls = sourceUrlsBySlug.get(slug) ?? [];
    console.log(
      `[${done + 1}/${queue.length}] Processing provider: ${name || '(missing display name)'} (${slug})`
    );
    if (!name) {
      console.log(
        `[${done + 1}/${queue.length}] FAIL display name is missing; provider left pending.`
      );
      done += 1;
      continue;
    }

    const enriched = await enrichProviderData(name, {
      sourceUrls: [
        ...(officialUrl ? [officialUrl] : []),
        ...sourceUrls
      ]
    });
    const description = enriched.description?.trim() || '';
    const sources = enriched.sources.filter(Boolean);
    if (!description || sources.length === 0) {
      console.log(
        `[${done + 1}/${queue.length}] FAIL OpenAI returned incomplete enrichment (missing description or sources); provider left pending.`
      );
      done += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from('providers')
      .update({
        ai_description: description,
        ...(officialUrl ? { official_url: officialUrl } : {}),
        ai_sources: sources,
        ai_faq: enriched.faq,
        state: enriched.state,
        is_enriched: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (upErr) {
      console.log(`[${done + 1}/${queue.length}] FAIL ${upErr.message}`);
    } else {
      const { data: updated } = await supabase
        .from('providers')
        .select('slug')
        .eq('id', row.id)
        .maybeSingle();
      if (updated?.slug?.trim()) {
        enrichedProviderSlugs.push(updated.slug.trim());
      }
      console.log(`[${done + 1}/${queue.length}] DONE`);
    }
    done += 1;
    await sleep(450);
  }

  console.log(
    `Enrichment complete. Processed ${done}/${queue.length} provider(s).`
  );
  if (enrichedProviderSlugs.length > 0) {
    const queue = await enqueueProviderUrlsForScript(
      enrichedProviderSlugs,
      'script:enrich-all-providers:enrich'
    );
    console.log(
      `google indexing queue: +${queue.enqueued} provider URL(s), total queued ${queue.total}`
    );
  }
  await revalidateProviderPages(enrichedProviderSlugs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
