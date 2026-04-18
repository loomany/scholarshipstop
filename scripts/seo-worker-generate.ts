/**
 * Phase 3 — Process pending rows in seo_generation_queue (OpenAI → seo_hub_content
 * or university compare pages).
 *
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts --dry-run --limit=50
 *
 * Requires: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *
 * Queue paths:
 * - Programmatic hubs: same as before (`ca-arts-bachelors`, …).
 * - Compare: `compare/universities/[slugA]-vs-[slugB]` (slug pair alphabetically sorted).
 */

import { createClient } from '@supabase/supabase-js';

import {
  compareAiPayloadToJson,
  generateStateCompareWithOpenAi,
  generateUniversityCompareWithOpenAi,
  stateCompareAiPayloadToJson
} from '../lib/seo/comparePageAi';
import {
  buildStateCompareSourceCandidates,
  buildUniversityCompareSourceCandidates,
  parseCompareSources
} from '../lib/seo/compareSources';
import { generateSeoHubWithOpenAi } from '../lib/seo/seoHubContentAi';
import { parseProgrammaticTripleSeoHub } from '../lib/seo/programmaticSeoHubParse';
import { submitUrlsForImmediateIndexing } from '../lib/seo/googleIndexingQueue';
import { enqueueSeoPageInspectionUrls } from '../lib/seo/seoPageInspectionQueue';
import {
  canonicalStateVsSlug,
  parseStateVsSlug,
  stateCodeFromSlug
} from '../lib/seo/stateCompareSlug';
import {
  canonicalUniversityVsSlug,
  parseUniversityVsSlug
} from '../lib/seo/universityCompareSlug';
import { getURL } from '../utils/helpers';
import type { Database, Json } from '../types_db';

const DEFAULT_BATCH = 175;
const MAX_RETRIES = 2;
const UNIVERSITY_COMPARE_PREFIX = 'compare/universities/';
const STATE_COMPARE_PREFIX = 'compare/states/';
const UNIVERSITY_NAME_RE =
  /\b(university|college|institute|school|academy|polytechnic|campus)\b/i;
const NON_UNIVERSITY_NAME_RE =
  /\b(foundation|association|society|coalition|fellowship|ministry|church|club|network|center|centre|llc|inc|corp|company|initiative|program|organisation|organization|fund|alumni|trust|council|board|committee|league|athletic|athletics|conference|interscholastic|press|extension)\b/i;

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

function contentJsonHasSources(raw: Json | null | undefined): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const record = raw as Record<string, unknown>;
  return parseCompareSources(record.sources).length > 0;
}

function hubUrl(canonicalPath: string): string {
  const base = getURL().replace(/\/$/, '');
  return `${base}/scholarships/${canonicalPath.replace(/^\/+/, '')}`;
}

type Admin = ReturnType<typeof loadAdmin>;

