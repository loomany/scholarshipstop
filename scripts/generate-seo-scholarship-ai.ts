/**
 * Generate JSON under data/seo-scholarship-content/ for manifest SEO routes (OpenAI, offline only).
 *
 * Catalog load order: --json= → SCHOLARSHIPS_JSON_URL → Supabase (NEXT_PUBLIC_SUPABASE_URL + anon or service key) → NEXT_PUBLIC_SITE_URL/api/scholarships.
 * Local data/scholarships.json is a small fixture; for real counts match /scholarships/* use Supabase or your deployed API.
 *
 *   OPENAI_API_KEY=... OPENAI_SEO_MODEL=gpt-4o-mini OPENAI_SEO_PROMPT_VERSION=v4 npx tsx scripts/generate-seo-scholarship-ai.ts
 *   npx tsx scripts/generate-seo-scholarship-ai.ts --json=data/scholarships.json --only-indexable --limit=100
 *   npx tsx scripts/generate-seo-scholarship-ai.ts --only-indexable --strict-indexable   # manifest indexable===true only
 *   npx tsx scripts/generate-seo-scholarship-ai.ts --slug=for-women/no-essay
 *   npx tsx scripts/generate-seo-scholarship-ai.ts --slug=engineering --debug-for=engineering
 *   npx tsx scripts/generate-seo-scholarship-ai.ts --dry-run
 *   npx tsx scripts/generate-seo-scholarship-ai.ts --force
 *
 * Generation mode (safe updates for ranked URLs):
 *   --mode=auto   (default) existing AI body that still passes QA → light ENHANCE; new/deterministic/bad QA → REWRITE; --force → REWRITE
 *   --mode=enhance  refresh copy from prior JSON (falls back to rewrite if no usable prior)
 *   --mode=rewrite  full new copy (use for new routes, deterministic fallback replacement, or intentional rewrites)
 *
 * OPENAI_SEO_ENABLED=0 disables generation.
 *
 * Route identity: use manifest `seoId` (set when running `build-seo-scholarship-routes.ts` /
 * `refreshManifestEntryDerived`) so generators and audits share one key per filter set.
 */

import fs from 'fs';
import path from 'path';

import OpenAI from 'openai';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import {
  buildSeoManifestAiContext,
  formatAiContextForPrompt
} from '../lib/scholarships/seoScholarshipAiContext';
import type { LongTailSeoBundle } from '../lib/scholarships/longTailSeoTypes';
import {
  buildDeterministicSeoBody,
  parseModelBodyFields,
  validateSeoAiBody,
  validateSeoMeta,
  type BodyFields,
  type SeoQualityContext
} from '../lib/scholarships/seoScholarshipContentQuality';
import {
  buildBodyQaRetryPrompt,
  buildEnhanceBodyQaRetryPrompt,
  type SeoEnhancePriorFaq,
  buildSeoEnhanceFaqPrompt,
  buildSeoEnhanceMetaPrompt,
  buildSeoEnhanceMetaRetryPrompt,
  buildSeoEnhancePagePrompt,
  buildSeoFaqPrompt,
  buildSeoMetaPrompt,
  buildSeoMetaRetryPrompt,
  buildSeoPagePrompt,
  type SeoEnhancePriorBody,
  type SeoEnhancePriorMeta,
  type SeoPagePromptInput
} from '../lib/scholarships/seoScholarshipPrompts';
import type {
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRoutesManifest
} from '../lib/scholarships/seoScholarshipManifest';
import { routeIsSitemapIndexable } from '../lib/scholarships/seoScholarshipResolve';
import { sanitizeSeoBundleNumericClaims } from '../lib/scholarships/seoAiNumericSanitizer';
import { fetchActiveScholarshipsForScript } from '../lib/scholarships/supabase';
import { getScholarshipsMatchingManifestEntry } from '../lib/scholarships/seoScholarshipListing';
import { buildSeoListingPageData } from '../lib/scholarships/seoScholarshipPageData';
import { fetchScholarshipsCatalogFromUrl } from './scholarshipsApiCatalog';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const OUT_DIR = path.join(ROOT, 'data', 'seo-scholarship-content');

function fileNameForSlug(canonicalPath: string): string {
  return `${canonicalPath.replace(/\//g, '__')}.json`;
}

