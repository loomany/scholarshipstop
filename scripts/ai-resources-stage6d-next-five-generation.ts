/**
 * Stage 6D — generate + polish next 5 AI resource drafts (review_needed only).
 *
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6d-next-five-generation.ts --preflight
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6d-next-five-generation.ts --run
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  buildAiPackTopicString,
  parseAiPackTopicString,
  type AiResourcesPackFile
} from '@/lib/content-hub/aiResourcesPackShared';
import {
  AI_RESOURCE_LIVE_PUBLISHED_SLUGS,
  AI_RESOURCE_STAGE6C_REVIEW_SLUGS,
  AI_RESOURCE_STAGE6D_REVIEW_SLUGS,
  analyzeStage6dDraft,
  polishAiResourceStage6dDraftMarkdown,
  type AiResourceStage6dReviewSlug
} from '@/lib/content-hub/polishAiResourceStage6dDrafts';
import { markdownToHtml } from '@/services/content-hub/src/lib/html.ts';
import {
  countCharsNoSpaces,
  countWords
} from '@/services/content-hub/src/lib/markdown.ts';

const PACK_ID = 'ai-resources-2026-05-22';
const PACK_PATH = path.join(
  process.cwd(),
  'data/content/ai-resources-topics-stage6d-2026-05-22.json'
);
const TARGET_SLUGS = [...AI_RESOURCE_STAGE6D_REVIEW_SLUGS];
const ENV_PATH = path.join(process.cwd(), 'services/content-hub/.env');
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6d-next-five-generation-2026-05-22.md'
);
const PREVIEW_DIR = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6d-polished-previews-2026-05-22'
);
const POLISHED_DATA_DIR = path.join(process.cwd(), 'data/content/polished');

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function bodyFingerprint(md: string): string {
  return createHash('sha256').update(md).digest('hex').slice(0, 16);
}

async function readEnvKeys(): Promise<Record<string, string>> {
  const raw = await fs.readFile(ENV_PATH, 'utf8');
  const map: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    map[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return map;
}

async function patchEnvStage6d() {
  let raw = await fs.readFile(ENV_PATH, 'utf8');
  const replacements: [RegExp, string][] = [
    [/^CONTENT_HUB_POSTS_PER_RUN=.*$/m, 'CONTENT_HUB_POSTS_PER_RUN=1'],
    [/^CONTENT_HUB_BATCH_LIMIT=.*$/m, 'CONTENT_HUB_BATCH_LIMIT=1'],
    [/^CONTENT_HUB_AUTO_PUBLISH=.*$/m, 'CONTENT_HUB_AUTO_PUBLISH=0'],
    [/^OPENAI_MODEL_STANDARD=.*$/m, 'OPENAI_MODEL_STANDARD=gpt-5.5'],
    [/^OPENAI_MODEL_SMART=.*$/m, 'OPENAI_MODEL_SMART=gpt-5.5'],
    [/^CONTENT_HUB_SOURCE=.*$/m, `CONTENT_HUB_SOURCE=${PACK_ID}`]
  ];
  for (const [re, rep] of replacements) {
    if (re.test(raw)) raw = raw.replace(re, rep);
    else raw += `\n${rep}\n`;
  }
  await fs.writeFile(ENV_PATH, raw, 'utf8');
}

async function setAllowProductionWrites(enabled: boolean) {
  let raw = await fs.readFile(ENV_PATH, 'utf8');
  const line = 'CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1';
  if (enabled) {
    if (/^#\s*CONTENT_HUB_ALLOW_PRODUCTION_WRITES/m.test(raw)) {
      raw = raw.replace(/^#\s*CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1.*$/m, line);
    } else if (!raw.includes(line)) {
      raw += `\n${line}\n`;
    }
  } else {
    raw = raw.replace(new RegExp(`^${line}\\s*$`, 'm'), '# CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1');
  }
  await fs.writeFile(ENV_PATH, raw, 'utf8');
}

function supabase() {
  return createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}

async function assertEnvConfig() {
  const keys = await readEnvKeys();
  const present: Record<string, boolean> = {
    OPENAI_API_KEY: Boolean(keys.OPENAI_API_KEY),
    OPENAI_MODEL_STANDARD_gpt55: keys.OPENAI_MODEL_STANDARD === 'gpt-5.5',
    OPENAI_MODEL_SMART_gpt55: keys.OPENAI_MODEL_SMART === 'gpt-5.5',
    AUTO_PUBLISH_0: keys.CONTENT_HUB_AUTO_PUBLISH === '0',
    POSTS_PER_RUN_1: keys.CONTENT_HUB_POSTS_PER_RUN === '1',
    BATCH_LIMIT_1: keys.CONTENT_HUB_BATCH_LIMIT === '1',
    SOURCE_pack: keys.CONTENT_HUB_SOURCE === PACK_ID,
    ALLOW_WRITES_1: keys.CONTENT_HUB_ALLOW_PRODUCTION_WRITES === '1'
  };
  console.log(JSON.stringify({ phase: 'env_check', present }, null, 2));
  const fail = Object.entries(present).filter(([, ok]) => !ok).map(([k]) => k);
  if (fail.length) throw new Error(`Env check failed: ${fail.join(', ')}`);
}

async function snapshotProtectedPosts() {
  const sb = supabase();
  const slugs = [
    ...AI_RESOURCE_LIVE_PUBLISHED_SLUGS,
    ...AI_RESOURCE_STAGE6C_REVIEW_SLUGS
  ];
  const { data, error } = await sb
    .from('content_posts')
    .select('slug, status, body_markdown, word_count, updated_at')
    .in('slug', slugs);
  if (error) throw error;
  return new Map(
    (data ?? []).map((p) => [
      p.slug,
      {
        status: p.status,
        fingerprint: bodyFingerprint(p.body_markdown ?? ''),
        word_count: p.word_count
      }
    ])
  );
}

async function preflightDb() {
  const sb = supabase();
  const { data: targetPosts, error: pe } = await sb
    .from('content_posts')
    .select('id, slug, status')
    .in('slug', TARGET_SLUGS);
  if (pe) throw pe;

  const collisions = (targetPosts ?? []).filter((p) => p.status !== 'review_needed');
  if (collisions.length) {
    throw new Error(
      `Target slug collision: ${collisions.map((c) => `${c.slug}(${c.status})`).join(', ')}`
    );
  }

  for (const slug of AI_RESOURCE_LIVE_PUBLISHED_SLUGS) {
    const row = await sb
      .from('content_posts')
      .select('status')
      .eq('slug', slug)
      .maybeSingle();
    if (!row.data || row.data.status !== 'published') {
      throw new Error(`Live article must stay published: ${slug}`);
    }
  }

  const { data: topics, error: te } = await sb
    .from('content_topics')
    .select('id, topic, status')
    .in('status', ['queued', 'processing']);
  if (te) throw te;

  const packQueued = (topics ?? []).filter((t) => {
    const p = parseAiPackTopicString(t.topic);
    return p?.packId === PACK_ID;
  });
  const slugsInQueue = packQueued
    .map((t) => parseAiPackTopicString(t.topic)?.slug)
    .filter(Boolean) as string[];
  const extra = slugsInQueue.filter((s) => !TARGET_SLUGS.includes(s));

  console.log(
    JSON.stringify(
      {
        phase: 'preflight_db',
        targetSlugs: TARGET_SLUGS,
        existingTargetPosts: (targetPosts ?? []).length,
        packQueuedCount: packQueued.length,
        slugsInQueue,
        extraQueuedSlugs: extra
      },
      null,
      2
    )
  );
  if (extra.length) {
    throw new Error(`Other ${PACK_ID} topics queued: ${extra.join(', ')}`);
  }

  return {
    missing: TARGET_SLUGS.filter(
      (s) => !(targetPosts ?? []).some((p) => p.slug === s) && !slugsInQueue.includes(s)
    )
  };
}

async function seedSlug(slug: string) {
  const raw = await fs.readFile(PACK_PATH, 'utf8');
  const pack = JSON.parse(raw) as AiResourcesPackFile;
  if (pack.packId !== PACK_ID) throw new Error(`Unexpected packId ${pack.packId}`);
  const topic = pack.topics.find((t) => t.slug === slug);
  if (!topic) throw new Error(`No topic in pack: ${slug}`);

  const sb = supabase();
  const { error } = await sb.from('content_topics').insert({
    topic: buildAiPackTopicString(topic, pack.packId),
    priority: 2000 + pack.topics.indexOf(topic),
    status: 'queued'
  });
  if (error) throw error;
  console.log(JSON.stringify({ phase: 'seed', slug }, null, 2));
}

async function runCmd(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
      env: process.env
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

function isBudgetOrQuotaError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('insufficient_quota') ||
    m.includes('rate_limit') ||
    m.includes('billing') ||
    m.includes('exceeded') ||
    m.includes('429') ||
    m.includes('budget')
  );
}

async function postReady(slug: string): Promise<boolean> {
  const { data } = await supabase()
    .from('content_posts')
    .select('status')
    .eq('slug', slug)
    .maybeSingle();
  return data?.status === 'review_needed';
}

function cleanupExternalAnchors(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (_full, attrs: string) => {
    let a = attrs;
    const hrefMatch = a.match(/\bhref=["']([^"']+)["']/i);
    const href = hrefMatch?.[1] ?? '';
    if (!/^https?:\/\//i.test(href)) {
      a = a.replace(/\s*target=["'][^"']*["']/gi, '');
      a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
      return `<a${a}>`;
    }
    a = a.replace(/\s*target=["'][^"']*["']/gi, '');
    a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
    return `<a${a} target="_blank" rel="noopener noreferrer nofollow">`;
  });
}

async function polishStage6dDrafts() {
  const sb = supabase();
  const results: Array<{
    slug: string;
    qa: ReturnType<typeof analyzeStage6dDraft>;
    polished: boolean;
  }> = [];

  for (const slug of TARGET_SLUGS) {
    const { data: post, error } = await sb
      .from('content_posts')
      .select('id, slug, status, title, body_markdown, body_html')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!post || post.status !== 'review_needed') {
      throw new Error(`Missing review_needed post for polish: ${slug}`);
    }

    const mdBefore = post.body_markdown ?? '';
    const polishedMd = polishAiResourceStage6dDraftMarkdown(
      slug as AiResourceStage6dReviewSlug,
      mdBefore
    );
    let html = cleanupExternalAnchors(await markdownToHtml(polishedMd));
    html = deduplicateQuickSummaryBlocksInHtml(html);
    const qa = analyzeStage6dDraft(polishedMd, html);

    const { error: upErr } = await sb
      .from('content_posts')
      .update({
        body_markdown: polishedMd,
        body_html: html,
        word_count: countWords(polishedMd),
        char_count: countCharsNoSpaces(polishedMd),
        updated_at: new Date().toISOString()
      })
      .eq('id', post.id)
      .eq('slug', slug)
      .eq('status', 'review_needed');
    if (upErr) throw upErr;

    await fs.mkdir(POLISHED_DATA_DIR, { recursive: true });
    await fs.mkdir(PREVIEW_DIR, { recursive: true });
    await fs.writeFile(
      path.join(POLISHED_DATA_DIR, `${slug}-stage6d-2026-05-22.md`),
      polishedMd,
      'utf8'
    );
    const preview = `# ${post.title}\n\n**slug:** ${slug}  \n**status:** review_needed  \n**post_id:** ${post.id}  \n**source:** ${PACK_ID}\n\n---\n\n${polishedMd}`;
    await fs.writeFile(path.join(PREVIEW_DIR, `${slug}.md`), preview, 'utf8');

    results.push({ slug, qa, polished: true });
    console.log(JSON.stringify({ phase: 'polish', slug, qa }, null, 2));
  }
  return results;
}

async function buildReport(
  polishResults: Array<{
    slug: string;
    qa: ReturnType<typeof analyzeStage6dDraft>;
    polished: boolean;
  }>,
  protectedBefore: Map<string, { status: string; fingerprint: string }>
) {
  const sb = supabase();
  const keys = await readEnvKeys();
  const model = keys.OPENAI_MODEL_STANDARD ?? 'gpt-5.5';

  const { data: posts } = await sb
    .from('content_posts')
    .select(
      'id, topic_id, slug, status, title, word_count, body_markdown, updated_at'
    )
    .in('slug', [
      ...TARGET_SLUGS,
      ...AI_RESOURCE_LIVE_PUBLISHED_SLUGS,
      ...AI_RESOURCE_STAGE6C_REVIEW_SLUGS
    ]);

  const { data: topics } = await sb
    .from('content_topics')
    .select('id, topic, status, last_error')
    .order('updated_at', { ascending: false })
    .limit(100);

  let md = `# AI Resources Stage 6D — next five generation + polish\n\n`;
  md += `**Date:** 2026-05-22  \n`;
  md += `**Source:** \`${PACK_ID}\`  \n`;
  md += `**Model:** \`${model}\`  \n`;
  md += `**AUTO_PUBLISH:** 0  \n`;
  md += `**Publish:** none  \n`;
  md += `**Commit/push:** not performed\n\n`;

  md += `## Generated slugs\n\n`;
  md += `| Slug | topic_id | post_id | status | word_count | polish |\n`;
  md += `|------|----------|---------|--------|------------|--------|\n`;
  for (const slug of TARGET_SLUGS) {
    const post = posts?.find((p) => p.slug === slug);
    const topic = topics?.find(
      (t) => parseAiPackTopicString(t.topic)?.slug === slug
    );
    const pr = polishResults.find((r) => r.slug === slug);
    md += `| ${slug} | ${topic?.id ?? '—'} | ${post?.id ?? '—'} | ${post?.status ?? '—'} | ${post?.word_count ?? '—'} | ${pr?.polished ? 'yes' : 'no'} |\n`;
  }

  md += `\n## QA table (after polish)\n\n`;
  md += `| Slug | no KP1 | no KP2 | no KP3 | no bare paths | FAQ ok | S/L | links≥2 | review_needed | disclaimer |\n`;
  md += `|------|--------|--------|--------|---------------|--------|-----|---------|-----------------|------------|\n`;
  for (const r of polishResults) {
    const post = posts?.find((p) => p.slug === r.slug);
    const q = r.qa;
    md += `| ${r.slug} | ${q.noKeyPoint1} | ${q.noKeyPoint2} | ${q.noKeyPoint3} | ${q.noBarePaths} | ${q.faqNotThin} | ${q.hasStrengthsLimitations} | ${q.internalLinksPresent} (${q.internalLinkCount}) | ${post?.status === 'review_needed'} | ${q.hasDisclaimer} |\n`;
  }

  md += `\n## Protected content unchanged\n\n`;
  md += `### Six live Stage 6B (published)\n\n`;
  for (const slug of AI_RESOURCE_LIVE_PUBLISHED_SLUGS) {
    const post = posts?.find((p) => p.slug === slug);
    const before = protectedBefore.get(slug);
    const fp = post ? bodyFingerprint(post.body_markdown ?? '') : '';
    md += `- \`${slug}\`: status=\`${post?.status}\`, body unchanged=${before?.fingerprint === fp && post?.status === 'published'}\n`;
  }
  md += `\n### Five Stage 6C.1 drafts (review_needed)\n\n`;
  for (const slug of AI_RESOURCE_STAGE6C_REVIEW_SLUGS) {
    const post = posts?.find((p) => p.slug === slug);
    const before = protectedBefore.get(slug);
    const fp = post ? bodyFingerprint(post.body_markdown ?? '') : '';
    md += `- \`${slug}\`: status=\`${post?.status}\`, body unchanged=${before?.fingerprint === fp}\n`;
  }

  md += `\n## Deliverables\n\n`;
  md += `- Report: \`${REPORT_PATH}\`\n`;
  md += `- Previews: \`${PREVIEW_DIR}/*.md\`\n`;
  md += `- Polished data: \`data/content/polished/*-stage6d-2026-05-22.md\`\n`;
  md += `- Topic pack: \`${PACK_PATH}\`\n`;
  md += `- Script: \`scripts/ai-resources-stage6d-next-five-generation.ts\`\n`;
  md += `- Polish: \`lib/content-hub/polishAiResourceStage6dDrafts.ts\`\n\n`;

  md += `## Guardrails\n\n`;
  md += `- Generated exactly **5** new articles (not bulk pack)\n`;
  md += `- No publish; no ES/FR; no IQ/UI/build/sitemap/auth/billing/schema changes\n`;
  md += `- \`CONTENT_HUB_ALLOW_PRODUCTION_WRITES\` disabled after run\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, md, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));

  const incomplete = TARGET_SLUGS.filter(
    (s) => !posts?.find((p) => p.slug === s && p.status === 'review_needed')
  );
  if (incomplete.length) process.exitCode = 1;
}

async function main() {
  const preflightOnly = process.argv.includes('--preflight');
  const polishOnly = process.argv.includes('--polish-only');
  const run = process.argv.includes('--run') || polishOnly;

  await patchEnvStage6d();

  if (!run && !preflightOnly) {
    console.log('Pass --preflight, --run, or --polish-only');
    return;
  }

  await setAllowProductionWrites(true);
  await assertEnvConfig();
  const { missing } = await preflightDb();

  if (preflightOnly && !run) return;

  if (!run) return;

  const protectedBefore = await snapshotProtectedPosts();

  if (polishOnly) {
    const polishResults = await polishStage6dDrafts();
    await setAllowProductionWrites(false);
    await buildReport(polishResults, protectedBefore);
    return;
  }

  await runCmd('npm', ['run', 'build', '--prefix', 'services/content-hub']);

  for (const slug of TARGET_SLUGS) {
    if (await postReady(slug)) {
      console.log(JSON.stringify({ phase: 'skip_gen', slug, reason: 'exists' }, null, 2));
      continue;
    }
    if (missing.includes(slug)) await seedSlug(slug);
    await preflightDb();
    try {
      await runCmd('npm', ['run', 'content:run-once', '--prefix', 'services/content-hub']);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isBudgetOrQuotaError(msg)) {
        console.error(JSON.stringify({ phase: 'stop', reason: 'budget_or_quota' }, null, 2));
      }
      throw err;
    }
    if (!(await postReady(slug))) {
      throw new Error(`Expected review_needed post after worker: ${slug}`);
    }
    const { data: post } = await supabase()
      .from('content_posts')
      .select('id, slug, status, word_count')
      .eq('slug', slug)
      .maybeSingle();
    console.log(JSON.stringify({ phase: 'generated', ...post }, null, 2));
  }

  const polishResults = await polishStage6dDrafts();
  await setAllowProductionWrites(false);
  await buildReport(polishResults, protectedBefore);
}

main().catch(async (err) => {
  try {
    await setAllowProductionWrites(false);
  } catch {
    /* ignore */
  }
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
