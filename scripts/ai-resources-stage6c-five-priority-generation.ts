/**
 * Stage 6C — generate exactly 5 priority AI/GEO articles (review_needed only).
 *
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6c-five-priority-generation.ts --preflight
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6c-five-priority-generation.ts --run
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import {
  AI_RESOURCES_PACK_ID,
  parseAiPackTopicString
} from '@/lib/content-hub/aiResourcesPackShared';

/** Ordered for ChatGPT / GEO priority (max 5; do not expand to full pack). */
const TARGET_SLUGS = [
  'can-chatgpt-help-find-scholarships',
  'how-to-use-chatgpt-to-search-for-scholarships',
  'best-ai-tools-for-finding-scholarships',
  'ai-scholarship-search-vs-traditional-databases',
  'best-sites-to-find-fully-funded-scholarships'
] as const;

const LIVE_PUBLISHED_SLUGS = [
  'best-scholarship-websites',
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

const ENV_PATH = path.join(process.cwd(), 'services/content-hub/.env');
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6c-five-priority-article-generation-2026-05-21.md'
);
const PREVIEW_DIR = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6c-previews-2026-05-21'
);

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function maskHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '(invalid-url)';
  }
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

async function assertEnvConfig() {
  const keys = await readEnvKeys();
  const present: Record<string, boolean> = {
    OPENAI_API_KEY: Boolean(keys.OPENAI_API_KEY),
    OPENAI_MODEL_STANDARD_gpt55: keys.OPENAI_MODEL_STANDARD === 'gpt-5.5',
    OPENAI_MODEL_SMART_gpt55: keys.OPENAI_MODEL_SMART === 'gpt-5.5',
    AUTO_PUBLISH_0: keys.CONTENT_HUB_AUTO_PUBLISH === '0',
    POSTS_PER_RUN_1: keys.CONTENT_HUB_POSTS_PER_RUN === '1',
    BATCH_LIMIT_1: keys.CONTENT_HUB_BATCH_LIMIT === '1',
    SOURCE_pack: keys.CONTENT_HUB_SOURCE === AI_RESOURCES_PACK_ID,
    ALLOW_WRITES_1: keys.CONTENT_HUB_ALLOW_PRODUCTION_WRITES === '1'
  };
  console.log(
    JSON.stringify(
      {
        phase: 'env_check',
        supabaseHost: maskHost(
          keys.SUPABASE_URL || process.env.SUPABASE_URL || ''
        ),
        present
      },
      null,
      2
    )
  );
  const fail = Object.entries(present).filter(([, ok]) => !ok).map(([k]) => k);
  if (fail.length) {
    throw new Error(`Env check failed: ${fail.join(', ')}`);
  }
}

async function setAllowProductionWrites(enabled: boolean) {
  let raw = await fs.readFile(ENV_PATH, 'utf8');
  const line = 'CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1';
  if (enabled) {
    if (/^#\s*CONTENT_HUB_ALLOW_PRODUCTION_WRITES/m.test(raw)) {
      raw = raw.replace(
        /^#\s*CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1.*$/m,
        line
      );
    } else if (!raw.includes(line)) {
      raw += `\n${line}\n`;
    }
  } else {
    raw = raw.replace(
      new RegExp(`^${line}\\s*$`, 'm'),
      '# CONTENT_HUB_ALLOW_PRODUCTION_WRITES=1'
    );
  }
  await fs.writeFile(ENV_PATH, raw, 'utf8');
  console.log(
    JSON.stringify({ phase: 'env_toggle', allowProductionWrites: enabled }, null, 2)
  );
}

