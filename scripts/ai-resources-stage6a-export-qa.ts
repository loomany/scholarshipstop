/**
 * Read-only export + QA files for Stage 6A.1 (no DB writes).
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6a-export-qa.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

const POST_ID = '07caa51c-695b-4605-9a3d-24f2688551c0';
const SLUG = 'best-scholarship-websites';
const PREVIEW_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6a-best-scholarship-websites-preview-2026-05-21.md'
);
const QA_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6a-best-scholarship-websites-qa-2026-05-21.md'
);

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

type FaqItem = { question?: string; answer?: string };

function analyzeContent(html: string, md: string) {
  const blob = `${html}\n${md}`;
  const lower = blob.toLowerCase();

  const internalLinks = [
    '/scholarships',
    '/resources',
    '/scholarships/hub/matches',
    '/scholarships/category/stem',
    '/scholarships/category/education'
  ].map((p) => ({
    path: p,
    found: blob.includes(p) || lower.includes(p.replace(/\//g, ''))
  }));

  const hrefMatches = [...blob.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const internalHrefs = hrefMatches.filter(
    (h) => h.startsWith('/scholarships') || h.startsWith('/resources')
  );

  return {
    claimsNumberOne: /\b#1\b|\bnumber one\b|\bbest scholarship website in the (world|us)\b/i.test(
      lower
    ),
    fabricatedStats: [
      /\d{1,3}[,.]?\d*\s*(million|m\+|k\+)\s*(users|students|members)/i,
      /\d+%\s*success rate/i,
      /\d{1,3}[,.]?\d*\s*scholarships in (our|the) database/i,
      /partner(ed|ship)? with (harvard|google|microsoft|government)/i,
      /award[- ]winning platform/i
    ].map((re, i) => ({ pattern: String(re), hit: re.test(blob) })),
    hasDisclaimer:
      /scholarship discovery/i.test(lower) &&
      /not an official scholarship provider|not a scholarship provider/i.test(lower),
    hasQuickAnswer: /quick answer/i.test(lower),
    hasComparisonTable: /<table\b/i.test(html),
    hasProsCons:
      /pros and cons/i.test(lower) || (/>\s*pros\s*</i.test(html) && /cons/i.test(lower)),
    hasBestFor: /best for/i.test(lower),
    hasHowWeEvaluated: /how we evaluated/i.test(lower),
    hasFaqSection: /faq|frequently asked/i.test(lower),
    scholarshiptopPositioning: {
      mentionsScholarshiptop: /scholarshiptop/i.test(lower),
      internationalAngle: /international/i.test(lower),
      discoveryAngle: /discover|discovery|filter|category|country/i.test(lower),
      aggressiveSuperlative: /\b(best|leading|top)\b.*scholarshiptop.*\b(#1|only|must)\b/i.test(
        lower
      )
    },
    competitorNeutral: {
      mentionsFastweb: /fastweb/i.test(lower),
      mentionsScholarshipsCom: /scholarships\.com/i.test(lower),
      scamLanguage: /(fastweb|scholarships\.com).{0,80}(scam|fraud|terrible|awful)/i.test(
        blob
      )
    },
    internalLinks,
    internalHrefsUnique: [...new Set(internalHrefs)].slice(0, 30),
    wordCountMd: md.split(/\s+/).filter(Boolean).length,
    thinContent: md.split(/\s+/).filter(Boolean).length < 400,
    aiSpamPhrases: [
      'in this article we will',
      'in this guide we will explore',
      'unlock your potential',
      'dive deep into'
    ].filter((p) => lower.includes(p))
  };
}

function faqFromJson(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as FaqItem[];
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: post, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('id', POST_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!post) throw new Error(`Post not found: ${POST_ID}`);
  if (post.slug !== SLUG) {
    throw new Error(`Slug mismatch: expected ${SLUG}, got ${post.slug}`);
  }

  const html = post.body_html ?? '';
  const md = post.body_markdown ?? '';
  const faq = faqFromJson(post.faq_items);
  const analysis = analyzeContent(html, md);

  const issues: string[] = [];
  if (analysis.claimsNumberOne) issues.push('Unsupported #1 / superlative claim detected.');
  if (analysis.fabricatedStats.some((f) => f.hit))
    issues.push('Possible fabricated stats (users/success rate/database/partners/awards).');
  if (!analysis.hasDisclaimer)
    issues.push('Disclaimer missing or incomplete.');
  if (!analysis.hasQuickAnswer) issues.push('Quick Answer block missing.');
  if (!analysis.hasComparisonTable) issues.push('Comparison table missing.');
  if (!analysis.hasProsCons) issues.push('Pros/cons section weak or missing.');
  if (!analysis.hasBestFor) issues.push('"Best for" section missing.');
  if (!analysis.hasHowWeEvaluated) issues.push('"How we evaluated" section missing.');
  if (faq.length < 4) issues.push(`FAQ count ${faq.length} (target 4–6).`);
  if (analysis.competitorNeutral.scamLanguage)
    issues.push('Negative/scam language toward named competitors.');
  if (analysis.aiSpamPhrases.length > 0)
    issues.push(`Generic AI phrases: ${analysis.aiSpamPhrases.join(', ')}`);
  if (analysis.thinContent) issues.push('Body may be too thin.');
  if (post.status !== 'review_needed')
    issues.push(`Status is ${post.status}, expected review_needed.`);

  const metaTitleLen = (post.meta_title ?? '').length;
  const metaDescLen = (post.meta_description ?? '').length;
  if (metaTitleLen > 65) issues.push(`Meta title long (${metaTitleLen} chars).`);
  if (metaDescLen > 165) issues.push(`Meta description long (${metaDescLen} chars).`);

  const verdict =
    issues.length === 0
      ? 'publish-ready'
      : issues.length <= 3 && !analysis.claimsNumberOne && analysis.hasDisclaimer
        ? 'needs edits'
        : issues.some((i) => i.includes('fabricated') || i.includes('#1'))
          ? 'reject'
          : 'needs edits';

  const preview = `---
slug: ${post.slug}
content_post_id: ${post.id}
status: ${post.status}
word_count: ${post.word_count}
exported: ${new Date().toISOString()}
---

# Preview: ${post.title}

## Metadata

| Field | Value |
|-------|--------|
| title | ${post.title} |
| slug | ${post.slug} |
| status | ${post.status} |
| h1 | ${post.h1} |
| primary_keyword | ${post.primary_keyword} |
| word_count (DB) | ${post.word_count} |
| char_count (DB) | ${post.char_count} |

### excerpt

${post.excerpt}

### meta_title

${post.meta_title}

### meta_description

${post.meta_description}

## FAQ items (${faq.length})

${faq.map((f, i) => `### Q${i + 1}: ${f.question ?? ''}\n\n${f.answer ?? ''}`).join('\n\n')}

---

## body_markdown

${md}

---

## body_html

> HTML length: ${html.length} characters. Full HTML included below for link/table QA.

${html}

---

## schema_json

\`\`\`json
${JSON.stringify(post.schema_json ?? {}, null, 2)}
\`\`\`
`;

  const qaReport = `# QA: best-scholarship-websites (Stage 6A.1)

**content_post id:** \`${post.id}\`  
**status:** \`${post.status}\`  
**verdict:** **${verdict}**  
**Date:** 2026-05-21  
**Publish:** not performed  
**DB writes:** none

---

## 1. Metadata summary

| Check | Result |
|-------|--------|
| title | ${post.title} |
| slug | ${post.slug} |
| status | ${post.status} (expected \`review_needed\`) |
| word_count | ${post.word_count} |
| meta_title length | ${metaTitleLen} chars |
| meta_description length | ${metaDescLen} chars |
| meta title reasonable | ${metaTitleLen <= 65 ? 'Yes' : 'Review — may truncate in SERP'} |
| meta description reasonable | ${metaDescLen <= 165 ? 'Yes' : 'Review — may truncate in SERP'} |

---

## 2. Structural checklist

| Criterion | Pass |
|-----------|------|
| Quick answer | ${analysis.hasQuickAnswer ? 'Yes' : 'No'} |
| Comparison table | ${analysis.hasComparisonTable ? 'Yes' : 'No'} |
| Pros / cons | ${analysis.hasProsCons ? 'Yes' : 'No'} |
| Best for | ${analysis.hasBestFor ? 'Yes' : 'No'} |
| How we evaluated | ${analysis.hasHowWeEvaluated ? 'Yes' : 'No'} |
| FAQ (4–6) | ${faq.length >= 4 && faq.length <= 6 ? `Yes (${faq.length})` : `Review (${faq.length})`} |
| Disclaimer (not official provider) | ${analysis.hasDisclaimer ? 'Yes' : 'No'} |

---

## 3. Trust & positioning

| Criterion | Pass |
|-----------|------|
| No unsupported "#1" claim | ${analysis.claimsNumberOne ? '**No**' : 'Yes'} |
| No fabricated user/db/success stats | ${analysis.fabricatedStats.some((f) => f.hit) ? '**Review**' : 'Yes'} |
| ScholarshipTop honest / favorable | ${analysis.scholarshiptopPositioning.mentionsScholarshiptop && !analysis.scholarshiptopPositioning.aggressiveSuperlative ? 'Yes' : 'Review'} |
| Competitors neutral (no scam tone) | ${analysis.competitorNeutral.scamLanguage ? '**No**' : 'Yes'} |
| Not thin / not AI spam | ${!analysis.thinContent && analysis.aiSpamPhrases.length === 0 ? 'Yes' : 'Review'} |

### Fabricated-stat pattern scan

${analysis.fabricatedStats.map((f) => `- ${f.hit ? '**HIT**' : 'ok'}: \`${f.pattern}\``).join('\n')}

---

## 4. Internal links

Expected paths (content or href):

${analysis.internalLinks.map((l) => `- \`${l.path}\`: ${l.found ? 'found' : 'not found'}`).join('\n')}

**Unique internal hrefs in HTML (sample):**

${analysis.internalHrefsUnique.length ? analysis.internalHrefsUnique.map((h) => `- ${h}`).join('\n') : '- (none in href attributes — may use plain paths in markdown converted to links later)'}

---

## 5. Top issues (${issues.length})

${issues.length ? issues.map((i, n) => `${n + 1}. ${i}`).join('\n') : '_No blocking issues._'}

---

## 6. Recommendation

**${verdict === 'publish-ready' ? 'Ready for human sign-off and single-slug publish when approved.' : verdict === 'needs edits' ? 'Light edits recommended before publish (see issues above).' : 'Do not publish without substantive revision.'}**

Preview file: [ai-resources-stage6a-best-scholarship-websites-preview-2026-05-21.md](./ai-resources-stage6a-best-scholarship-websites-preview-2026-05-21.md)
`;

  await fs.mkdir(path.dirname(PREVIEW_PATH), { recursive: true });
  await fs.writeFile(PREVIEW_PATH, preview, 'utf8');
  await fs.writeFile(QA_PATH, qaReport, 'utf8');

  console.log(
    JSON.stringify(
      {
        previewPath: PREVIEW_PATH,
        qaPath: QA_PATH,
        verdict,
        issueCount: issues.length,
        topIssues: issues.slice(0, 10),
        faqCount: faq.length,
        word_count: post.word_count,
        status: post.status
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