async function loadScholarships(): Promise<Scholarship[]> {
  const jsonArg = process.argv
    .find((a) => a.startsWith('--json='))
    ?.slice('--json='.length);
  if (jsonArg) {
    const p = path.isAbsolute(jsonArg) ? jsonArg : path.join(ROOT, jsonArg);
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) throw new Error('expected array');
    const list = data as Scholarship[];
    if (list.length > 0 && list.length < 80) {
      console.warn(
        `[seo-ai] Loaded only ${list.length} scholarships from --json=${jsonArg}. Listing counts will not match /scholarships/* unless this is intentional. Prefer Supabase (env URL+key) or a full export.`
      );
    }
    return list;
  }

  const jsonUrl = process.env.SCHOLARSHIPS_JSON_URL?.trim();
  if (jsonUrl) {
    return fetchScholarshipsCatalogFromUrl(jsonUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && supabaseKey) {
    console.log('[seo-ai] Loading scholarships from Supabase (same source as /api/scholarships).');
    return fetchActiveScholarshipsForScript();
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const apiUrl = base ? `${base}/api/scholarships` : '';
  if (!apiUrl) {
    throw new Error(
      'Use --json=path/to.json, or set SCHOLARSHIPS_JSON_URL, or NEXT_PUBLIC_SUPABASE_URL + ANON/SERVICE key, or NEXT_PUBLIC_SITE_URL'
    );
  }
  return fetchScholarshipsCatalogFromUrl(apiUrl);
}

function countAndSamples(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): { count: number; titles: string[] } {
  const hit = getScholarshipsMatchingManifestEntry(list, entry);
  const titles = hit.slice(0, 8).map((s) => s.title?.trim() || 'Untitled');
  return { count: hit.length, titles };
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  const j = JSON.parse(cleaned) as unknown;
  if (!j || typeof j !== 'object') throw new Error('not object');
  return j as Record<string, unknown>;
}

const STALE_DAYS = 30;
const COUNT_DRIFT_RATIO = 0.15;

function readExistingBundle(fp: string): LongTailSeoBundle | null {
  if (!fs.existsSync(fp)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(fp, 'utf8')) as LongTailSeoBundle;
    if (!j || typeof j.seo_title !== 'string') return null;
    return j;
  } catch {
    return null;
  }
}

function shouldSkipRegeneration(args: {
  existing: LongTailSeoBundle | null;
  promptVersion: string;
  count: number;
  force: boolean;
}): boolean {
  if (args.force || !args.existing?._meta) return false;
  const m = args.existing._meta;
  if (m.promptVersion !== args.promptVersion) return false;
  const ageMs = Date.now() - new Date(m.generatedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > STALE_DAYS * 86400000) return false;
  const prev = m.scholarshipsCount;
  if (typeof prev !== 'number' || prev <= 0) return false;
  const drift = Math.abs(args.count - prev) / prev;
  if (drift > COUNT_DRIFT_RATIO) return false;
  return true;
}

function sortRoutesForGeneration(
  routes: SeoScholarshipRouteManifestEntry[]
): SeoScholarshipRouteManifestEntry[] {
  return [...routes].sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const cA = a.scholarshipsCount ?? a.minCountSnapshot ?? 0;
    const cB = b.scholarshipsCount ?? b.minCountSnapshot ?? 0;
    if (cB !== cA) return cB - cA;
    return a.canonicalPath.localeCompare(b.canonicalPath);
  });
}

