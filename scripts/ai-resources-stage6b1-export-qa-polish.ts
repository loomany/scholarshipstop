/**
 * Stage 6B.1 — export previews, QA, optional polish (review_needed only).
 *
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6b1-export-qa-polish.ts
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6b1-export-qa-polish.ts --write
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

const TARGET_SLUGS = [
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

const SPAM_SLUG = 'best-free-scholarship-websites-without-spam';
const PREVIEW_DIR = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b-previews-2026-05-21'
);
const POLISHED_DIR = path.join(process.cwd(), 'data/content/polished');
const QA_REPORT = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b-five-article-qa-2026-05-21.md'
);

const REQUIRED_INTERNAL_PATHS = [
  '/scholarships',
  '/resources',
  '/scholarships/hub/matches',
  '/scholarships/category/stem',
  '/scholarships/category/education'
] as const;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

type FaqItem = { question?: string; answer?: string };

function countInternalHref(html: string): number {
  return [...html.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)].length;
}

function listInternalHrefs(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)].map(
        (m) => m[1]
      )
    )
  ];
}

function faqFromJson(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as FaqItem[];
}

function faqFromMarkdown(md: string): number {
  const idx = md.search(/##\s*FAQ/i);
  if (idx < 0) return 0;
  return (md.slice(idx).match(/^###\s+/gm) ?? []).length;
}

function analyzeContent(html: string, md: string, faq: FaqItem[]) {
  const blob = `${html}\n${md}`;
  const lower = blob.toLowerCase();
  const faqCount = faq.length > 0 ? faq.length : faqFromMarkdown(md);

  const fabricatedHits = [
    { label: 'million users/students', re: /\d{1,3}[,.]?\d*\s*(million|m\+|k\+)\s*(users|students|members)/i },
    { label: 'success rate %', re: /\d+%\s*success rate/i },
    { label: 'database size claim', re: /\d{1,3}[,.]?\d*\s*scholarships in (our|the) database/i },
    { label: 'named partner claim', re: /partner(ed|ship)? with (harvard|google|microsoft|government)/i },
    { label: 'award-winning platform', re: /award[- ]winning platform/i }
  ].filter((x) => x.re.test(blob));

  const internalHrefs = listInternalHrefs(html);
  const requiredFound = REQUIRED_INTERNAL_PATHS.map((p) => ({
    path: p,
    found: internalHrefs.some((h) => h === p || h.startsWith(`${p}/`)) || blob.includes(`](${p})`)
  }));

  return {
    claimsNumberOne:
      /\b#1\b|\bnumber one\b|\bbest scholarship website in the (world|us)\b/i.test(lower),
    fabricatedHits,
    hasWideTable: /<table\b/i.test(html),
    placeholderText: /lorem ipsum|type \?\?\?|todo:|tbd\b|\[insert/i.test(blob),
    in35Bullets: /in 3[–-]5 bullets/i.test(blob),
    typeTripleQuestion: /type \?\?\?/i.test(blob),
    hasQuickAnswer: /##\s*quick answer/i.test(md) || /quick answer/i.test(lower),
    hasComparisonCards:
      /###\s+/i.test(md) || (/pros/i.test(lower) && /limitations/i.test(lower)),
    hasProsCons:
      (/pros/i.test(lower) && (/cons|limitations|watch out/i.test(lower))) ||
      (/strengths/i.test(lower) && (/limitations|watch out/i.test(lower))),
    faqCount,
    hasDisclaimer:
      /not an official scholarship provider|not a scholarship provider/i.test(lower) &&
      /financial aid office|verify/i.test(lower),
    internalHrefCount: countInternalHref(html),
    internalHrefs,
    requiredFound,
    metaTitleLen: 0,
    metaDescLen: 0,
    scholarshiptopHonest:
      /scholarshiptop/i.test(lower) &&
      !/\b(#1|only platform|must use scholarshiptop)\b/i.test(lower),
    competitorNeutral: !/(fastweb|scholarships\.com|bigfuture).{0,80}(scam|fraud|terrible|awful)/i.test(
      blob
    )
  };
}

function buildIssues(
  slug: string,
  post: { status: string; meta_title: string | null; meta_description: string | null },
  a: ReturnType<typeof analyzeContent>
): string[] {
  const issues: string[] = [];
  if (post.status !== 'review_needed') issues.push(`Status is ${post.status}, expected review_needed.`);
  if (a.claimsNumberOne) issues.push('Unsupported #1 / superlative claim.');
  if (a.fabricatedHits.length) {
    issues.push(`Possible fabricated stats: ${a.fabricatedHits.map((h) => h.label).join(', ')}.`);
  }
  if (a.hasWideTable) issues.push('Wide HTML <table> present.');
  if (a.placeholderText) issues.push('Placeholder text detected.');
  if (a.in35Bullets) issues.push('"In 3–5 bullets" placeholder phrasing.');
  if (a.typeTripleQuestion) issues.push('"Type ???" placeholder.');
  if (!a.hasQuickAnswer) issues.push('Quick Answer section missing.');
  if (!a.hasComparisonCards && slug.includes('vs')) issues.push('Comparison sections/cards weak.');
  if (!a.hasProsCons) issues.push('Pros/cons or strengths/limitations weak.');
  if (a.faqCount < 4 || a.faqCount > 6) issues.push(`FAQ count ${a.faqCount} (target 4–6).`);
  if (!a.hasDisclaimer) issues.push('Disclaimer incomplete.');
  if (a.internalHrefCount < 2) issues.push(`Low internal link count (${a.internalHrefCount}).`);
  if (!a.competitorNeutral) issues.push('Negative tone toward named competitor.');
  const mt = (post.meta_title ?? '').length;
  const md = (post.meta_description ?? '').length;
  if (mt > 65) issues.push(`Meta title long (${mt} chars).`);
  if (md > 165) issues.push(`Meta description long (${md} chars).`);
  if (mt < 10) issues.push('Meta title missing/short.');
  if (md < 30) issues.push('Meta description missing/short.');
  return issues;
}

function verdictFor(issues: string[], a: ReturnType<typeof analyzeContent>): string {
  if (
    issues.some(
      (i) =>
        i.includes('#1') ||
        i.includes('fabricated') ||
        i.includes('<table>') ||
        i.includes('placeholder') ||
        i.includes('Type ???')
    )
  ) {
    return 'reject';
  }
  if (issues.length === 0) return 'publish-ready';
  if (issues.length <= 3 && !a.claimsNumberOne && a.hasDisclaimer) return 'needs edits';
  return 'needs edits';
}

/** Convert plain paths and add missing internal markdown links (spam article). */
function polishSpamInternalLinks(md: string): string {
  let out = md;

  out = out.replace(
    /clean browsing through \/scholarships and personalized discovery through \/scholarships\/hub\/matches/gi,
    'clean browsing through [scholarship search](/scholarships) and personalized discovery through [matching](/scholarships/hub/matches)'
  );

  out = out.replace(
    /STEM students should browse \/scholarships\/category\/stem, future teachers can start with \/scholarships\/category\/education, and students who need application help should keep \/resources open/gi,
    'STEM students should browse [STEM scholarships](/scholarships/category/stem), future teachers can start with [education scholarships](/scholarships/category/education), and students who need application help should keep our [resources hub](/resources) open'
  );

  out = out.replace(
    /\*\*Quick Answer:\*\* Start with ScholarshipTop/gi,
    '**Quick Answer:** Start with [ScholarshipTop](/scholarships)'
  );

  // Plain path mentions → markdown (if not already linked)
  const pathLinks: [RegExp, string][] = [
    [/(?<!\])\s\/scholarships\/hub\/matches(?!\])/g, ' [matching hub](/scholarships/hub/matches)'],
    [/(?<!\])\s\/scholarships\/category\/stem(?!\])/g, ' [STEM scholarships](/scholarships/category/stem)'],
    [
      /(?<!\])\s\/scholarships\/category\/education(?!\])/g,
      ' [education scholarships](/scholarships/category/education)'
    ],
    [/(?<!\])\s\/resources(?!\])/g, ' [resources](/resources)'],
    [/(?<!\])\s\/scholarships(?!\])/g, ' [scholarships](/scholarships)']
  ];
  for (const [re, rep] of pathLinks) {
    out = out.replace(re, rep);
  }

  return out;
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

