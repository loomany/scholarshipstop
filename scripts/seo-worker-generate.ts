/**
 * Phase 3 — Process pending rows in seo_generation_queue (OpenAI → seo_hub_content
 * or university compare pages).
 *
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts --dry-run --limit=50
 *   dotenv -e .env.local -- npx tsx scripts/seo-worker-generate.ts --compare-only --limit=1
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cutToMax(value: string, max: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= max) return normalized;
  const cut = normalized.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace >= 20) return cut.slice(0, lastSpace).trimEnd();
  return cut.trimEnd();
}

function ensureLengthRange(input: {
  value: string;
  min: number;
  max: number;
  padSuffix: string;
}): string {
  let out = cutToMax(input.value, input.max);
  while (out.length < input.min) {
    const candidate = normalizeWhitespace(`${out} ${input.padSuffix}`);
    if (candidate.length === out.length) break;
    out = candidate.length <= input.max ? candidate : cutToMax(candidate, input.max);
    if (out.length >= input.min) break;
  }
  return out;
}

function enforceSeoTitle(base: string, fallback: string): string {
  const seeded = normalizeWhitespace(base || fallback || 'Scholarships in USA 2026');
  const withIntent = /\b(compare|apply|find|explore|guide)\b/i.test(seeded)
    ? seeded
    : `${seeded} Compare Guide`;
  return ensureLengthRange({
    value: withIntent,
    min: 30,
    max: 65,
    padSuffix: 'USA scholarships'
  });
}

function enforceSeoMeta(base: string, fallback: string): string {
  let seeded = normalizeWhitespace(
    base ||
      fallback ||
      'Compare scholarship opportunities, understand eligibility and deadlines, and continue through provider application paths.'
  );
  if (!/\b(compare|find|explore|apply|review)\b/i.test(seeded)) {
    seeded = `${seeded} Compare options and apply.`;
  }
  return ensureLengthRange({
    value: seeded,
    min: 120,
    max: 160,
    padSuffix: 'Review eligibility, compare deadlines, and continue through provider pages.'
  });
}

function ensureFaqAtLeastThree(
  faq: Array<{ q: string; a: string }> | undefined,
  defaults: Array<{ q: string; a: string }>
): Array<{ q: string; a: string }> {
  const cleaned = (faq ?? [])
    .map((x) => ({ q: normalizeWhitespace(x.q), a: normalizeWhitespace(x.a) }))
    .filter((x) => x.q.length >= 8 && x.a.length >= 20);
  if (cleaned.length >= 3) return cleaned.slice(0, 5);
  const combined = [...cleaned];
  for (const d of defaults) {
    if (combined.length >= 3) break;
    combined.push({ q: normalizeWhitespace(d.q), a: normalizeWhitespace(d.a) });
  }
  return combined.slice(0, 5);
}

function requireGpt54ForSeoGeneration(dryRun: boolean): void {
  if (dryRun) return;
  const model = process.env.OPENAI_SEO_MODEL?.trim() || '';
  if (model !== 'gpt-5.4') {
    throw new Error(
      `OPENAI_SEO_MODEL must be exactly gpt-5.4 for seo-generation-http. Current value: ${model || '(empty)'}`
    );
  }
}

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
  /**
   * When true: still enqueue URL inspection + `google_indexing_queue`, but do not call the
   * Indexing API immediately — cron flush processes pending rows in order.
   */
  deferIndexingToQueueOnly?: boolean;
}) {
  await enqueueSeoPageInspectionUrls({
    urls: [input.url],
    source: `${input.source}:inspection`
  });

  const submission = await submitUrlsForImmediateIndexing({
    urls: [input.url],
    kind: 'page',
    source: `${input.source}:publish`,
    immediatePing: !input.deferIndexingToQueueOnly
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
    // Deterministic fallback: do not leave queue item broken.
    generated = {
      ai_verdict: `${left.name} and ${right.name} fit different applicant profiles. Compare scholarship volume, award patterns, and deadlines before deciding where to apply.`,
      meta_title: `${left.name} vs ${right.name} Scholarships 2026`,
      meta_description:
        `Compare ${left.name} and ${right.name} scholarships, review funding context, and choose the campus that fits your academic and financial goals.`,
      content_json: {
        body_html: `<article><h2>Financial Aid Overview for ${year}</h2><p>Compare ${left.name} and ${right.name} by scholarship volume, award patterns, eligibility expectations, deadlines, and provider application paths before applying.</p></article>`,
        essay_insights: {
          inst_a: `For ${left.name}, review prompt expectations and align your essay with academic fit and funding goals.`,
          inst_b: `For ${right.name}, focus your essay on program fit, impact, and readiness for the application process.`
        },
        faq: [
          {
            q: `Who should apply to ${left.name} vs ${right.name}?`,
            a: 'Applicants should compare program fit, scholarship volume, and eligibility rules at both institutions before submitting applications.'
          },
          {
            q: `How do I compare scholarship deadlines between these universities?`,
            a: 'Use ScholarshipTop and provider-path context to compare deadlines and required materials, then build a shared checklist for both schools.'
          },
          {
            q: 'What is the best application process for this comparison?',
            a: 'Shortlist your best-fit programs, prepare required documents early, and continue through provider or university application channels.'
          }
        ],
        sources: sourceCandidates.slice(0, 5)
      }
    };
    console.warn(`[fallback] compare ${canon}: ${lastErr ?? 'generation_failed'}`);
  }

  generated.meta_title = enforceSeoTitle(
    generated.meta_title,
    `${left.name} vs ${right.name} Scholarships 2026`
  );
  generated.meta_description = enforceSeoMeta(
    generated.meta_description,
    `Compare ${left.name} and ${right.name} scholarships, review funding context, and apply with confidence.`
  );
  generated.content_json.faq = ensureFaqAtLeastThree(generated.content_json.faq, [
    {
      q: `Who is eligible for scholarships at ${left.name} and ${right.name}?`,
      a: 'Eligibility differs by scholarship. Check each official listing for academic, residency, and program requirements.'
    },
    {
      q: `When are scholarship deadlines for ${left.name} and ${right.name}?`,
      a: 'Deadlines vary by scholarship and term. Confirm exact dates on each official scholarship page before applying.'
    },
    {
      q: 'How should I apply after comparing these universities?',
      a: 'Choose your top programs, gather required materials, and submit applications through official admissions and scholarship portals.'
    }
  ]);
  if (!generated.content_json.body_html?.trim()) {
    generated.content_json.body_html = `<article><h2>Financial Aid Overview for ${year}</h2><p>Compare ${left.name} and ${right.name} using scholarship volume, eligibility fit, and official deadline requirements before you apply.</p></article>`;
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
    source: 'seo-worker-generate:university-compare',
    deferIndexingToQueueOnly: true
  });
  await revalidatePublishedSeoPaths([
    `/compare/universities/${encodeURIComponent(canon)}`,
    '/compare',
    '/compare/universities'
  ]);
  const skipLabel =
    ping.ok || !('skipped' in ping) || ping.skipped == null ? 'n/a' : ping.skipped;
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
    generated = {
      ai_verdict: `${left.name} and ${right.name} serve different applicant goals. Compare scholarship volume, award profiles, eligibility signals, and provider-path context before applying.`,
      meta_title: `${left.name} vs ${right.name} Scholarships 2026`,
      meta_description:
        `Compare ${left.name} and ${right.name} scholarship climate, review opportunity volume, and plan applications using state-level provider context.`,
      content_json: {
        body_html: `<article><h2>Financial Aid Overview for ${year}</h2><p>Compare scholarship climate in ${left.name} and ${right.name} by opportunity volume, funding context, eligibility patterns, and provider application paths.</p></article>`,
        climate_summary: {
          state_a: `${left.name} offers its own scholarship climate with varying opportunity depth and eligibility criteria by program.`,
          state_b: `${right.name} has a different scholarship climate, so applicants should compare funding context and deadlines before applying.`
        },
        faq: [
          {
            q: `Who should apply in ${left.name} vs ${right.name}?`,
            a: 'Applicants should compare scholarship availability, eligibility fit, and institutional options across both states before deciding.'
          },
          {
            q: `How do I check scholarship deadlines in ${left.name} and ${right.name}?`,
            a: 'Deadlines vary by scholarship provider. Use provider-path context and your ScholarshipTop shortlist to plan dates for both states before submission.'
          },
          {
            q: 'What is the best application process after state comparison?',
            a: 'Build a shortlist, prepare required documents early, and continue through provider channels for your selected state programs.'
          }
        ],
        sources: sourceCandidates.slice(0, 5)
      }
    };
    console.warn(`[fallback] state compare ${canon}: ${lastErr ?? 'generation_failed'}`);
  }

  generated.meta_title = enforceSeoTitle(
    generated.meta_title,
    `${left.name} vs ${right.name} Scholarships 2026`
  );
  generated.meta_description = enforceSeoMeta(
    generated.meta_description,
    `Compare ${left.name} and ${right.name} scholarship climate, evaluate opportunities, and continue through provider application paths.`
  );
  generated.content_json.faq = ensureFaqAtLeastThree(generated.content_json.faq, [
    {
      q: `Who is eligible for scholarships in ${left.name} and ${right.name}?`,
      a: 'Eligibility varies by program and provider. Use provider-path context to compare academic and residency requirements.'
    },
    {
      q: `When are scholarship deadlines in ${left.name} and ${right.name}?`,
      a: 'Deadlines depend on each scholarship. Confirm final dates and terms on official pages before you apply.'
    },
    {
      q: 'How should I apply after comparing both states?',
      a: 'Choose programs that match your profile, prepare documents in advance, and apply through official scholarship portals.'
    }
  ]);
  if (!generated.content_json.body_html?.trim()) {
    generated.content_json.body_html = `<article><h2>Financial Aid Overview for ${year}</h2><p>Compare ${left.name} and ${right.name} by scholarship volume, fit, and application requirements using verified sources.</p></article>`;
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
    source: 'seo-worker-generate:state-compare',
    deferIndexingToQueueOnly: true
  });
  await revalidatePublishedSeoPaths([
    `/compare/states/${encodeURIComponent(canon)}`,
    '/compare',
    '/compare/states'
  ]);
  const skipLabel =
    ping.ok || !('skipped' in ping) || ping.skipped == null ? 'n/a' : ping.skipped;
  console.log(`[ok] state compare ${canon} indexed=${ping.ok} skipped=${skipLabel}`);
}

