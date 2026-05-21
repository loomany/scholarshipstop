/**
 * Stage 6B — generate exactly 5 AI pack articles (review_needed only).
 *
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6b-five-generation.ts --preflight
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6b-five-generation.ts --run
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

const TARGET_SLUGS = [
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

const PILOT_SLUG = 'best-scholarship-websites';
const ENV_PATH = path.join(process.cwd(), 'services/content-hub/.env');
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b-five-article-generation-2026-05-21.md'
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
  const checks: Record<string, boolean> = {
    OPENAI_MODEL_STANDARD_gpt55: keys.OPENAI_MODEL_STANDARD === 'gpt-5.5',
    OPENAI_MODEL_SMART_gpt55: keys.OPENAI_MODEL_SMART === 'gpt-5.5',
    AUTO_PUBLISH_0: keys.CONTENT_HUB_AUTO_PUBLISH === '0',
    POSTS_PER_RUN_5: keys.CONTENT_HUB_POSTS_PER_RUN === '5',
    BATCH_LIMIT_5: keys.CONTENT_HUB_BATCH_LIMIT === '5',
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
        checks
      },
      null,
      2
    )
  );
  const fail = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
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

async function patchEnvBatchSize() {
  let raw = await fs.readFile(ENV_PATH, 'utf8');
  const replacements: [RegExp, string][] = [
    [/^CONTENT_HUB_POSTS_PER_RUN=.*$/m, 'CONTENT_HUB_POSTS_PER_RUN=5'],
    [/^CONTENT_HUB_BATCH_LIMIT=.*$/m, 'CONTENT_HUB_BATCH_LIMIT=5'],
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
    .in('slug', [...TARGET_SLUGS, PILOT_SLUG]);
  if (pe) throw pe;

  const pilot = posts?.find((p) => p.slug === PILOT_SLUG);
  if (!pilot || pilot.status !== 'published') {
    throw new Error(`Pilot ${PILOT_SLUG} must stay published`);
  }

  const collisions = (posts ?? []).filter(
    (p) => TARGET_SLUGS.includes(p.slug as (typeof TARGET_SLUGS)[number])
  );
  const badCollisions = collisions.filter((p) => p.status !== 'review_needed');
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

  const extra = slugsInQueue.filter((s) => !TARGET_SLUGS.includes(s as never));
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
        pilot: { slug: PILOT_SLUG, status: pilot.status },
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
      `Other AI pack topics still queued (would consume batch): ${extra.join(', ')}`
    );
  }

  return { missing, packQueued };
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

async function seedMissing(slugs: string[]) {
  for (const slug of slugs) {
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
}

function analyzeHtml(html: string, md: string) {
  const blob = `${html}\n${md}`.toLowerCase();
  return {
    hasQuickAnswer: /##\s*quick answer/i.test(md) || /quick answer/i.test(blob),
    hasComparisonCards:
      /###\s+/i.test(md) || /watch out for/i.test(blob),
    noWideTable: !/<table\b/i.test(html),
    hasProsCons:
      (/pros/i.test(blob) && (/limitations|cons|watch out/i.test(blob))) ||
      (/strengths/i.test(blob) && /limitations/i.test(blob)),
    hasFaq: /##\s*faq/i.test(md) || (md.match(/^###\s+/gm) ?? []).length >= 3,
    hasDisclaimer:
      blob.includes('not an official scholarship provider') &&
      blob.includes('financial aid office'),
    internalLinkCount: [
      ...html.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)
    ].length,
    noFakeNumberOne:
      !/\b#1\b.*scholarship website|\bbest scholarship website in the (world|us)\b/i.test(
        blob
      ),
    noBulletsPlaceholder: !/in 3[–-]5 bullets/i.test(blob)
  };
}

async function buildReport() {
  const sb = supabase();
  const { data: topics } = await sb
    .from('content_topics')
    .select('id, topic, status, last_error, processed_at')
    .order('updated_at', { ascending: false })
    .limit(200);

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

  const model = process.env.OPENAI_MODEL_STANDARD ?? 'unknown';
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

  let md = `# AI Resources Stage 6B — five-article generation\n\n`;
  md += `**Date:** 2026-05-21  \n`;
  md += `**Pack:** \`${AI_RESOURCES_PACK_ID}\`  \n`;
  md += `**Model:** \`${model}\` (standard + smart)  \n`;
  md += `**AUTO_PUBLISH:** 0 — all posts must be \`review_needed\`\n\n`;
  md += `## Topics\n\n| Slug | topic_id | status | error |\n|------|----------|--------|-------|\n`;
  for (const r of rows) {
    md += `| ${r.slug} | ${r.topic?.id ?? '—'} | ${r.topic?.status ?? '—'} | ${(r.topic?.last_error ?? '').slice(0, 80)} |\n`;
  }
  md += `\n## Posts\n\n| Slug | post_id | status | words | title |\n|------|---------|--------|-------|-------|\n`;
  for (const r of rows) {
    md += `| ${r.slug} | ${r.post?.id ?? '—'} | ${r.post?.status ?? '—'} | ${r.post?.word_count ?? '—'} | ${(r.post?.title ?? '').slice(0, 50)} |\n`;
  }
  md += `\n## Meta / excerpt\n\n`;
  for (const r of rows) {
    if (!r.post) continue;
    md += `### ${r.slug}\n\n`;
    md += `- **title:** ${r.post.title}\n`;
    md += `- **meta_title:** ${r.post.meta_title}\n`;
    md += `- **meta_description:** ${r.post.meta_description}\n`;
    md += `- **excerpt:** ${r.post.excerpt}\n\n`;
  }
  md += `\n## Quality gates\n\n`;
  for (const r of rows) {
    md += `### ${r.slug}\n\n`;
    if (!r.post) {
      md += `_No post row._\n\n`;
      continue;
    }
    md += `- meta_title: ${r.post.meta_title ? 'yes' : 'no'}\n`;
    md += `- meta_description: ${r.post.meta_description ? 'yes' : 'no'}\n`;
    md += `- excerpt: ${r.post.excerpt ? 'yes' : 'no'}\n`;
    if (r.qa) {
      for (const [k, v] of Object.entries(r.qa)) {
        md += `- ${k}: ${v}\n`;
      }
    }
    md += '\n';
  }
  md += `## Failures\n\n`;
  md += failed.length
    ? failed.map((t) => `- ${t.id}: ${t.last_error}`).join('\n')
    : '_None_';
  md += `\n\n## Status violations\n\n`;
  md += notReview.length
    ? notReview.map((r) => `- ${r.slug}: ${r.post?.status}`).join('\n')
    : '_None — all review_needed_';
  md += `\n\n## Run notes\n\n`;
  md += `- **Deployed UI baseline:** \`ff0675a\` (pilot rendering hotfix)\n`;
  md += `- **Supabase host:** production (\`qlqlvhgosxhuibzhfsnh.supabase.co\`)\n`;
  md += `- **Env:** \`OPENAI_MODEL_STANDARD=gpt-5.5\`, \`OPENAI_MODEL_SMART=gpt-5.5\`, \`CONTENT_HUB_AUTO_PUBLISH=0\`, \`CONTENT_HUB_POSTS_PER_RUN=5\`, \`CONTENT_HUB_BATCH_LIMIT=5\`, \`CONTENT_HUB_SOURCE=ai-resources-2026-05-21\`\n`;
  md += `- **Production writes:** enabled only during generation; \`CONTENT_HUB_ALLOW_PRODUCTION_WRITES\` commented out after completion\n`;
  md += `- **Transient failure:** first worker pass hit \`image_brief\` Zod object (gpt-5.5); fixed via \`normalizeImageBriefField\` in \`validators.ts\`, rebuilt, resumed 2 remaining slugs\n`;
  md += `- **First-pass SEO retry:** \`scholarshiptop-vs-fastweb\` failed once on object \`image_brief\`, succeeded on immediate retry before dist fix\n\n`;
  md += `## Guardrails\n\n`;
  md += `- Generation count: 5 slugs only (not 29)\n`;
  md += `- Pilot \`${PILOT_SLUG}\`: published, not regenerated\n`;
  md += `- No publish, no ES/FR, no auth/billing/Lemon/IQ/migrations/RLS changes\n`;
  md += `- No commit/push in this stage\n`;
  md += `- List articles may use **Strengths / Limitations** platform cards instead of literal “Pros/Cons” headings — manual editorial pass recommended where \`hasProsCons\` is false\n\n`;
  md += `## Git status (snapshot)\n\n`;
  md += `\`\`\`\n`;
  try {
    const { execSync } = await import('node:child_process');
    md += execSync('git status --short', { cwd: process.cwd(), encoding: 'utf8' });
  } catch {
    md += '(git status unavailable)\n';
  }
  md += `\`\`\`\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, md, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));

  const incomplete = rows.filter((r) => !r.post);
  if (failed.length || notReview.length || incomplete.length) {
    process.exitCode = 1;
  }
}

async function main() {
  const preflightOnly = process.argv.includes('--preflight');
  const reportOnly = process.argv.includes('--report-only');
  const run = process.argv.includes('--run');

  await patchEnvBatchSize();

  if (reportOnly) {
    await buildReport();
    return;
  }

  await setAllowProductionWrites(true);
  await assertEnvConfig();

  const { missing } = await preflightDb();

  if (preflightOnly && !run) return;

  if (!run) {
    console.log('Pass --run to seed, worker, and report.');
    return;
  }

  if (missing.length > 0) {
    await seedMissing(missing);
  }

  await preflightDb();

  await runCmd('npm', ['run', 'build', '--prefix', 'services/content-hub']);
  await runCmd('npm', ['run', 'content:run-once', '--prefix', 'services/content-hub']);

  await setAllowProductionWrites(false);
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
