import type { ContentPostFaqItem } from '@/lib/content-hub/contentPostFaq';

function stripTagsToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFaqSectionHeading(innerHtml: string): boolean {
  const t = stripTagsToText(innerHtml);
  return /^faq\b/i.test(t);
}

/** Question from `<p><strong>...</strong></p>` — whole paragraph is only strong/bold. */
function extractStrongWrappedQuestion(inner: string): string | null {
  const t = inner.trim();
  const mStrong =
    /^<strong\b[^>]*>([\s\S]*?)<\/strong>\s*$/i.exec(t);
  const mB = /^<b\b[^>]*>([\s\S]*?)<\/b>\s*$/i.exec(t);
  const m = mStrong ?? mB;
  if (!m) return null;
  const q = stripTagsToText(m[1]);
  return q.length ? q : null;
}

/**
 * One paragraph: `<p><strong>Question?</strong> Answer continues here...</p>`
 * or `<strong>...</strong><br/>Answer`.
 */
function extractQuestionAnswerFromMixedParagraph(
  inner: string
): { question: string; answer: string } | null {
  const t = inner.trim();
  const m =
    /^<strong\b[^>]*>([\s\S]*?)<\/strong>\s*([\s\S]+)$/i.exec(t) ??
    /^<b\b[^>]*>([\s\S]*?)<\/b>\s*([\s\S]+)$/i.exec(t);
  if (!m) return null;
  const question = stripTagsToText(m[1]);
  const answer = stripTagsToText(m[2]);
  if (!question || !answer) return null;
  return { question, answer };
}

/**
 * Parses FAQ pairs after the heading: alternating `<p><strong>...</strong></p>` +
 * `<p>answer...</p>`.
 * Stops at the next `<h1>`/`h2>` or invalid structure.
 */
/** Skip `<p>...</p>` blocks that aren't `strong`/`<b>`-only question lines (e.g. short intro blurbs). */
function skipLeadingNonQuestionParagraphs(fragment: string, pos: number): number {
  let p = pos;
  let guard = 0;
  while (guard < 4) {
    guard += 1;
    const tail = fragment.slice(p);
    const ws = tail.match(/^[\s\r\n]+/);
    if (ws) {
      p += ws[0].length;
      continue;
    }
    if (p >= fragment.length || /^<(h[12])\b/i.test(fragment.slice(p))) {
      break;
    }
    const pm = /^<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(fragment.slice(p));
    if (!pm) break;
    const inner = pm[1] ?? '';
    if (extractStrongWrappedQuestion(inner)) return p;
    if (extractQuestionAnswerFromMixedParagraph(inner)) return p;

    const textOnly = stripTagsToText(inner);
    // Intro teaser line(s) — not a FAQ row
    if (textOnly.length <= 480) {
      p += pm[0].length;
      continue;
    }
    break;
  }
  return pos;
}

function parseFaqPairsAfterHeading(fragment: string): {
  items: ContentPostFaqItem[];
  consumedLength: number;
} | null {
  const items: ContentPostFaqItem[] = [];
  let pos = skipLeadingNonQuestionParagraphs(fragment, 0);

  while (true) {
    const tail = fragment.slice(pos);
    const ws = tail.match(/^[\s\r\n]+/);
    if (ws) {
      pos += ws[0].length;
      continue;
    }
    if (pos >= fragment.length) break;

    if (/^<(h[12])\b/i.test(fragment.slice(pos))) break;

    const pm = /^<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(fragment.slice(pos));
    if (!pm) break;

    const innerQ = pm[1] ?? '';

    const mixed = extractQuestionAnswerFromMixedParagraph(innerQ);
    if (mixed) {
      items.push(mixed);
      pos += pm[0].length;
      continue;
    }

    const question = extractStrongWrappedQuestion(innerQ);
    if (!question) break;

    const afterFirstP = pos + pm[0].length;
    const tail2 = fragment.slice(afterFirstP);
    const wm = tail2.match(/^[\s\r\n]+/);
    const afterWs = afterFirstP + (wm ? wm[0].length : 0);

    const pa = /^<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(fragment.slice(afterWs));
    if (!pa) break;

    const answer = stripTagsToText(pa[1] ?? '');
    if (!answer) break;

    items.push({ question, answer });
    pos = afterWs + pa[0].length;
  }

  if (items.length === 0) return null;

  return { items, consumedLength: pos };
}

function tryExtractAfterFaqHeading(
  trimmed: string,
  headingStart: number,
  headingEnd: number,
  sectionHeading: string
): {
  html: string;
  items: ContentPostFaqItem[];
  sectionHeading: string | null;
} | null {
  const slug = trimmed.slice(headingEnd);
  const parsed = parseFaqPairsAfterHeading(slug);
  if (!parsed) return null;

  const end = headingEnd + parsed.consumedLength;
  const nextHtml = `${trimmed.slice(0, headingStart)}${trimmed.slice(end)}`
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    html: nextHtml,
    items: parsed.items,
    sectionHeading: sectionHeading.replace(/\s+/g, ' ').trim() || null
  };
}

/**
 * Finds FAQ block either after `<h2>`/`<h3>` starting with "FAQ",
 * or after `<p><strong>FAQ: …</strong></p>` (common CMS export).
 */
export function extractInlineFaqFromBodyHtml(html: string): {
  html: string;
  items: ContentPostFaqItem[];
  /** Strip tags; accordion `<h2>` text when extracting from body */
  sectionHeading: string | null;
} {
  const trimmed = html;

  const reHeading = /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = reHeading.exec(trimmed)) !== null) {
    const inner = m[3] ?? '';
    if (!isFaqSectionHeading(inner)) continue;

    const fullMatch = m[0];
    const start = m.index!;
    const afterHeading = start + fullMatch.length;
    const title = stripTagsToText(inner);
    const out = tryExtractAfterFaqHeading(
      trimmed,
      start,
      afterHeading,
      title
    );
    if (out) return out;
  }

  /** `<p><strong>FAQ: title</strong></p>` followed by Q&A lines */
  const rePara = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = rePara.exec(trimmed)) !== null) {
    const inner = pm[1] ?? '';
    const sole = extractStrongWrappedQuestion(inner);
    if (!sole || !/^faq\b/i.test(sole)) continue;

    const start = pm.index!;
    const afterTitle = start + pm[0].length;
    const out = tryExtractAfterFaqHeading(trimmed, start, afterTitle, sole);
    if (out) return out;
  }

  return { html, items: [], sectionHeading: null };
}

/** Merge FAQ from JSON column and inline extraction; duplicate questions omitted. */
export function mergeUniqueFaqItems(
  fromJson: ContentPostFaqItem[],
  inline: ContentPostFaqItem[]
): ContentPostFaqItem[] {
  const seen = new Set<string>();
  const out: ContentPostFaqItem[] = [];

  for (const item of [...fromJson, ...inline]) {
    const key = item.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}
