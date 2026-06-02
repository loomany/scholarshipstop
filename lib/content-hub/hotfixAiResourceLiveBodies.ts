/**
 * Stage 6E.1 — repair live AI resource article bodies (markdown + HTML).
 */
import {
  hasRawInternalPath,
  linkifyInternalPathsInMarkdown
} from '@/lib/content-hub/polishAiResourceArticleMarkdown';
import { polishAiResourceArticleMarkdown } from '@/lib/content-hub/polishAiResourceArticleMarkdown';
import type { AiResourcePublishSlug } from '@/lib/content-hub/polishAiResourceArticleMarkdown';
import { polishAiResourceStage6cDraftMarkdown } from '@/lib/content-hub/polishAiResourceStage6cDrafts';
import type { AiResourceStage6cReviewSlug } from '@/lib/content-hub/polishAiResourceStage6cDrafts';
import { polishAiResourceStage6dDraftMarkdown } from '@/lib/content-hub/polishAiResourceStage6dDrafts';
import type { AiResourceStage6dReviewSlug } from '@/lib/content-hub/polishAiResourceStage6dDrafts';
import { AI_RESOURCE_PACK_SLUGS } from '@/lib/content-hub/aiResourcePackSlugs';

const STAGE6B_POLISH_SLUGS = new Set<AiResourcePublishSlug>([
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
]);

const STAGE6C_SLUGS = new Set<AiResourceStage6cReviewSlug>([
  'can-chatgpt-help-find-scholarships',
  'how-to-use-chatgpt-to-search-for-scholarships',
  'best-ai-tools-for-finding-scholarships',
  'ai-scholarship-search-vs-traditional-databases',
  'best-sites-to-find-fully-funded-scholarships'
]);

const STAGE6D_SLUGS = new Set<AiResourceStage6dReviewSlug>([
  'how-to-verify-ai-generated-scholarship-lists',
  'chatgpt-prompts-for-scholarship-search',
  'ai-tools-for-international-students-looking-for-scholarships',
  'how-to-use-ai-without-missing-scholarship-deadlines',
  'scholarship-search-checklist-using-ai'
]);

/** Unrendered / broken markdown link syntax (not valid `[label](/path)` in source). */
export function hasRawMarkdownLinkSyntax(text: string): boolean {
  if (/\[\s*\/[a-z0-9-]+\s*\]\s*\/[a-z0-9-]+\s*\[/i.test(text)) return true;
  if (/\[[^\]]+\]\[[^\]]+\]\(\//.test(text)) return true;
  if (/\]\(\/[^)]*\)\s*\]\(\//.test(text)) return true;
  if (/<p[^>]*>[^<]*\]\(\/(?:scholarships|resources)/i.test(text)) return true;
  if (
    /\]\(\/(?:scholarships|resources)/.test(text) &&
    (text.match(/<a\s+href=["']\/(?:scholarships|resources)/gi)?.length ?? 0) <
      (text.match(/\]\(\/(?:scholarships|resources)/g)?.length ?? 0)
  ) {
    return true;
  }
  return false;
}

function dedupePhrase(md: string, phrase: string): string {
  let out = md;
  let safety = 0;
  while (safety++ < 20) {
    const first = out.indexOf(phrase);
    if (first < 0) break;
    const second = out.indexOf(phrase, first + phrase.length);
    if (second < 0) break;
    const between = out.slice(first + phrase.length, second);
    if (between.length < 200 && /^[\s.,;:!?\-–—'"()]*$/i.test(between)) {
      out = out.slice(0, second) + out.slice(second + phrase.length);
      continue;
    }
    const window = out.slice(
      Math.max(0, second - 40),
      second + phrase.length + 80
    );
    if (/social post[\s\S]{0,60}inside an AI chat/i.test(window)) {
      out = out.slice(0, second) + out.slice(second + phrase.length);
      continue;
    }
    break;
  }
  return out;
}

const SLUG_SPECIFIC: Record<string, (md: string) => string> = {
  'how-to-verify-ai-generated-scholarship-lists': (md) =>
    md.replace(
      /inside an AI chat or social post, pause until you find a primary source\.\s*inside an AI chat or social post, pause until you find a primary source\./gi,
      'inside an AI chat or social post, pause until you find a primary source.'
    ),
  'best-sites-to-find-fully-funded-scholarships': (md) =>
    md
      .replace(
        /plus resources at\/resources\[resources\]\(\/resources\)/gi,
        'plus the [resources hub](/resources)'
      )
      .replace(/\bresources at\/resources\[resources\]\(\/resources\)/gi, '[resources hub](/resources)')
      .replace(/\bresources at\/resources\b/gi, '[resources hub](/resources)')
};

function fixGarbledResourcesAtPath(md: string): string {
  return md
    .replace(/\bresources at\/resources\b/gi, '[resources hub](/resources)')
    .replace(/\bat\/resources\b/gi, '[resources](/resources)')
    .replace(/\bon\/resources\b/gi, 'on [resources](/resources)')
    .replace(
      /\[category pages\]\(\/scholarships\)/gi,
      '[scholarship categories](/scholarships)'
    )
    .replace(
      /\[scholarship discovery\]\(\/scholarships\)/gi,
      '[scholarship discovery](/scholarships)'
    )
    .replace(
      /\[matching\]\(\/scholarships\/hub\/matches\)/gi,
      '[scholarship matching](/scholarships/hub/matches)'
    );
}

function fixBrokenBracketLinks(md: string): string {
  let out = md;
  out = out.replace(
    /\[\s*\/([a-z0-9-]+)\s*\]\s*\/\1\s*\[([^\]]+)\]\(\/\1\)/gi,
    '[$2](/$1)'
  );
  out = out.replace(
    /\[\s*\/([a-z0-9-]+)\s*\]\s*\(\s*\/\1\s*\)/gi,
    '[$1](/$1)'
  );
  out = out.replace(
    /\[([^\]]+)\]\1\[([^\]]+)\]\(\/([^)]+)\)\)/g,
    '[$2](/$3)'
  );
  out = out.replace(
    /\[([^\]]+)\]\[([^\]]+)\]\(\/\2\)/g,
    '[$2](/$2)'
  );
  return out;
}