async function revalidatePublishedSeoPaths(paths: string[]): Promise<void> {
  const secret =
    process.env.COMPARE_REVALIDATE_SECRET?.trim() ||
    process.env.PROVIDERS_REVALIDATE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return;

  try {
    const base = getURL().replace(/\/$/, '');
    await fetch(`${base}/api/internal/seo/revalidate-compare`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paths })
    });
  } catch (error) {
    console.error(
      '[seo-worker-generate] compare revalidate failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

function looksLikeUniversityInstitution(input: {
  slug?: string | null;
  name?: string | null;
  website_url?: string | null;
}) {
  const name = input.name?.trim() ?? '';
  const slug = input.slug?.trim().replace(/-/g, ' ') ?? '';
  const combined = `${name} ${slug}`.trim();
  if (!combined) return false;
  if (NON_UNIVERSITY_NAME_RE.test(combined)) return false;
  const website = input.website_url?.trim();
  if (website) {
    try {
      const host = new URL(website).hostname.toLowerCase();
      if (host.endsWith('.edu') || host.includes('.edu.')) return true;
    } catch {
      // fall back to name-based heuristic below
    }
  }
  return UNIVERSITY_NAME_RE.test(combined);
}

async function queueGeneratedSeoPageForPostPublishChecks(input: {
  url: string;
  source: string;
}) {
  await enqueueSeoPageInspectionUrls({
    urls: [input.url],
    source: `${input.source}:inspection`
  });

  const submission = await submitUrlsForImmediateIndexing({
    urls: [input.url],
    kind: 'page',
    source: `${input.source}:publish`
  });

  return submission.results[0]?.ping ?? { ok: false as const, error: 'missing_ping_result' };
}

async function runUniversityCompareFlow(args: {
  admin: Admin;
  row: {
    id: string;
    canonical_path: string;
    priority: number;
    grant_count: number | null;
  };
  pathKey: string;
  dryRun: boolean;
  year: number;
}): Promise<void> {
  const { admin, row, pathKey, dryRun, year } = args;
  const slug = pathKey.slice(UNIVERSITY_COMPARE_PREFIX.length).trim();
  if (!slug) {
    console.warn(`[skip] empty compare slug: ${pathKey}`);
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'empty compare slug'
        })
        .eq('id', row.id);
    }
    return;
  }

  const canon = canonicalUniversityVsSlug(slug);
  if (!canon || canon !== slug) {
    console.warn(
      `[skip] compare path must be alphabetically canonical: ${slug} → expected ${canon ?? 'n/a'}`
    );
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'compare slug not in canonical alphabetical order'
        })
        .eq('id', row.id);
    }
    return;
  }

  const parts = parseUniversityVsSlug(canon);
  if (!parts) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'parseUniversityVsSlug returned null'
        })
        .eq('id', row.id);
    }
    return;
  }

  const { data: insts, error: instErr } = await admin
    .from('institutions')
    .select('id, slug, name, website_url')
    .in('slug', [parts[0], parts[1]]);

  if (instErr || !insts || insts.length < 2) {
    console.warn(`[skip] institutions not found for ${parts[0]} / ${parts[1]}`);
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'institutions missing for versus slugs'
        })
        .eq('id', row.id);
    }
    return;
  }

  const sorted = [...insts].sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
  const [left, right] = sorted;
  if (!looksLikeUniversityInstitution(left) || !looksLikeUniversityInstitution(right)) {
    console.warn(`[skip] compare pair is not university-like: ${left.slug} vs ${right.slug}`);
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'pair is not university-like'
        })
        .eq('id', row.id);
    }
    return;
  }
  const sourceCandidates = buildUniversityCompareSourceCandidates({
    instAName: left.name,
    instAWebsiteUrl: left.website_url,
    instBName: right.name,
    instBWebsiteUrl: right.website_url
  });

  const { data: rpcData, error: rpcErr } = await admin.rpc(
    'get_comparison_data',
    {
      p_inst_a: left.id,
      p_inst_b: right.id
    }
  );

  if (rpcErr || rpcData == null) {
    console.warn(`[skip] get_comparison_data failed: ${rpcErr?.message}`);
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: rpcErr?.message ?? 'get_comparison_data null'
        })
        .eq('id', row.id);
    }
    return;
  }

  const root = rpcData as Record<string, unknown>;
  const ia = root.institution_a as Record<string, unknown> | undefined;
  const ib = root.institution_b as Record<string, unknown> | undefined;
  const ca = Number(ia?.grant_count ?? 0);
  const cb = Number(ib?.grant_count ?? 0);

  if (ca < 3 || cb < 3) {
    console.warn(
      `[skip] min 3 grants per institution (got ${ca} vs ${cb}) for ${canon}`
    );
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: `min 3 grants per side (got ${ca} vs ${cb})`
        })
        .eq('id', row.id);
    }
    return;
  }

  const { data: existingPage } = await admin
    .from('compare_pages')
    .select('id, ai_verdict, content_json')
    .eq('slug', canon)
    .maybeSingle();

  const refreshExistingCompare = argFlag('refresh-existing-compare');
  const shouldRefreshExistingCompare =
    Boolean(existingPage?.ai_verdict?.trim()) &&
    (refreshExistingCompare || !contentJsonHasSources(existingPage?.content_json));

  if (existingPage?.ai_verdict?.trim() && !shouldRefreshExistingCompare) {
    console.log(`[skip] compare page already generated: ${canon}`);
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({ status: 'completed', error_message: null })
        .eq('id', row.id);
    }
    return;
  }

  if (dryRun) {
    console.log(
      `[DRY RUN] would ${
        shouldRefreshExistingCompare ? 'refresh' : 'generate'
      } compare ${canon} (priority=${row.priority}, grants≈${ca}+${cb})`
    );
    console.log(`           → OpenAI + upsert compare_pages + ping indexing`);
    return;
  }

  await admin
    .from('seo_generation_queue')
    .update({ status: 'processing', error_message: null })
    .eq('id', row.id);

  let lastErr: string | null = null;
  let generated: Awaited<ReturnType<typeof generateUniversityCompareWithOpenAi>> =
    null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    generated = await generateUniversityCompareWithOpenAi({
      factsJson: JSON.stringify(rpcData),
      year,
      sourceCandidates
    });
    if (generated) break;
    lastErr = 'OpenAI returned empty compare payload';
  }

  if (!generated) {
    await admin
      .from('seo_generation_queue')
      .update({
        status: 'failed',
        error_message: lastErr ?? 'compare_generation_failed'
      })
      .eq('id', row.id);
    console.error(`[fail] compare ${canon}: ${lastErr}`);
    return;
  }

  const { error: upErr } = await admin.from('compare_pages').upsert(
    {
      slug: canon,
      inst_a_id: left.id,
      inst_b_id: right.id,
      content_json: compareAiPayloadToJson(generated),
      ai_verdict: generated.ai_verdict,
      meta_title: generated.meta_title,
      meta_description: generated.meta_description,
      status: 'published'
    },
    { onConflict: 'slug' }
  );

  if (upErr) {
    await admin
      .from('seo_generation_queue')
      .update({ status: 'failed', error_message: upErr.message })
      .eq('id', row.id);
    console.error(`[fail] upsert compare_pages ${canon}:`, upErr.message);
    return;
  }

  await admin
    .from('seo_generation_queue')
    .update({
      status: 'completed',
      error_message: null,
      grant_count: ca + cb
    })
    .eq('id', row.id);

  const base = getURL().replace(/\/$/, '');
  const publicUrl = `${base}/compare/universities/${encodeURIComponent(canon)}`;
  const ping = await queueGeneratedSeoPageForPostPublishChecks({
    url: publicUrl,
    source: 'seo-worker-generate:university-compare'
  });
  await revalidatePublishedSeoPaths([
    `/compare/universities/${encodeURIComponent(canon)}`
  ]);
  const skipLabel =
    ping.ok || !('skipped' in ping) || ping.skipped == null
      ? 'n/a'
      : ping.skipped;
  console.log(`[ok] compare ${canon} indexed=${ping.ok} skipped=${skipLabel}`);
}