export type SeoWorkerGenerateOptions = {
  dryRun?: boolean;
  compareOnly?: boolean;
  limit?: number;
};

export async function runSeoWorkerGenerate(
  options: SeoWorkerGenerateOptions = {}
) {
  const dryRun = Boolean(options.dryRun);
  const compareOnly = Boolean(options.compareOnly);
  const limit =
    Number.isFinite(options.limit) && (options.limit ?? 0) > 0
      ? Math.floor(options.limit as number)
      : DEFAULT_BATCH;
  requireGpt54ForSeoGeneration(dryRun);
  const admin = loadAdmin();

  let pendingQuery = admin
    .from('seo_generation_queue')
    .select('id, canonical_path, filters, priority, grant_count')
    .eq('status', 'pending');

  if (compareOnly) {
    // PostgREST `like` in `.or()` uses `*` as wildcard (not `%`).
    pendingQuery = pendingQuery.or(
      'canonical_path.like.compare/universities*,canonical_path.like.compare/states*'
    );
  }

  const { data: rows, error } = await pendingQuery
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
      generated = {
        title: `${ctx.stateLabel} Scholarships`,
        h1: `${ctx.stateLabel}${ctx.topicLabel ? ` ${ctx.topicLabel}` : ''} Scholarships`,
        meta_description:
          `Explore ${ctx.stateLabel}${ctx.topicLabel ? ` ${ctx.topicLabel}` : ''} scholarships, compare eligibility and deadlines, and continue through provider listings.`,
        content_html: `<article><h2>Scholarship Guide</h2><p>Use this page to compare scholarship opportunities${ctx.topicLabel ? ` in ${ctx.topicLabel}` : ''} for ${ctx.stateLabel}. Review eligibility signals, deadlines, and provider application paths.</p></article>`,
        cost_of_living: {
          average_room_rent_usd_monthly: null,
          typical_lunch_usd: null,
          monthly_transport_usd: null,
          notes: 'No reliable cost-of-living numeric data available for deterministic fallback.'
        }
      };
      console.warn(`[fallback] ${pathKey}: ${lastErr ?? 'generation_failed'}`);
    }

    generated.title = enforceSeoTitle(
      generated.title,
      `${ctx.stateLabel}${ctx.topicLabel ? ` ${ctx.topicLabel}` : ''} Scholarships 2026`
    );
    generated.meta_description = enforceSeoMeta(
      generated.meta_description ?? '',
      `Find ${ctx.stateLabel}${ctx.topicLabel ? ` ${ctx.topicLabel}` : ''} scholarships, compare eligibility and deadlines, and continue through provider pages.`
    );
    generated.h1 = enforceSeoTitle(
      generated.h1 ?? generated.title,
      `${ctx.stateLabel} Scholarships`
    );
    if (!generated.content_html?.trim()) {
      generated.content_html = `<article><h2>Scholarship Guide</h2><p>Find scholarships for ${ctx.stateLabel}${ctx.topicLabel ? ` in ${ctx.topicLabel}` : ''}, review eligibility, and continue through provider application paths.</p></article>`;
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

  return { fetched: batch.length, dryRun, compareOnly, limit };
}

async function main() {
  const dryRun = argFlag('dry-run');
  const compareOnly = argFlag('compare-only');
  const limit = argNum('limit', DEFAULT_BATCH);
  await runSeoWorkerGenerate({ dryRun, compareOnly, limit });
}

const isDirectRun = (() => {
  const entry = process.argv[1] || '';
  return entry.endsWith('seo-worker-generate.ts') || entry.endsWith('seo-worker-generate.js');
})();

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
