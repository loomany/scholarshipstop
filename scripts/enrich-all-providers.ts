/**
 * Ensure every slug in `provider_scholarship_stats` has a `providers` row, then run
 * OpenAI enrichment for each row with an empty `ai_description`.
 *
 *   npx tsx scripts/enrich-all-providers.ts
 *   npx tsx scripts/enrich-all-providers.ts --dry-run
 *   npx tsx scripts/enrich-all-providers.ts --limit=20
 *   npm run providers:enrich -- --no-sync-providers --limit=5
 *     (skip stats→providers upsert; only enrich existing pending rows)
 * Re-enrich specific slugs even when ai_description is already filled:
 *   npm run providers:enrich -- --no-sync-providers --only-slug=a,b,c --force
 * Bounded full-table re-enrich (FIFO by created_at; requires explicit --limit):
 *   npm run providers:enrich -- --no-sync-providers --limit=5 --force
 * Large bounded run (e.g. --limit=100000 --force); each row logs https://scholarshiptop.com/providers/{slug}.
 * Override log base URL: PROVIDER_ENRICH_LOG_SITE_URL=https://…
 *
 * With --force, rows skipped as resume only if they match a full successful enrichment write:
 * is_enriched + enriched_at + long description (~same bar as pipeline). Stub text + flags alone never skip.
 * To re-process everyone: --re-enrich-all.
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
import { buildProviderEnrichmentWritePatch } from '../lib/providers/providerEnrichmentStorageUpdate';
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

/**
 * Profile URL printed for each enriched row — defaults to production so logs stay
 * clickable when NEXT_PUBLIC_SITE_URL is ngrok/local. Override with PROVIDER_ENRICH_LOG_SITE_URL.
 */
function providerPublicProfileUrl(slug: string): string {
  const origin =
    process.env.PROVIDER_ENRICH_LOG_SITE_URL?.trim() ||
    'https://scholarshiptop.com';
  return `${origin.replace(/\/+$/, '')}/providers/${encodeURIComponent(slug)}`;
}

/**
 * Matches a row after successful buildProviderEnrichmentWritePatch — not loose flags + stub text.
 */
const MIN_RESUME_DESCRIPTION_WORDS = 150;

