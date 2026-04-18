import { createClient } from '@supabase/supabase-js';

import {
  generateStateCompareWithOpenAi,
  stateCompareAiPayloadToJson
} from '../lib/seo/comparePageAi';
import {
  buildStateCompareSourceCandidates,
  parseCompareSources
} from '../lib/seo/compareSources';
import { enqueueSeoPageInspectionUrls } from '../lib/seo/seoPageInspectionQueue';
import { submitUrlsForImmediateIndexing } from '../lib/seo/googleIndexingQueue';
import { getURL } from '../utils/helpers';
import type { Database, Json } from '../types_db';

type Admin = ReturnType<typeof loadAdmin>;

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

function argValue(name: string): string | null {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0 && process.argv[exactIndex + 1]) {
    return process.argv[exactIndex + 1]!.trim();
  }
  const raw = process.argv.find((item) => item.startsWith(`--${name}=`));
  return raw ? raw.slice(name.length + 3).trim() : null;
}

function argNum(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function hasSources(raw: Json | null | undefined): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return parseCompareSources((raw as Record<string, unknown>).sources).length > 0;
}

async function revalidatePublishedSeoPaths(paths: string[]): Promise<void> {
  const secret =
    process.env.COMPARE_REVALIDATE_SECRET?.trim() ||
    process.env.PROVIDERS_REVALIDATE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return;

  const base = getURL().replace(/\/$/, '');
  await fetch(`${base}/api/internal/seo/revalidate-compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paths })
  });
}

async function queuePostPublishChecks(url: string, source: string) {
  await enqueueSeoPageInspectionUrls({
    urls: [url],
    source: `${source}:inspection`
  });
  await submitUrlsForImmediateIndexing({
    urls: [url],
    kind: 'page',
    source: `${source}:publish`
  });
}

async function fetchTargetPages(
  admin: Admin,
  options: {
    slug?: string | null;
    limit: number;
    includeAlreadySourced: boolean;
  }
) {
  let query = admin
    .from('state_compare_pages')
    .select('id, slug, state_a_code, state_b_code, content_json, ai_verdict, status')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(options.limit);

  if (options.slug?.trim()) {
    query = query.eq('slug', options.slug.trim().toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return options.includeAlreadySourced
    ? rows
    : rows.filter((row) => !hasSources(row.content_json));
}

async function fetchStatePair(admin: Admin, codes: string[]) {
  const { data, error } = await admin
    .from('states')
    .select('code, slug, name')
    .in('code', codes);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function refreshPage(
  admin: Admin,
  row: {
    id: string;
    slug: string;
    state_a_code: string;
    state_b_code: string;
  }
) {
  const states = await fetchStatePair(admin, [row.state_a_code, row.state_b_code]);
  if (states.length < 2) {
    throw new Error(`States missing for compare page ${row.slug}`);
  }

  const byCode = new Map(states.map((item) => [item.code, item] as const));
  const stateA = byCode.get(row.state_a_code);
  const stateB = byCode.get(row.state_b_code);
  if (!stateA || !stateB) {
    throw new Error(`State pair mismatch for compare page ${row.slug}`);
  }

  const sourceCandidates = buildStateCompareSourceCandidates({
    stateAName: stateA.name,
    stateBName: stateB.name
  });

  const { data: rpcData, error: rpcErr } = await admin.rpc('get_state_comparison_data', {
    p_state_a_code: stateA.code,
    p_state_b_code: stateB.code
  });
  if (rpcErr || !rpcData) {
    throw new Error(rpcErr?.message ?? `Missing state comparison data for ${row.slug}`);
  }

  const generated = await generateStateCompareWithOpenAi({
    factsJson: JSON.stringify(rpcData),
    year: new Date().getFullYear(),
    sourceCandidates
  });
  if (!generated) {
    throw new Error(`OpenAI returned empty payload for ${row.slug}`);
  }

  const { error: updateErr } = await admin
    .from('state_compare_pages')
    .update({
      content_json: stateCompareAiPayloadToJson(generated),
      ai_verdict: generated.ai_verdict,
      meta_title: generated.meta_title,
      meta_description: generated.meta_description
    })
    .eq('id', row.id);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  const path = `/compare/states/${encodeURIComponent(row.slug)}`;
  const base = getURL().replace(/\/$/, '');
  const url = `${base}${path}`;
  await revalidatePublishedSeoPaths([path]);
  await queuePostPublishChecks(url, 'refresh-state-compare-pages');
}

async function main() {
  const admin = loadAdmin();
  const dryRun = argFlag('dry-run');
  const slug = argValue('slug');
  const limit = argNum('limit', slug ? 1 : 100);
  const concurrency = Math.max(1, Math.min(8, argNum('concurrency', 4)));
  const includeAlreadySourced = argFlag('force');

  const targets = await fetchTargetPages(admin, {
    slug,
    limit,
    includeAlreadySourced
  });

  console.log(
    `Found ${targets.length} state compare page(s) to ${dryRun ? 'inspect' : 'refresh'}.`
  );

  if (dryRun) {
    for (const row of targets) {
      console.log(`[dry-run] would refresh state compare page ${row.slug}`);
    }
    return;
  }

  console.log(`Running with concurrency=${concurrency}`);

  for (let index = 0; index < targets.length; index += concurrency) {
    const batch = targets.slice(index, index + concurrency);
    await Promise.all(
      batch.map(async (row, batchIndex) => {
        await refreshPage(admin, row);
        console.log(
          `[ok] refreshed state compare page ${row.slug} (${index + batchIndex + 1}/${targets.length})`
        );
      })
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