function parseLimit(): number | null {
  const raw = process.argv.find((a) => a.startsWith('--limit='));
  if (!raw) return null;
  const n = parseInt(raw.split('=')[1] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** e.g. `--debug-for=engineering` matches `engineering` or `…/engineering`. */
function parseDebugFor(): string | null {
  const raw = process.argv.find((a) => a.startsWith('--debug-for='));
  const v = raw?.slice('--debug-for='.length)?.trim();
  return v || null;
}

function pathMatchesDebugFor(canonicalPath: string, debugFor: string): boolean {
  return (
    canonicalPath === debugFor ||
    canonicalPath.endsWith(`/${debugFor}`)
  );
}

type CliGenerationMode = 'enhance' | 'rewrite' | 'auto';

function parseCliGenerationMode(): CliGenerationMode {
  const raw = process.argv
    .find((a) => a.startsWith('--mode='))
    ?.slice('--mode='.length)
    ?.trim()
    .toLowerCase();
  if (!raw || raw === 'auto') return 'auto';
  if (raw === 'enhance' || raw === 'rewrite') return raw;
  console.error(`Invalid --mode value. Use enhance | rewrite | auto (default). Got: ${raw}`);
  process.exit(1);
}

function priorBodyFromBundle(b: LongTailSeoBundle): BodyFields | null {
  const intro = b.intro?.trim() ?? '';
  const supporting =
    typeof b.supporting === 'string' && b.supporting.trim()
      ? b.supporting.trim()
      : '';
  if (!intro || !supporting) return null;
  return parseModelBodyFields({
    intro,
    supporting,
    related_intro: b.related_intro,
    who_for: b.who_for,
    how_to_use: b.how_to_use
  });
}

function toEnhancePriorBody(b: BodyFields): SeoEnhancePriorBody {
  return {
    intro: b.intro,
    supporting: b.supporting,
    related_intro: b.related_intro ?? null,
    who_for: [...b.who_for],
    how_to_use: [...b.how_to_use]
  };
}

function priorMetaForEnhance(
  b: LongTailSeoBundle,
  entry: SeoScholarshipRouteManifestEntry
): SeoEnhancePriorMeta {
  return {
    seo_title: b.seo_title?.trim() || entry.metaTitleFallback,
    seo_description:
      b.seo_description?.trim() || entry.metaDescriptionFallback,
    h1:
      b.h1?.trim() ||
      b.seo_title?.trim() ||
      entry.h1Fallback
  };
}

function priorFaqForEnhance(b: LongTailSeoBundle): SeoEnhancePriorFaq | null {
  if (!b.faq?.length) return null;
  const faq = b.faq
    .filter((x) => x.question?.trim() && x.answer?.trim())
    .map((x) => ({
      question: x.question.trim(),
      answer: x.answer.trim()
    }));
  return faq.length > 0 ? { faq } : null;
}

/**
 * auto: ranked-safe refresh (enhance) when prior AI body still passes QA; full rewrite after --force or bad/missing prior.
 */
function resolveEffectiveGenerationMode(args: {
  cliMode: CliGenerationMode;
  force: boolean;
  existing: LongTailSeoBundle | null;
  qualityCtx: SeoQualityContext;
  priorParsed: BodyFields | null;
}): 'enhance' | 'rewrite' {
  if (args.cliMode === 'rewrite') return 'rewrite';
  if (args.cliMode === 'enhance') {
    return args.priorParsed ? 'enhance' : 'rewrite';
  }
  if (args.force) return 'rewrite';
  const ex = args.existing;
  if (!ex?._meta || ex._meta.bodySource !== 'ai') return 'rewrite';
  if (
    !args.priorParsed ||
    !validateSeoAiBody(args.priorParsed, args.qualityCtx).ok
  ) {
    return 'rewrite';
  }
  return 'enhance';
}

function bundleLooksAiGenerated(fp: string): boolean {
  const b = readExistingBundle(fp);
  return !!(b?._meta?.generatedAt && b._meta.promptVersion);
}

function isValidContentFile(fp: string): boolean {
  const b = readExistingBundle(fp);
  return !!(
    b &&
    b.seo_title?.trim() &&
    b.seo_description?.trim() &&
    b.intro?.trim()
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const onlyIndexable = process.argv.includes('--only-indexable');
  const strictIndexable = process.argv.includes('--strict-indexable');
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const onlySlug = slugArg?.slice('--slug='.length);
  const limit = parseLimit();
  const debugFor = parseDebugFor();
  const cliMode = parseCliGenerationMode();

  const enabled = process.env.OPENAI_SEO_ENABLED !== '0';
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_SEO_MODEL || 'gpt-4o-mini';
  const promptVersion = process.env.OPENAI_SEO_PROMPT_VERSION || 'v4';

  if (!enabled) {
    console.log('OPENAI_SEO_ENABLED=0 — skipping');
    return;
  }
  if (!key && !dryRun) {
    console.error('OPENAI_API_KEY required (or use --dry-run)');
    process.exit(1);
  }

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, 'utf8')
  ) as SeoScholarshipRoutesManifest;

  let routes = onlySlug
    ? manifest.routes.filter((r) => r.canonicalPath === onlySlug)
    : [...manifest.routes];

  if (onlyIndexable) {
    routes = routes.filter((r) =>
      strictIndexable ? r.indexable === true : routeIsSitemapIndexable(r)
    );
  }

  routes = sortRoutesForGeneration(routes);

  if (limit != null && !onlySlug) {
    routes = routes.slice(0, limit);
  }

  if (onlySlug && routes.length === 0) {
    console.error(`No manifest route matches --slug=${onlySlug}`);
    process.exit(1);
  }

  const list = dryRun ? [] : await loadScholarships();
  const client = key ? new OpenAI({ apiKey: key }) : null;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const stats = {
    wrote: 0,
    skippedFresh: 0,
    dryRunListed: 0,
    errors: 0,
    examples: [] as string[],
    modeEnhance: 0,
    modeRewrite: 0
  };

  const eligibleForReport = onlyIndexable
    ? manifest.routes.filter(routeIsSitemapIndexable)
    : manifest.routes;

  for (const entry of routes) {
    const fp = path.join(OUT_DIR, fileNameForSlug(entry.canonicalPath));
    if (dryRun) {
      console.log('Would generate', entry.canonicalPath, '→', fp);
      stats.dryRunListed += 1;
      continue;
    }

    const { count, titles } = countAndSamples(list, entry);
    const existing = readExistingBundle(fp);
    if (shouldSkipRegeneration({ existing, promptVersion, count, force })) {
      console.log('Skip (fresh)', entry.canonicalPath);
      stats.skippedFresh += 1;
      continue;
    }

    const ctx = buildSeoManifestAiContext(list, entry);
    const contextBlock = formatAiContextForPrompt(ctx);

    const baseInput: SeoPagePromptInput = {
      slug: entry.canonicalPath,
      pageType: entry.pageType,
      h1Fallback: entry.h1Fallback,
      metaTitleFallback: entry.metaTitleFallback,
      metaDescriptionFallback: entry.metaDescriptionFallback,
      scholarshipsCount: count,
      sampleTitles: titles,
      promptVersion,
      contextBlock
    };

    const qualityCtx: SeoQualityContext = {
      scholarshipsCount: count,
      awardMinUsd: ctx.awardAggregate.minUsd,
      awardMaxUsd: ctx.awardAggregate.maxUsd,
      awardNumericKnownCount: ctx.awardAggregate.knownNumericCount
    };

    const priorParsed = existing ? priorBodyFromBundle(existing) : null;
    const effectiveMode = resolveEffectiveGenerationMode({
      cliMode,
      force,
      existing,
      qualityCtx,
      priorParsed
    });
    const enhancePriorSnapshot =
      effectiveMode === 'enhance' && priorParsed
        ? toEnhancePriorBody(priorParsed)
        : null;
    const enhancePriorMeta =
      effectiveMode === 'enhance' && existing
        ? priorMetaForEnhance(existing, entry)
        : null;
    const enhancePriorFaq =
      effectiveMode === 'enhance' && existing
        ? priorFaqForEnhance(existing)
        : null;

    const metaPromptUser =
      effectiveMode === 'enhance' && enhancePriorMeta
        ? buildSeoEnhanceMetaPrompt(baseInput, enhancePriorMeta)
        : buildSeoMetaPrompt(baseInput);
    const bodyPromptUser =
      effectiveMode === 'enhance' && enhancePriorSnapshot
        ? buildSeoEnhancePagePrompt(baseInput, enhancePriorSnapshot)
        : buildSeoPagePrompt(baseInput);
    const faqPromptUser =
      effectiveMode === 'enhance'
        ? buildSeoEnhanceFaqPrompt(baseInput, enhancePriorFaq)
        : buildSeoFaqPrompt(baseInput);

    const tempMeta = effectiveMode === 'enhance' ? 0.3 : 0.38;
    const tempBody = effectiveMode === 'enhance' ? 0.3 : 0.42;
    const tempFaq = effectiveMode === 'enhance' ? 0.28 : 0.35;

    if (!client) continue;

    try {
      const [metaRaw, bodyRaw, faqRaw] = await Promise.all([
        client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: metaPromptUser }],
          temperature: tempMeta
        }),
        client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: bodyPromptUser }],
          temperature: tempBody
        }),
        client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: faqPromptUser }],
          temperature: tempFaq
        })
      ]);

      let meta = parseJsonObject(metaRaw.choices[0]?.message?.content ?? '{}');
      let metaReasons = validateSeoMeta(meta);
      if (metaReasons.length > 0) {
        const metaRetryPrompt =
          effectiveMode === 'enhance' && enhancePriorMeta
            ? buildSeoEnhanceMetaRetryPrompt(
                baseInput,
                enhancePriorMeta,
                metaReasons
              )
            : buildSeoMetaRetryPrompt(baseInput, metaReasons);
        const metaRetry = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: metaRetryPrompt
            }
          ],
          temperature: 0.22
        });
        meta = parseJsonObject(metaRetry.choices[0]?.message?.content ?? '{}');
        metaReasons = validateSeoMeta(meta);
        if (metaReasons.length > 0) {
          console.warn('Meta QA warnings', entry.canonicalPath, metaReasons);
        }
      }

      const debugBody =
        debugFor != null && pathMatchesDebugFor(entry.canonicalPath, debugFor);

      const firstBodyRawText = bodyRaw.choices[0]?.message?.content ?? '';
      let bodyObj = parseJsonObject(firstBodyRawText || '{}');
      let bodyFields: BodyFields | null = parseModelBodyFields(bodyObj);
      let bodyVal = bodyFields
        ? validateSeoAiBody(bodyFields, qualityCtx)
        : {
            ok: false,
            reasons: ['missing intro/supporting or bullet shape'],
            warnings: [] as string[]
          };

      if (debugBody) {
        console.log('\n=== DEBUG BODY', entry.canonicalPath, '===');
        console.log('generation mode:', effectiveMode, 'CLI --mode:', cliMode);
        console.log('--- raw AI body (first pass) ---\n', firstBodyRawText);
        console.log('--- QA (first pass) ---');
        console.log('ok:', bodyVal.ok);
        console.log('reasons:', bodyVal.reasons);
        console.log('warnings:', bodyVal.warnings);
      }

      if (!bodyFields || !bodyVal.ok) {
        const shapeRetryPrefix =
          effectiveMode === 'enhance' && enhancePriorSnapshot
            ? buildSeoEnhancePagePrompt(baseInput, enhancePriorSnapshot)
            : buildSeoPagePrompt(baseInput);
        const retryContent = !bodyFields
          ? `${shapeRetryPrefix}

RETRY — previous output was not valid JSON shape. Return ONLY:
{ "intro": string, "supporting": string, "related_intro": string | null, "who_for": string[], "how_to_use": string[] }
All string fields non-empty except related_intro may be null. who_for and how_to_use: 3–5 items each. No markdown.`
          : effectiveMode === 'enhance' && enhancePriorSnapshot
            ? buildEnhanceBodyQaRetryPrompt(
                baseInput,
                enhancePriorSnapshot,
                bodyVal.reasons,
                bodyVal.warnings ?? []
              )
            : buildBodyQaRetryPrompt(
                baseInput,
                bodyVal.reasons,
                bodyVal.warnings ?? []
              );
        const bodyRetry = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: retryContent }],
          temperature: 0.28
        });
        const retryRawText = bodyRetry.choices[0]?.message?.content ?? '';
        bodyObj = parseJsonObject(retryRawText || '{}');
        bodyFields = parseModelBodyFields(bodyObj);
        bodyVal = bodyFields
          ? validateSeoAiBody(bodyFields, qualityCtx)
          : {
              ok: false,
              reasons: ['parse failed on retry'],
              warnings: [] as string[]
            };

        if (debugBody) {
          console.log('--- raw AI body (retry) ---\n', retryRawText);
          console.log('--- QA (retry) ---');
          console.log('ok:', bodyVal.ok);
          console.log('reasons:', bodyVal.reasons);
          console.log('warnings:', bodyVal.warnings);
        }
      }

      let bodySource: 'ai' | 'deterministic' = 'ai';
      if (!bodyFields || !bodyVal.ok) {
        console.warn(
          'Body QA fallback (deterministic)',
          entry.canonicalPath,
          bodyVal.reasons
        );
        bodySource = 'deterministic';
        bodyFields = buildDeterministicSeoBody(
          entry.h1Fallback,
          entry.canonicalPath,
          qualityCtx
        );
      }

      if (debugBody) {
        console.log('--- final saved body ---');
        console.log(JSON.stringify(bodyFields, null, 2));
        console.log('bodySource:', bodySource);
        console.log('=== END DEBUG BODY ===\n');
      }

      const faqJ = parseJsonObject(faqRaw.choices[0]?.message?.content ?? '{}');
      const faqArr = faqJ.faq;
      const faq =
        Array.isArray(faqArr) &&
        faqArr.every(
          (x) =>
            x &&
            typeof x === 'object' &&
            typeof (x as { question?: string }).question === 'string' &&
            typeof (x as { answer?: string }).answer === 'string'
        )
          ? (faqArr as { question: string; answer: string }[]).map((x) => ({
              question: x.question.trim(),
              answer: x.answer.trim()
            }))
          : undefined;

      let faqFiltered = faq;
      if (faqFiltered?.length) {
        const ok = faqFiltered.filter(
          (x) => !/\d/.test(x.question) && !/\d/.test(x.answer)
        );
        if (ok.length < faqFiltered.length) {
          console.warn(
            'FAQ items omitted (digits not allowed in AI copy)',
            entry.canonicalPath
          );
        }
        faqFiltered = ok.length > 0 ? ok : undefined;
      }

      const bundle: LongTailSeoBundle = {
        seo_title: String(meta.seo_title ?? entry.metaTitleFallback).slice(0, 70),
        seo_description: String(
          meta.seo_description ?? entry.metaDescriptionFallback
        ).slice(0, 165),
        intro: bodyFields.intro,
        h1: typeof meta.h1 === 'string' ? meta.h1.trim() : undefined,
        supporting: bodyFields.supporting,
        related_intro: bodyFields.related_intro ?? undefined,
        how_to_use: bodyFields.how_to_use,
        who_for: bodyFields.who_for,
        faq: faqFiltered && faqFiltered.length > 0 ? faqFiltered : undefined,
        page_data: buildSeoListingPageData(list, entry),
        _meta: {
          canonicalPath: entry.canonicalPath,
          generatedAt: new Date().toISOString(),
          promptVersion,
          scholarshipsCount: count,
          model,
          bodySource,
          generationMode: effectiveMode
        }
      };

      fs.writeFileSync(
        fp,
        JSON.stringify(sanitizeSeoBundleNumericClaims(bundle), null, 2) + '\n'
      );
      if (effectiveMode === 'enhance') stats.modeEnhance += 1;
      else stats.modeRewrite += 1;
      console.log('Wrote', entry.canonicalPath, `(${effectiveMode})`);
      stats.wrote += 1;
      if (stats.examples.length < 10) stats.examples.push(entry.canonicalPath);
    } catch (e) {
      stats.errors += 1;
      console.error('Error', entry.canonicalPath, e);
    }
  }

  if (dryRun) {
    console.log('\n=== Summary (dry-run) ===');
    console.log(`Would process: ${stats.dryRunListed} route(s)`);
    return;
  }

  let withStoredContent = 0;
  let withGeneratorMeta = 0;
  for (const r of eligibleForReport) {
    const fp = path.join(OUT_DIR, fileNameForSlug(r.canonicalPath));
    if (isValidContentFile(fp)) withStoredContent += 1;
    if (bundleLooksAiGenerated(fp)) withGeneratorMeta += 1;
  }
  const fallbackOnly = eligibleForReport.length - withStoredContent;

  console.log('\n=== SEO scholarship AI generation report ===');
  console.log(`Model: ${model}  Prompt version: ${promptVersion}`);
  console.log(
    `Coverage denominator: sitemap-indexable routes=${eligibleForReport.length} (--only-indexable=${onlyIndexable}${strictIndexable ? ', strict-indexable' : ''})`
  );
  console.log(`New/updated files written: ${stats.wrote}`);
  console.log(
    `Modes this run: enhance=${stats.modeEnhance}, rewrite=${stats.modeRewrite} (CLI --mode=${cliMode})`
  );
  console.log(`Skipped as fresh (same version + stable count): ${stats.skippedFresh}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(
    `Coverage after run: ${withStoredContent} with valid SEO JSON, ${withGeneratorMeta} with script _meta, ${fallbackOnly} fallback-only (no valid JSON yet)`
  );
  if (stats.examples.length) {
    console.log('\nSample generated/updated paths (up to 10):');
    for (const s of stats.examples) console.log(`  - ${s}`);
  }
  console.log(
    '\nRun `npx tsx scripts/audit-seo-scholarship-content.ts` for duplicate / quality checks.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