async function runStateCompareFlow(args: {
  admin: Admin;
  row: {
    id: string;
    canonical_path: string;
    priority: number;
    grant_count: number | null;
  };
  pathKey: string;
  dryRun: boolean;
  year: number;
}): Promise<void> {
  const { admin, row, pathKey, dryRun, year } = args;
  const slug = pathKey.slice(STATE_COMPARE_PREFIX.length).trim();
  if (!slug) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'empty state compare slug'
        })
        .eq('id', row.id);
    }
    return;
  }

  const canon = canonicalStateVsSlug(slug);
  if (!canon || canon !== slug) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'state compare slug not in canonical alphabetical order'
        })
        .eq('id', row.id);
    }
    return;
  }

  const parts = parseStateVsSlug(canon);
  if (!parts) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'parseStateVsSlug returned null'
        })
        .eq('id', row.id);
    }
    return;
  }

  const codeA = stateCodeFromSlug(parts[0]);
  const codeB = stateCodeFromSlug(parts[1]);
  if (!codeA || !codeB) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'state slugs could not be mapped to USPS codes'
        })
        .eq('id', row.id);
    }
    return;
  }

  const { data: states, error: stateErr } = await admin
    .from('states')
    .select('code, slug, name')
    .in('code', [codeA, codeB]);

  if (stateErr || !states || states.length < 2) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: 'states missing for versus slugs'
        })
        .eq('id', row.id);
    }
    return;
  }

  const sorted = [...states].sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
  const [left, right] = sorted;

  const { data: rpcData, error: rpcErr } = await admin.rpc(
    'get_state_comparison_data',
    {
      p_state_a_code: left.code,
      p_state_b_code: right.code
    }
  );

  if (rpcErr || rpcData == null) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: rpcErr?.message ?? 'get_state_comparison_data null'
        })
        .eq('id', row.id);
    }
    return;
  }

  const root = rpcData as Record<string, unknown>;
  const sa = root.state_a as Record<string, unknown> | undefined;
  const sb = root.state_b as Record<string, unknown> | undefined;
  const ca = Number(sa?.grant_count ?? 0);
  const cb = Number(sb?.grant_count ?? 0);
  if (ca < 3 || cb < 3) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({
          status: 'failed',
          error_message: `min 3 grants per side (got ${ca} vs ${cb})`
        })
        .eq('id', row.id);
    }
    return;
  }

  const { data: existingPage } = await admin
    .from('state_compare_pages')
    .select('id, ai_verdict, content_json')
    .eq('slug', canon)
    .maybeSingle();

  const refreshExistingStateCompare = argFlag('refresh-existing-state-compare');
  const shouldRefreshExistingStateCompare =
    Boolean(existingPage?.ai_verdict?.trim()) &&
    (refreshExistingStateCompare || !contentJsonHasSources(existingPage?.content_json));

  if (existingPage?.ai_verdict?.trim() && !shouldRefreshExistingStateCompare) {
    if (!dryRun) {
      await admin
        .from('seo_generation_queue')
        .update({ status: 'completed', error_message: null })
        .eq('id', row.id);
    }
    return;
  }

  const sourceCandidates = buildStateCompareSourceCandidates({
    stateAName: left.name,
    stateBName: right.name
  });

  if (dryRun) {
    console.log(
      `[DRY RUN] would ${
        shouldRefreshExistingStateCompare ? 'refresh' : 'generate'
      } state compare ${canon} (priority=${row.priority}, grants≈${ca}+${cb})`
    );
    return;
  }

  await admin
    .from('seo_generation_queue')
    .update({ status: 'processing', error_message: null })
    .eq('id', row.id);

  let lastErr: string | null = null;
  let generated: Awaited<ReturnType<typeof generateStateCompareWithOpenAi>> = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    generated = await generateStateCompareWithOpenAi({
      factsJson: JSON.stringify(rpcData),
      year,
      sourceCandidates
    });
    if (generated) break;
    lastErr = 'OpenAI returned empty state compare payload';
  }

  if (!generated) {
    await admin
      .from('seo_generation_queue')
      .update({
        status: 'failed',
        error_message: lastErr ?? 'state_compare_generation_failed'
      })
      .eq('id', row.id);
    return;
  }

  const { error: upErr } = await admin.from('state_compare_pages').upsert(
    {
      slug: canon,
      state_a_code: left.code,
      state_b_code: right.code,
      content_json: stateCompareAiPayloadToJson(generated),
      ai_verdict: generated.ai_verdict,
      meta_title: generated.meta_title,
      meta_description: generated.meta_description,
      status: 'published'
    },
    { onConflict: 'slug' }
  );

  if (upErr) {
    await admin
      .from('seo_generation_queue')
      .update({ status: 'failed', error_message: upErr.message })
      .eq('id', row.id);
    return;
  }

  await admin
    .from('seo_generation_queue')
    .update({
      status: 'completed',
      error_message: null,
      grant_count: ca + cb
    })
    .eq('id', row.id);

  const base = getURL().replace(/\/$/, '');
  const publicUrl = `${base}/compare/states/${encodeURIComponent(canon)}`;
  const ping = await queueGeneratedSeoPageForPostPublishChecks({
    url: publicUrl,
    source: 'seo-worker-generate:state-compare'
  });
  await revalidatePublishedSeoPaths([`/compare/states/${encodeURIComponent(canon)}`]);
  const skipLabel =
    ping.ok || !('skipped' in ping) || ping.skipped == null
      ? 'n/a'
      : ping.skipped;
  console.log(`[ok] state compare ${canon} indexed=${ping.ok} skipped=${skipLabel}`);
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

    if (pathKey.startsWith(UNIVERSITY_COMPARE_PREFIX)) {
      await runUniversityCompareFlow({
        admin,
        row,
        pathKey,
        dryRun,
        year
      });
      continue;
    }

    if (pathKey.startsWith(STATE_COMPARE_PREFIX)) {
      await runStateCompareFlow({
        admin,
        row,
        pathKey,
        dryRun,
        year
      });
      continue;
    }

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

    const ping = await queueGeneratedSeoPageForPostPublishChecks({
      url: hubUrl(pathKey),
      source: 'seo-worker-generate:hub'
    });
    await revalidatePublishedSeoPaths([`/scholarships/${pathKey}`]);
    const skipLabel =
      ping.ok || !('skipped' in ping) || ping.skipped == null
        ? 'n/a'
        : ping.skipped;
    console.log(`[ok] ${pathKey} indexed=${ping.ok} skipped=${skipLabel}`);
  }

  if (dryRun) {
    console.log('\nDry run finished — no DB writes, no OpenAI calls.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