async function main() {
  const write = process.argv.includes('--write');
  const supabase = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: posts, error } = await supabase
    .from('content_posts')
    .select('*')
    .in('slug', [...TARGET_SLUGS]);
  if (error) throw new Error(error.message);

  const bySlug = new Map((posts ?? []).map((p) => [p.slug, p]));
  for (const slug of TARGET_SLUGS) {
    if (!bySlug.has(slug)) throw new Error(`Missing post for slug: ${slug}`);
  }

  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(POLISHED_DIR, { recursive: true });

  const results: {
    slug: string;
    postId: string;
    verdict: string;
    issues: string[];
    analysis: ReturnType<typeof analyzeContent>;
    updated: boolean;
  }[] = [];

  const dbUpdates: { slug: string; postId: string }[] = [];

  for (const slug of TARGET_SLUGS) {
    const post = bySlug.get(slug)!;
    let md = post.body_markdown ?? '';
    let html = post.body_html ?? '';
    let polished = false;

    if (slug === SPAM_SLUG) {
      const beforeCount = countInternalHref(html);
      const polishedMd = polishSpamInternalLinks(md);
      if (polishedMd !== md) {
        polished = true;
        md = polishedMd;
        html = cleanupExternalAnchors(await markdownToHtml(md));
        const polishedPath = path.join(
          POLISHED_DIR,
          `${slug}-2026-05-21.md`
        );
        await fs.writeFile(polishedPath, md, 'utf8');
        if (write) {
          const { error: upErr } = await supabase
            .from('content_posts')
            .update({
              body_markdown: md,
              body_html: html,
              word_count: countWords(md),
              char_count: countCharsNoSpaces(md),
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id);
          if (upErr) throw new Error(upErr.message);
          dbUpdates.push({ slug, postId: post.id });
        }
        console.log(
          JSON.stringify({
            slug,
            polish: true,
            internalBefore: beforeCount,
            internalAfter: countInternalHref(html),
            write
          })
        );
      }
    }

    const faq = faqFromJson(post.faq_items);
    const analysis = analyzeContent(html, md, faq);
    const issues = buildIssues(slug, post, analysis);
    const verdict = verdictFor(issues, analysis);

    results.push({
      slug,
      postId: post.id,
      verdict,
      issues,
      analysis,
      updated: polished && write
    });

    const preview = `---
slug: ${post.slug}
content_post_id: ${post.id}
status: ${post.status}
word_count: ${post.word_count}
exported: ${new Date().toISOString()}
polished_in_6b1: ${polished}
---

# Preview: ${post.title}

## Metadata

| Field | Value |
|-------|--------|
| title | ${post.title} |
| slug | ${post.slug} |
| status | ${post.status} |
| h1 | ${post.h1} |
| word_count (DB) | ${post.word_count} |

### excerpt

${post.excerpt}

### meta_title

${post.meta_title}

### meta_description

${post.meta_description}

## FAQ items (${faq.length || analysis.faqCount})

${faq.map((f, i) => `### Q${i + 1}: ${f.question ?? ''}\n\n${f.answer ?? ''}`).join('\n\n')}

---

## body_markdown

${md}

---

## body_html

${html}

---

## schema_json

\`\`\`json
${JSON.stringify(post.schema_json ?? {}, null, 2)}
\`\`\`
`;

    await fs.writeFile(path.join(PREVIEW_DIR, `${slug}.md`), preview, 'utf8');
  }

  let qaMd = `# AI Resources Stage 6B.1 — five-article QA\n\n`;
  qaMd += `**Date:** 2026-05-21  \n`;
  qaMd += `**Status:** all posts remain \`review_needed\` — **not published**  \n`;
  const updatedRows = results.filter((r) => r.updated);
  qaMd += `**DB writes:** ${updatedRows.length ? 'yes — internal links on spam slug only' : write ? 'attempted' : 'export/QA only'}\n\n`;
  if (updatedRows.length) {
    qaMd += `**Updated rows:** ${updatedRows.map((r) => `\`${r.slug}\` (\`${r.postId}\`)`).join(', ')}\n\n`;
  }
  qaMd += `## Summary\n\n| Slug | verdict | internal hrefs | FAQ | issues |\n|------|---------|----------------|-----|--------|\n`;
  for (const r of results) {
    qaMd += `| ${r.slug} | **${r.verdict}** | ${r.analysis.internalHrefCount} | ${r.analysis.faqCount} | ${r.issues.length} |\n`;
  }
  qaMd += `\n## Per-article\n\n`;
  for (const r of results) {
    qaMd += `### ${r.slug}\n\n`;
    qaMd += `- **post_id:** \`${r.postId}\`\n`;
    qaMd += `- **verdict:** **${r.verdict}**\n`;
    qaMd += `- **DB updated (6B.1):** ${r.updated ? 'yes' : 'no'}\n`;
    qaMd += `- **internal href count:** ${r.analysis.internalHrefCount}\n`;
    qaMd += `- **internal hrefs:** ${r.analysis.internalHrefs.length ? r.analysis.internalHrefs.map((h) => `\`${h}\``).join(', ') : '_none_'}\n\n`;
    qaMd += `| Check | Pass |\n|-------|------|\n`;
    qaMd += `| No fake #1 | ${r.analysis.claimsNumberOne ? 'No' : 'Yes'} |\n`;
    qaMd += `| No fabricated stats | ${r.analysis.fabricatedHits.length ? 'Review' : 'Yes'} |\n`;
    qaMd += `| No wide table | ${r.analysis.hasWideTable ? 'No' : 'Yes'} |\n`;
    qaMd += `| No placeholders | ${r.analysis.placeholderText || r.analysis.in35Bullets || r.analysis.typeTripleQuestion ? 'No' : 'Yes'} |\n`;
    qaMd += `| Quick answer | ${r.analysis.hasQuickAnswer ? 'Yes' : 'No'} |\n`;
    qaMd += `| Comparison cards/sections | ${r.analysis.hasComparisonCards ? 'Yes' : 'No'} |\n`;
    qaMd += `| Pros/cons or strengths/limitations | ${r.analysis.hasProsCons ? 'Yes' : 'No'} |\n`;
    qaMd += `| FAQ 4–6 | ${r.analysis.faqCount >= 4 && r.analysis.faqCount <= 6 ? `Yes (${r.analysis.faqCount})` : `No (${r.analysis.faqCount})`} |\n`;
    qaMd += `| Disclaimer | ${r.analysis.hasDisclaimer ? 'Yes' : 'No'} |\n`;
    qaMd += `| ST honest positioning | ${r.analysis.scholarshiptopHonest ? 'Yes' : 'Review'} |\n`;
    qaMd += `| Competitors neutral | ${r.analysis.competitorNeutral ? 'Yes' : 'No'} |\n\n`;
    if (r.slug === SPAM_SLUG) {
      qaMd += `**Required internal paths:**\n\n`;
      for (const p of r.analysis.requiredFound) {
        qaMd += `- \`${p.path}\`: ${p.found ? 'found' : 'missing'}\n`;
      }
      qaMd += '\n';
    }
    qaMd += r.issues.length
      ? `**Issues:**\n${r.issues.map((i, n) => `${n + 1}. ${i}`).join('\n')}\n\n`
      : `_No blocking issues._\n\n`;
  }
  qaMd += `## Guardrails\n\n`;
  qaMd += `- No publish, no new generation, no ES/FR\n`;
  qaMd += `- Previews: [ai-resources-stage6b-previews-2026-05-21/](./ai-resources-stage6b-previews-2026-05-21/)\n`;

  await fs.writeFile(QA_REPORT, qaMd, 'utf8');

  console.log(
    JSON.stringify(
      {
        previewDir: PREVIEW_DIR,
        qaReport: QA_REPORT,
        results: results.map((r) => ({
          slug: r.slug,
          verdict: r.verdict,
          internalHrefCount: r.analysis.internalHrefCount,
          updated: r.updated
        })),
        dbUpdates
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