/** Convert raw `[label](/path)` in HTML paragraphs to anchor tags. */
export function repairRawMarkdownLinksInHtml(html: string): string {
  return html.replace(
    /\[([^\]]+)\]\((\/(?:scholarships|resources)[^)]*)\)/g,
    '<a href="$2">$1</a>'
  );
}

function applyCommonRepairs(md: string, slug: string): string {
  let out = md;
  const slugFix = SLUG_SPECIFIC[slug];
  if (slugFix) out = slugFix(out);
  out = fixGarbledResourcesAtPath(out);
  out = fixBrokenBracketLinks(out);
  out = dedupePhrase(
    out,
    'inside an AI chat or social post'
  );
  out = out.replace(/<strong>Key Point \d+:<\/strong>\s*/gi, '');
  out = linkifyInternalPathsInMarkdown(out);
  return out;
}

export type HotfixResult = {
  slug: string;
  changed: boolean;
  fixes: string[];
  beforeIssues: string[];
  afterIssues: string[];
  markdown: string;
};

export function hotfixAiResourceBody(
  slug: string,
  sourceMd: string,
  sourceHtml: string
): HotfixResult {
  const fixes: string[] = [];
  const beforeBlob = `${sourceMd}\n${sourceHtml}`;
  const beforeIssues: string[] = [];
  if (hasRawMarkdownLinkSyntax(beforeBlob)) beforeIssues.push('raw-md-link');
  if (hasRawInternalPath(beforeBlob)) beforeIssues.push('bare-path');
  if (/inside an AI chat or social post[\s\S]{0,120}inside an AI chat/i.test(beforeBlob)) {
    beforeIssues.push('dup-phrase');
  }
  if (/resources at\/resources|at\/resources/i.test(beforeBlob)) {
    beforeIssues.push('garbled-resources');
  }
  if (/Key Point [123]/i.test(beforeBlob)) beforeIssues.push('key-point');

  let md = sourceMd.trim() || htmlToRoughMarkdown(sourceHtml);
  const origMd = md;

  if (STAGE6B_POLISH_SLUGS.has(slug as AiResourcePublishSlug)) {
    md = polishAiResourceArticleMarkdown(slug as AiResourcePublishSlug, md);
    fixes.push('stage6b-polish');
  } else if (STAGE6C_SLUGS.has(slug as AiResourceStage6cReviewSlug)) {
    md = polishAiResourceStage6cDraftMarkdown(slug as AiResourceStage6cReviewSlug, md);
    fixes.push('stage6c-polish');
  } else if (STAGE6D_SLUGS.has(slug as AiResourceStage6dReviewSlug)) {
    md = polishAiResourceStage6dDraftMarkdown(slug as AiResourceStage6dReviewSlug, md);
    fixes.push('stage6d-polish');
  } else {
    md = applyCommonRepairs(md, slug);
    fixes.push('common-repairs');
  }

  if (md !== origMd && !fixes.includes('common-repairs')) {
    md = applyCommonRepairs(md, slug);
    fixes.push('common-repairs-pass2');
  }

  md = applyCommonRepairs(md, slug);

  const afterBlob = md;
  const afterIssues: string[] = [];
  if (hasRawMarkdownLinkSyntax(afterBlob)) afterIssues.push('raw-md-link');
  if (hasRawInternalPath(afterBlob)) afterIssues.push('bare-path');
  if (/Key Point [123]/i.test(afterBlob)) afterIssues.push('key-point');

  return {
    slug,
    changed: md !== sourceMd.trim(),
    fixes,
    beforeIssues,
    afterIssues,
    markdown: md
  };
}

/** Minimal HTML → text for empty markdown column (rare). */
function htmlToRoughMarkdown(html: string): string {
  return html
    .replace(/<a\s+href=["'](\/[^"']+)["'][^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function isTargetAiResourceSlug(slug: string): boolean {
  return (AI_RESOURCE_PACK_SLUGS as readonly string[]).includes(slug);
}