async function patchEnvSequential() {
  let raw = await fs.readFile(ENV_PATH, 'utf8');
  const replacements: [RegExp, string][] = [
    [/^CONTENT_HUB_POSTS_PER_RUN=.*$/m, 'CONTENT_HUB_POSTS_PER_RUN=1'],
    [/^CONTENT_HUB_BATCH_LIMIT=.*$/m, 'CONTENT_HUB_BATCH_LIMIT=1'],
    [/^CONTENT_HUB_AUTO_PUBLISH=.*$/m, 'CONTENT_HUB_AUTO_PUBLISH=0'],
    [/^OPENAI_MODEL_STANDARD=.*$/m, 'OPENAI_MODEL_STANDARD=gpt-5.5'],
    [/^OPENAI_MODEL_SMART=.*$/m, 'OPENAI_MODEL_SMART=gpt-5.5'],
    [/^CONTENT_HUB_SOURCE=.*$/m, `CONTENT_HUB_SOURCE=${AI_RESOURCES_PACK_ID}`]
  ];
  for (const [re, rep] of replacements) {
    if (re.test(raw)) raw = raw.replace(re, rep);
    else raw += `\n${rep}\n`;
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

async function preflightDb() {
  const sb = supabase();
  const { data: posts, error: pe } = await sb
    .from('content_posts')
    .select('id, slug, status')
    .in('slug', [...TARGET_SLUGS, ...LIVE_PUBLISHED_SLUGS]);
  if (pe) throw pe;

  for (const slug of LIVE_PUBLISHED_SLUGS) {
    const row = posts?.find((p) => p.slug === slug);
    if (!row || row.status !== 'published') {
      throw new Error(`Live article must stay published: ${slug}`);
    }
  }

  const collisions = (posts ?? []).filter((p) =>
    TARGET_SLUGS.includes(p.slug as (typeof TARGET_SLUGS)[number])
  );
  const badCollisions = collisions.filter(
    (p) => p.status !== 'review_needed' && p.status !== undefined
  );
  if (badCollisions.length > 0) {
    throw new Error(
      `Slug collision — unexpected posts: ${badCollisions.map((c) => `${c.slug}(${c.status})`).join(', ')}`
    );
  }

  const { data: topics, error: te } = await sb
    .from('content_topics')
    .select('id, topic, status')
    .in('status', ['queued', 'processing']);
  if (te) throw te;

  const packQueued = (topics ?? []).filter((t) => {
    const p = parseAiPackTopicString(t.topic);
    return p?.packId === AI_RESOURCES_PACK_ID;
  });

  const slugsInQueue = packQueued
    .map((t) => parseAiPackTopicString(t.topic)?.slug)
    .filter(Boolean) as string[];

  const extra = slugsInQueue.filter(
    (s) => !TARGET_SLUGS.includes(s as (typeof TARGET_SLUGS)[number])
  );
  const existingReview = new Set(
    (posts ?? [])
      .filter(
        (p) =>
          TARGET_SLUGS.includes(p.slug as (typeof TARGET_SLUGS)[number]) &&
          p.status === 'review_needed'
      )
      .map((p) => p.slug)
  );
  const missing = TARGET_SLUGS.filter(
    (s) => !slugsInQueue.includes(s) && !existingReview.has(s)
  );

  console.log(
    JSON.stringify(
      {
        phase: 'preflight_db',
        livePublished: LIVE_PUBLISHED_SLUGS.length,
        targetSlugs: TARGET_SLUGS,
        packQueuedCount: packQueued.length,
        slugsInQueue,
        missingFromQueue: missing,
        existingReviewNeeded: [...existingReview],
        extraQueuedSlugs: extra
      },
      null,
      2
    )
  );

  if (extra.length > 0) {
    throw new Error(
      `Other AI pack topics still queued (would steal batch): ${extra.join(', ')}`
    );
  }

  return { missing, existingReview };
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

async function seedSlug(slug: string) {
  await runCmd('npx', [
    'dotenv-cli',
    '-e',
    'services/content-hub/.env',
    '--',
    'npx',
    'tsx',
    'scripts/seed-ai-resources-topics.ts',
    '--write',
    '--slug',
    slug
  ]);
}

async function postReady(slug: string): Promise<boolean> {
  const sb = supabase();
  const { data } = await sb
    .from('content_posts')
    .select('id, status')
    .eq('slug', slug)
    .maybeSingle();
  return data?.status === 'review_needed';
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

function analyzeHtml(html: string, md: string) {
  const blob = `${html}\n${md}`.toLowerCase();
  const internalHrefs = [
    ...new Set(
      [...html.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)].map(
        (m) => m[1]
      )
    )
  ];
  const checks = {
    hasQuickAnswer: /##\s*quick answer/i.test(md) || /quick answer/i.test(blob),
    noWideTable: !/<table\b/i.test(html),
    hasStrengthsLimitations:
      (/strengths/i.test(blob) && /limitations/i.test(blob)) ||
      (/pros/i.test(blob) && /(limitations|cons|watch out)/i.test(blob)),
    hasFaq:
      (md.match(/^###\s+/gm) ?? []).length >= 4 ||
      /##\s*faq/i.test(md),
    hasDisclaimer:
      blob.includes('not an official scholarship provider') &&
      blob.includes('financial aid office'),
    internalLinkCount: internalHrefs.length,
    noTypeQ: !/\?\?\?/i.test(blob),
    noKeyPoint: !/key point\s*\d/i.test(blob),
    no35Bullets: !/in 3[–-]5 bullets/i.test(blob),
    noRawPaths: !/(?<![(\[])\/(?:scholarships|resources)\/[a-z0-9-]+(?![)\]])/i.test(
      md.replace(/\[([^\]]+)\]\(\/[^)]+\)/g, '')
    ),
    noFakeNumberOne: !/\b#1\b.*scholarship|\bbest scholarship website in the (world|us)\b/i.test(
      blob
    )
  };
  const fails = Object.entries(checks).filter(([, v]) => v === false);
  let verdict: 'publish-ready' | 'needs edits' | 'reject' = 'publish-ready';
  if (!checks.hasDisclaimer || checks.noWideTable === false) verdict = 'reject';
  else if (fails.length > 0) verdict = 'needs edits';
  return { checks, fails, verdict, internalHrefs };
}

async function exportPreviews() {
  const sb = supabase();
  const { data: posts } = await sb
    .from('content_posts')
    .select('slug, title, body_markdown, meta_title, meta_description, excerpt')
    .in('slug', [...TARGET_SLUGS]);
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  for (const slug of TARGET_SLUGS) {
    const post = posts?.find((p) => p.slug === slug);
    if (!post?.body_markdown) continue;
    const out = path.join(PREVIEW_DIR, `${slug}.md`);
    const header = `# ${post.title}\n\n**meta_title:** ${post.meta_title}\n\n**meta_description:** ${post.meta_description}\n\n**excerpt:** ${post.excerpt}\n\n---\n\n`;
    await fs.writeFile(out, header + post.body_markdown, 'utf8');
  }
  console.log(JSON.stringify({ phase: 'previews', dir: PREVIEW_DIR }, null, 2));
}

async function buildReport() {
  const sb = supabase();
  const keys = await readEnvKeys();
  const model = keys.OPENAI_MODEL_STANDARD ?? 'unknown';

  const { data: topics } = await sb
    .from('content_topics')
    .select('id, topic, status, last_error, processed_at')
    .order('updated_at', { ascending: false })
    .limit(300);

  const packTopics = (topics ?? []).filter((t) => {
    const p = parseAiPackTopicString(t.topic);
    return p && TARGET_SLUGS.includes(p.slug as (typeof TARGET_SLUGS)[number]);
  });

  const { data: posts } = await sb
    .from('content_posts')
    .select(
      'id, topic_id, slug, status, title, meta_title, meta_description, excerpt, word_count, body_html, body_markdown'
    )
    .in('slug', [...TARGET_SLUGS]);

  const rows = TARGET_SLUGS.map((slug) => {
    const post = posts?.find((p) => p.slug === slug);
    const topic = packTopics.find(
      (t) => parseAiPackTopicString(t.topic)?.slug === slug
    );
    const qa = post
      ? analyzeHtml(post.body_html ?? '', post.body_markdown ?? '')
      : null;
    return { slug, topic, post, qa, model };
  });

  const failed = packTopics.filter((t) => t.status === 'failed');
  const notReview = rows.filter((r) => r.post && r.post.status !== 'review_needed');
  const incomplete = rows.filter((r) => !r.post);

  let md = `# AI Resources Stage 6C — five priority article generation\n\n`;
  md += `**Date:** 2026-05-21  \n`;
  md += `**Pack:** \`${AI_RESOURCES_PACK_ID}\`  \n`;
  md += `**Model:** \`${model}\`  \n`;
  md += `**Generation:** exactly 5 slugs (sequential, \`POSTS_PER_RUN=1\`, \`BATCH_LIMIT=1\`)  \n`;
  md += `**AUTO_PUBLISH:** 0 — all posts \`review_needed\`\n\n`;

  md += `## Topics\n\n| Slug | topic_id | status | error (truncated) |\n|------|----------|--------|-------------------|\n`;
  for (const r of rows) {
    md += `| ${r.slug} | ${r.topic?.id ?? '—'} | ${r.topic?.status ?? '—'} | ${(r.topic?.last_error ?? '').slice(0, 100)} |\n`;
  }

  md += `\n## Posts\n\n| Slug | post_id | status | word_count | internal links |\n|------|---------|--------|------------|------------------|\n`;
  for (const r of rows) {
    md += `| ${r.slug} | ${r.post?.id ?? '—'} | ${r.post?.status ?? '—'} | ${r.post?.word_count ?? '—'} | ${r.qa?.checks.internalLinkCount ?? '—'} |\n`;
  }

  md += `\n## QA verdict per article\n\n`;
  for (const r of rows) {
    md += `### ${r.slug}\n\n`;
    if (!r.post) {
      md += `- **verdict:** reject (no post)\n\n`;
      continue;
    }
    md += `- **verdict:** ${r.qa?.verdict ?? '—'}\n`;
    if (r.qa) {
      for (const [k, v] of Object.entries(r.qa.checks)) {
        md += `- ${k}: ${v}\n`;
      }
      if (r.qa.fails.length) {
        md += `- **failed checks:** ${r.qa.fails.map(([k]) => k).join(', ')}\n`;
      }
    }
    md += '\n';
  }

  md += `## Failures / budget\n\n`;
  md += failed.length
    ? failed
        .map((t) => `- ${t.id}: ${t.last_error}`)
        .join('\n')
    : '_None_';

  md += `\n\n## Status violations\n\n`;
  md += notReview.length
    ? notReview.map((r) => `- ${r.slug}: ${r.post?.status}`).join('\n')
    : '_None — all review_needed_';

  md += `\n\n## Guardrails\n\n`;
  md += `- Generated **5** priority slugs only (not remaining ~24 pack topics)\n`;
  md += `- **No publish** — all \`review_needed\`\n`;
  md += `- **No ES/FR** translations\n`;
  md += `- **6 live published** AI articles unchanged: ${LIVE_PUBLISHED_SLUGS.join(', ')}\n`;
  md += `- \`CONTENT_HUB_ALLOW_PRODUCTION_WRITES\` disabled after run\n`;
  md += `- Previews: \`${PREVIEW_DIR}\`\n`;
  md += `- Hub UI deploy prerequisite: commit \`1737b7b\` (\`fix(resources): polish AI resources hub and live articles\`)\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, md, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));

  if (failed.length || notReview.length || incomplete.length) {
    process.exitCode = 1;
  }
}

async function main() {
  const preflightOnly = process.argv.includes('--preflight');
  const reportOnly = process.argv.includes('--report-only');
  const run = process.argv.includes('--run');

  await patchEnvSequential();

  if (reportOnly) {
    await buildReport();
    await exportPreviews();
    return;
  }

  await setAllowProductionWrites(true);
  await assertEnvConfig();
  const { missing, existingReview } = await preflightDb();

  if (preflightOnly && !run) return;

  if (!run) {
    console.log('Pass --run for sequential seed + worker (5 slugs max).');
    return;
  }

  await runCmd('npm', ['run', 'build', '--prefix', 'services/content-hub']);

  for (const slug of TARGET_SLUGS) {
    if (existingReview.has(slug) || (await postReady(slug))) {
      console.log(JSON.stringify({ phase: 'skip', slug, reason: 'review_needed exists' }, null, 2));
      continue;
    }

    await seedSlug(slug);
    await preflightDb();

    try {
      await runCmd('npm', ['run', 'content:run-once', '--prefix', 'services/content-hub']);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isBudgetOrQuotaError(msg)) {
        console.error(JSON.stringify({ phase: 'stop', reason: 'budget_or_quota', slug }, null, 2));
      }
      throw err;
    }

    const { data: topic } = await supabase()
      .from('content_topics')
      .select('status, last_error')
      .like('topic', `%${slug}%`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (topic?.status === 'failed' && isBudgetOrQuotaError(topic.last_error ?? '')) {
      throw new Error(`Stopped on budget/quota after ${slug}: ${topic.last_error}`);
    }

    if (!(await postReady(slug))) {
      throw new Error(`Expected review_needed post for ${slug} after worker run`);
    }

    console.log(JSON.stringify({ phase: 'done_slug', slug }, null, 2));
  }

  await setAllowProductionWrites(false);
  await exportPreviews();
  await buildReport();
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
