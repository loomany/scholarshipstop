import type { Json } from '@/types_db';

import type {
  RelatedScholarshipStored,
  ScholarshipMatchDbRow
} from './types';

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'scholarship',
  'scholarships',
  'student',
  'students',
  'award',
  'awards',
  'grant',
  'grants',
  'your',
  'with',
  'from',
  'that',
  'this',
  'are',
  'can',
  'top',
  'best',
  'new',
  'year',
  'how',
  'what',
  'when',
  'who',
  'all',
  'any',
  'our',
  'you',
  'get',
  'may',
  'one',
  'out',
  'per',
  'via'
]);

const MIN_KEYWORD_LEN = 4;
const MAX_KEYWORDS_PER_SCHOLARSHIP = 24;
const FALLBACK_MAX_LINKS = 3;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function tokenizeTitle(title: string): string[] {
  const t = title.toLowerCase();
  const words =
    t.match(/\b[a-z][a-z'-]{2,}\b/g)?.filter((w) => !STOPWORDS.has(w)) ?? [];
  return [...new Set(words)];
}

function bigramsFromTitle(title: string): string[] {
  const words =
    title
      .toLowerCase()
      .match(/\b[a-z][a-z'-]{2,}\b/g)
      ?.filter((w) => !STOPWORDS.has(w)) ?? [];
  const out: string[] = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    out.push(`${words[i]} ${words[i + 1]}`);
  }
  return [...new Set(out)];
}

/**
 * Deterministic keywords from catalog row + canonical title (longer phrases first).
 */
function buildScholarshipLinkKeywords(
  canonical: RelatedScholarshipStored,
  row: ScholarshipMatchDbRow | undefined
): string[] {
  const seen = new Set<string>();
  const add = (raw: string) => {
    const n = normalizeWhitespace(raw);
    if (n.length < MIN_KEYWORD_LEN) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
  };

  const title = (canonical.title || row?.title || '').trim();
  if (title) {
    for (const b of bigramsFromTitle(title)) add(b);
    for (const w of tokenizeTitle(title)) add(w);
  }

  if (row) {
    if (row.category?.trim()) add(row.category.trim());
    const slugParts = (row.category_slug || '')
      .split(/[_\s]+/)
      .filter((p) => p.length >= MIN_KEYWORD_LEN);
    for (const p of slugParts) add(p.replace(/-/g, ' '));

    for (const t of jsonStringArray(row.tags)) add(t.trim());
    for (const f of jsonStringArray(row.field_of_study)) add(f.trim());
  }

  const list = [...seen].sort((a, b) => b.length - a.length);
  return list.slice(0, MAX_KEYWORDS_PER_SCHOLARSHIP);
}

function isInsideHeading(html: string, pos: number): boolean {
  const before = html.slice(0, pos);
  let lastOpenIdx = -1;
  let lastOpenEnd = -1;
  const re = /<h[1-3]\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    lastOpenIdx = m.index;
    lastOpenEnd = m.index + m[0].length;
  }
  if (lastOpenIdx < 0) return false;
  const afterOpen = before.slice(lastOpenEnd);
  return !/<\/h[1-3]>/i.test(afterOpen);
}

function isInsideAnchor(html: string, pos: number): boolean {
  const before = html.slice(0, pos);
  const lastOpen = Math.max(before.lastIndexOf('<a '), before.lastIndexOf('<a>'));
  const lastClose = before.lastIndexOf('</a>');
  return lastOpen !== -1 && lastOpen > lastClose;
}

/** True if position lies inside `<...>` tag markup (incl. attributes). */
function isInsideTagMarkup(html: string, pos: number): boolean {
  const lt = html.lastIndexOf('<', pos);
  if (lt === -1) return false;
  const gt = html.indexOf('>', lt);
  if (gt === -1) return false;
  return pos <= gt;
}

function pIndexAt(html: string, pos: number): number {
  return (html.slice(0, pos).match(/<p\b/gi) || []).length;
}

function splitBeforeFaqSection(html: string): { main: string; tail: string } {
  const m = html.match(/<h2\b[^>]*>\s*faq\s*<\/h2>/i);
  if (!m || m.index === undefined) return { main: html, tail: '' };
  const idx = m.index;
  return { main: html.slice(0, idx), tail: html.slice(idx) };
}

function hasWordBoundary(html: string, start: number, len: number): boolean {
  const before = start > 0 ? html[start - 1] : '';
  const after = start + len < html.length ? html[start + len] : '';
  const beforeOk = !/[a-z0-9]/i.test(before);
  const afterOk = !/[a-z0-9]/i.test(after);
  return beforeOk && afterOk;
}

/**
 * Case-insensitive indexOf with word-boundary check on original `html`.
 */
function findSafeKeywordIndex(
  html: string,
  keyword: string,
  usedParagraphs: Set<number>
): number {
  const lowerHtml = html.toLowerCase();
  const kw = keyword.toLowerCase().trim();
  if (kw.length < MIN_KEYWORD_LEN) return -1;

  let idx = lowerHtml.indexOf(kw);
  while (idx !== -1) {
    if (
      !isInsideTagMarkup(html, idx) &&
      !isInsideHeading(html, idx) &&
      !isInsideAnchor(html, idx) &&
      hasWordBoundary(html, idx, kw.length)
    ) {
      const pi = pIndexAt(html, idx);
      if (!usedParagraphs.has(pi)) return idx;
    }
    idx = lowerHtml.indexOf(kw, idx + 1);
  }
  return -1;
}

function appendFallbackBlock(
  main: string,
  canonical: RelatedScholarshipStored[]
): string {
  const slice = canonical.slice(0, FALLBACK_MAX_LINKS);
  if (slice.length === 0) return main;

  const parts: string[] = ['<p><strong>Explore related scholarships:</strong> '];
  slice.forEach((item, i) => {
    const enc = encodeURIComponent(item.slug.trim());
    const label = (item.title || 'Scholarship').trim();
    parts.push(
      `<a href="/scholarships/${enc}">${escapeHtmlText(label)}</a>`
    );
    if (i < slice.length - 1) parts.push(', ');
  });
  parts.push('</p>');
  return `${main.trimEnd()}${main.trimEnd().length ? '\n' : ''}${parts.join('')}`;
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type InsertInlineScholarshipLinksResult = {
  html: string;
  /** Total `<a href="/scholarships/...">` inserted (keywords + fallback). */
  inlineLinksInserted: number;
  inlineFallbackUsed: boolean;
};

/**
 * Inserts up to `maxLinks` internal `/scholarships/{slug}` links using keywords
 * derived from the same canonical list as related cards. Only pre-FAQ HTML is modified.
 */
export function insertInlineScholarshipLinks(
  html: string,
  canonical: RelatedScholarshipStored[],
  rowBySlug: Map<string, ScholarshipMatchDbRow>,
  maxLinks = 3
): InsertInlineScholarshipLinksResult {
  const { main, tail } = splitBeforeFaqSection(html);
  let work = main;
  const usedParagraphs = new Set<number>();
  const usedSlugs = new Set<string>();
  let keywordInsertCount = 0;

  for (const item of canonical) {
    if (keywordInsertCount >= maxLinks) break;
    const slug = item.slug.trim();
    if (!slug || usedSlugs.has(slug)) continue;

    const row = rowBySlug.get(slug);
    const keywords = buildScholarshipLinkKeywords(item, row);

    for (const keyword of keywords) {
      if (keywordInsertCount >= maxLinks) break;
      const idx = findSafeKeywordIndex(work, keyword, usedParagraphs);
      if (idx < 0) continue;

      const matched = work.slice(idx, idx + keyword.length);
      const enc = encodeURIComponent(slug);
      const linked = `<a href="/scholarships/${enc}">${matched}</a>`;
      const paraIdx = pIndexAt(work, idx);
      work = work.slice(0, idx) + linked + work.slice(idx + matched.length);
      usedSlugs.add(slug);
      usedParagraphs.add(paraIdx);
      keywordInsertCount += 1;
      break;
    }
  }

  let inlineFallbackUsed = false;
  if (keywordInsertCount === 0 && canonical.length > 0) {
    work = appendFallbackBlock(work, canonical);
    inlineFallbackUsed = true;
  }

  const fallbackLinkCount = inlineFallbackUsed
    ? Math.min(FALLBACK_MAX_LINKS, canonical.length)
    : 0;
  const inlineLinksInserted = keywordInsertCount + fallbackLinkCount;

  return {
    html: work + tail,
    inlineLinksInserted,
    inlineFallbackUsed
  };
}