function isProviderEnrichmentPersisted(row: {
  description?: string | null;
  ai_description?: string | null;
  is_enriched?: boolean | null;
  enriched_at?: string | null;
}): boolean {
  if (row.is_enriched !== true || !String(row.enriched_at ?? '').trim()) {
    return false;
  }
  const text =
    row.description?.trim() || row.ai_description?.trim() || '';
  if (!text) return false;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return wordCount >= MIN_RESUME_DESCRIPTION_WORDS;
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

function parseOnlySlugList(): string[] {
  const raw = process.argv.find((a) => a.startsWith('--only-slug='));
  if (!raw) return [];
  return raw
    .slice('--only-slug='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Skip re-generation when canonical copy already looks like a solid org profile. */
function isGoodDescription(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;

  const wordCount = t.split(/\s+/).filter(Boolean).length;
  const lower = t.toLowerCase();

  return (
    wordCount >= 180 &&
    !lower.includes('publicly described') &&
    !lower.includes('publicly presented') &&
    !lower.includes('as reflected')
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const enrichLimit = parseLimitArg();
  const onlySlugs = parseOnlySlugList();
  const forceReenrich = process.argv.includes('--force');
  const reEnrichAll = process.argv.includes('--re-enrich-all');
  const noSyncProviders =
    process.argv.includes('--no-sync-providers') ||
    process.argv.includes('--only-enrich-existing');
  loadEnvFiles();

  if (forceReenrich && onlySlugs.length === 0) {
    if (enrichLimit == null || enrichLimit < 1) {
      console.error(
        'Refusing: --force requires --only-slug=slug1,slug2,... or bounded --limit=N (prevents full-table re-enrich).'
      );
      process.exit(1);
    }
  }

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

  let officialUrlsBySlug: Map<string, string>;
  let sourceUrlsBySlug: Map<string, string[]>;

  if (!noSyncProviders) {
    console.log('Loading provider_scholarship_stats…');
    const stats = await fetchAllStats(supabase);
    console.log(`Found ${stats.length} provider slugs in stats view.`);
    console.log('Loading official provider URLs from scholarships…');
    officialUrlsBySlug = await fetchProviderOfficialUrlsBySlug(
      supabase,
      stats.map((row) => row.slug)
    );
    sourceUrlsBySlug = await fetchProviderSourceUrlsBySlug(
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
  } else {
    console.log(
      '[--no-sync-providers] skipping stats load and stats→providers upsert.'
    );
    officialUrlsBySlug = new Map();
    sourceUrlsBySlug = new Map();
  }

  type QueueRow = {
    id: string;
    slug: string | null;
    display_name: string | null;
    ai_description: string | null;
    description: string | null;
    is_enriched?: boolean | null;
    enriched_at?: string | null;
  };

  let queue: QueueRow[];
  /** How many forced-queue rows skipped as already persisted (for empty-queue messaging). */
  let resumeDroppedAlreadyEnriched = 0;

  if (forceReenrich && onlySlugs.length > 0) {
    const { data, error: loadErr } = await supabase
      .from('providers')
      .select(
        'id, slug, display_name, ai_description, description, is_enriched, enriched_at'
      )
      .in('slug', onlySlugs)
      .order('created_at', { ascending: true });
    if (loadErr) {
      console.error(loadErr);
      process.exit(1);
    }
    queue = (data ?? []) as QueueRow[];
    console.log(
      `[--force --only-slug] loaded ${queue.length} provider row(s) for re-enrichment (${onlySlugs.length} slug(s) requested).`
    );
    if (queue.length < onlySlugs.length) {
      const found = new Set(
        queue.map((r) => r.slug?.trim()).filter(Boolean) as string[]
      );
      const missing = onlySlugs.filter((s) => !found.has(s));
      if (missing.length > 0) {
        console.log(`Warning: slug(s) not found in providers: ${missing.join(', ')}`);
      }
    }
  } else if (
    forceReenrich &&
    enrichLimit != null &&
    enrichLimit >= 1 &&
    onlySlugs.length === 0
  ) {
    /** PostgREST caps a single response (~1000 rows); page until we reach --limit or run out of rows. */
    const PAGE = 1000;
    queue = [];
    let from = 0;
    for (;;) {
      const remaining = enrichLimit - queue.length;
      if (remaining <= 0) break;
      const take = Math.min(PAGE, remaining);
      const { data: forcedRows, error: forcedErr } = await supabase
        .from('providers')
        .select(
          'id, slug, display_name, ai_description, description, is_enriched, enriched_at'
        )
        .not('slug', 'is', null)
        .order('created_at', { ascending: true })
        .range(from, from + take - 1);

      if (forcedErr) {
        console.error(forcedErr);
        process.exit(1);
      }

      const batch = (forcedRows ?? []) as QueueRow[];
      queue.push(...batch);
      if (batch.length < take) break;
      from += batch.length;
    }
    console.log(
      `[--force --limit=${enrichLimit}] loaded ${queue.length} provider row(s) for bounded re-enrichment (FIFO by created_at).`
    );
  } else {
    const { data: pending, error: pendErr } = await supabase
      .from('providers')
      .select('id, slug, display_name, ai_description, description')
      .or('ai_description.is.null,ai_description.eq.')
      .order('created_at', { ascending: true });

    if (pendErr) {
      console.error(pendErr);
      process.exit(1);
    }

    queue = (pending ?? []) as QueueRow[];
    console.log(
      `Found ${queue.length} provider(s) with empty ai_description ready for enrichment.`
    );

    if (onlySlugs.length > 0) {
      const want = new Set(onlySlugs.map((s) => s.trim()));
      const before = queue.length;
      queue = queue.filter((r) => r.slug && want.has(r.slug.trim()));
      console.log(
        `--only-slug: ${queue.length}/${before} pending provider(s) matched.`
      );
    }

    if (!forceReenrich && queue.length > 0) {
      const kept: QueueRow[] = [];
      for (const row of queue) {
        if (isGoodDescription(row.description)) {
          const slug = row.slug?.trim();
          console.log('[skip:good-description]', slug || row.id);
          continue;
        }
        kept.push(row);
      }
      queue = kept;
      console.log(
        `After good-description gate: ${queue.length} provider(s) still queued for OpenAI enrich.`
      );
    }
  }

  if (forceReenrich && !reEnrichAll && queue.length > 0) {
    const before = queue.length;
    queue = queue.filter((r) => !isProviderEnrichmentPersisted(r));
    resumeDroppedAlreadyEnriched = before - queue.length;
    if (resumeDroppedAlreadyEnriched > 0) {
      console.log(
        `[resume] skipping ${resumeDroppedAlreadyEnriched} provider(s) already persisted as enriched (--re-enrich-all disables this)`
      );
    }
  }

  if (queue.length === 0) {
    if (resumeDroppedAlreadyEnriched > 0) {
      console.log(
        'No providers left to enrich — every loaded row was already persisted (--re-enrich-all to redo). Exiting.'
      );
    } else {
      console.log(
        onlySlugs.length && !forceReenrich
          ? 'No matching pending providers. Use --force with --only-slug=... to re-enrich providers that already have ai_description.'
          : 'No providers to enrich. Exiting...'
      );
    }
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

  if (noSyncProviders) {
    const needSlugs = queue
      .map((r) => r.slug?.trim())
      .filter((s): s is string => Boolean(s));
    console.log(
      `[--no-sync-providers] loading URL maps for ${needSlugs.length} queued slug(s)…`
    );
    officialUrlsBySlug = await fetchProviderOfficialUrlsBySlug(supabase, needSlugs);
    sourceUrlsBySlug = await fetchProviderSourceUrlsBySlug(supabase, needSlugs);
    console.log(
      `--no-sync providers: ${officialUrlsBySlug.size} slug(s) with an official URL in scholarships.`
    );
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
    console.log(`[${done + 1}/${queue.length}] ${providerPublicProfileUrl(slug)}`);
    if (!name) {
      console.log(
        `[${done + 1}/${queue.length}] FAIL display name is missing; provider left pending.`
      );
      done += 1;
      continue;
    }

    const enriched = await enrichProviderData(name, {
      officialWebsiteUrl: officialUrl,
      providerSlug: slug,
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

    if (enriched.postQualityPassed !== true) {
      console.log(
        `[${done + 1}/${queue.length}] SKIP postQualityPassed=false; provider left pending.`
      );
      done += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from('providers')
      .update(
        buildProviderEnrichmentWritePatch({
          description,
          sources,
          faq: enriched.faq,
          state: enriched.state,
          officialUrl: officialUrl ?? undefined,
          postQualityPassed: true
        })
      )
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
