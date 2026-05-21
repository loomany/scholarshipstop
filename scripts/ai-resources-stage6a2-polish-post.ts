/**
 * Polish one content_posts row (Stage 6A.2). Dry-run by default.
 *
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6a2-polish-post.ts
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6a2-polish-post.ts --write
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { markdownToHtml } from '../services/content-hub/src/lib/html.ts';
import {
  countCharsNoSpaces,
  countWords
} from '../services/content-hub/src/lib/markdown.ts';

const POST_ID = '07caa51c-695b-4605-9a3d-24f2688551c0';
const SLUG = 'best-scholarship-websites';
const POLISHED_MD_PATH = path.join(
  process.cwd(),
  'data/content/polished/best-scholarship-websites-2026-05-21.md'
);
const PREVIEW_OUT = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6a2-best-scholarship-websites-polished-preview-2026-05-21.md'
);
const QA_OUT = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6a2-best-scholarship-websites-polished-qa-2026-05-21.md'
);

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function countInternalHref(html: string): number {
  const re = /href=["'](\/(?:scholarships|resources)[^"']*)["']/gi;
  return [...html.matchAll(re)].length;
}

function hasDuplicateRelTarget(html: string): boolean {
  return /rel="[^"]*"\s+[^>]*rel="/i.test(html) || /target="_blank"[^>]*target="_blank"/i.test(html);
}

function cleanupExternalAnchors(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (_full, attrs: string) => {
    let a = attrs;
    const hrefMatch = a.match(/\bhref=["']([^"']+)["']/i);
    const href = hrefMatch?.[1] ?? '';
    const isExternal = /^https?:\/\//i.test(href);
    if (!isExternal) {
      a = a.replace(/\s*target=["'][^"']*["']/gi, '');
      a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
      return `<a${a}>`;
    }
    a = a.replace(/\s*target=["'][^"']*["']/gi, '');
    a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
    return `<a${a} target="_blank" rel="noopener noreferrer nofollow">`;
  });
}

function analyze(html: string, md: string) {
  const blob = `${html}\n${md}`.toLowerCase();
  return {
    internalHrefCount: countInternalHref(html),
    hasComparisonTable: /<table\b/i.test(html) && /fastweb/i.test(blob),
    hasComparisonCards:
      /### ScholarshipTop/i.test(md) &&
      /### Fastweb/i.test(md) &&
      /### Scholarships\.com/i.test(md) &&
      !/<table\b/i.test(html),
    hasProsCons:
      /scholarshiptop pros/i.test(blob) && /scholarshiptop limitations/i.test(blob),
    hasQuickAnswerBullets: /in 3–5 bullets|in 3-5 bullets/i.test(blob),
    hasDisclaimer:
      blob.includes('not an official scholarship provider') &&
      blob.includes('financial aid office'),
    hasDuplicateRel: hasDuplicateRelTarget(html),
    faqCount: (() => {
      const idx = md.search(/## FAQ:/i);
      if (idx < 0) return 0;
      const section = md.slice(idx);
      return (section.match(/^### /gm) ?? []).length;
    })(),
    claimsNumberOne: /\b#1\b.*scholarship website|\bbest scholarship website in the (world|us)\b/i.test(
      blob
    )
  };
}

async function main() {
  const write = process.argv.includes('--write');
  const polishedMd = await fs.readFile(POLISHED_MD_PATH, 'utf8');
  let bodyHtml = await markdownToHtml(polishedMd);
  bodyHtml = cleanupExternalAnchors(bodyHtml);

  const wordCount = countWords(polishedMd);
  const charCount = countCharsNoSpaces(polishedMd);
  const qa = analyze(bodyHtml, polishedMd);

  const supabase = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: before, error: fetchErr } = await supabase
    .from('content_posts')
    .select('id, slug, status, title, word_count, body_markdown, body_html')
    .eq('id', POST_ID)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!before || before.slug !== SLUG) throw new Error('Post not found or slug mismatch');

  const beforeInternal = countInternalHref(before.body_html ?? '');
  const beforeWords = before.word_count ?? 0;

  const diff = {
    word_count: { before: beforeWords, after: wordCount, delta: wordCount - beforeWords },
    internal_links: { before: beforeInternal, after: qa.internalHrefCount },
    sections: [
      'Quick Answer → bullet list + internal links',
      'Comparison cards → named platforms (ScholarshipTop, Fastweb, Scholarships.com, BigFuture, official pages)',
      'New block → ScholarshipTop pros / limitations / when to use official pages',
      'Disclaimer → strengthened',
      'FAQ → internal links added',
      'HTML → external rel/target deduped; internal links without target=_blank'
    ]
  };

  console.log(
    JSON.stringify(
      {
        dryRun: !write,
        postId: POST_ID,
        slug: SLUG,
        status: 'review_needed (unchanged)',
        diff,
        qa
      },
      null,
      2
    )
  );

  const previewDoc = `---
content_post_id: ${POST_ID}
slug: ${SLUG}
polished: ${new Date().toISOString()}
db_write: ${write}
---

# Polished preview: ${before.title}

## Change summary

${diff.sections.map((s) => `- ${s}`).join('\n')}

| Metric | Before | After |
|--------|--------|-------|
| word_count | ${beforeWords} | ${wordCount} |
| internal href count | ${beforeInternal} | ${qa.internalHrefCount} |
| duplicate rel/target | ${hasDuplicateRelTarget(before.body_html ?? '') ? 'yes' : 'no'} | ${qa.hasDuplicateRel ? 'yes' : 'no'} |

---

## body_markdown (polished)

${polishedMd}

---

## body_html (polished)

${bodyHtml}
`;

  const verdict =
    qa.internalHrefCount >= 8 &&
    qa.hasComparisonCards &&
    qa.hasProsCons &&
    qa.hasDisclaimer &&
    !qa.hasDuplicateRel &&
    !qa.claimsNumberOne
      ? 'publish-ready'
      : 'needs edits';

  const qaDoc = `# QA: polished best-scholarship-websites (Stage 6A.2)

**content_post id:** \`${POST_ID}\`  
**slug:** \`${SLUG}\`  
**status:** \`review_needed\` (unchanged)  
**verdict:** **${verdict}**  
**DB write:** ${write ? 'yes' : 'dry-run only'}

## Checklist

| Criterion | Pass |
|-----------|------|
| Internal hrefs (≥8) | ${qa.internalHrefCount >= 8 ? `Yes (${qa.internalHrefCount})` : `No (${qa.internalHrefCount})`} |
| Comparison cards (no table) | ${qa.hasComparisonCards ? 'Yes' : 'No'} |
| Pros / cons blocks | ${qa.hasProsCons ? 'Yes' : 'No'} |
| Quick answer bullets | ${qa.hasQuickAnswerBullets ? 'Yes' : 'No'} |
| Disclaimer | ${qa.hasDisclaimer ? 'Yes' : 'No'} |
| FAQ count | ${qa.faqCount} |
| No duplicate rel/target | ${qa.hasDuplicateRel ? 'No' : 'Yes'} |
| No unsupported #1 claim | ${qa.claimsNumberOne ? 'No' : 'Yes'} |

## Publish

Not performed.
`;

  await fs.mkdir(path.dirname(PREVIEW_OUT), { recursive: true });
  await fs.writeFile(PREVIEW_OUT, previewDoc, 'utf8');
  await fs.writeFile(QA_OUT, qaDoc, 'utf8');

  if (!write) {
    console.log(`\nDry-run. Wrote ${PREVIEW_OUT} and ${QA_OUT}. Pass --write to update DB.`);
    return;
  }

  const { error: updateErr } = await supabase
    .from('content_posts')
    .update({
      body_markdown: polishedMd,
      body_html: bodyHtml,
      word_count: wordCount,
      char_count: charCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', POST_ID);
  if (updateErr) throw new Error(updateErr.message);

  console.log(JSON.stringify({ updated: true, postId: POST_ID, word_count: wordCount }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
