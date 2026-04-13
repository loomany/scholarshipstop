/**
 * Some resource articles accidentally include the same "Quick Summary" callout twice
 * (styled box at the top + duplicate near the end). Keep the first block and drop
 * later copies with the same normalized text.
 *
 * Some long guides also include three different Quick Summary callouts (intro,
 * mid-article repeat, final). When there are three or more distinct blocks, we drop
 * the second in document order so the first (in-body) and last (final) remain.
 */

const MAX_BLOCK_CHARS = 48_000;

function normalizeFingerprint(s: string): string {
  return s
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findBalancedEnd(
  html: string,
  openIndex: number,
  tag: 'div' | 'blockquote'
): number | null {
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = openIndex;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const isClose = m[0].startsWith('</');
    if (isClose) {
      depth--;
      if (depth < 0) return null;
      if (depth === 0) return m.index + m[0].length;
    } else {
      depth++;
    }
  }
  return null;
}

/** Outermost <div> or <blockquote> before `anchor` whose balanced close is after `anchor`. */
function findEnclosingRange(
  html: string,
  anchor: number,
  tag: 'div' | 'blockquote'
): { start: number; end: number } | null {
  const lookback = Math.max(0, anchor - 4000);
  const slice = html.slice(lookback, anchor);
  const openRe = new RegExp(`<${tag}\\b`, 'gi');
  const positions: number[] = [];
  let om: RegExpExecArray | null;
  while ((om = openRe.exec(slice)) !== null) {
    positions.push(lookback + om.index);
  }
  for (let i = positions.length - 1; i >= 0; i--) {
    const start = positions[i]!;
    const end = findBalancedEnd(html, start, tag);
    if (
      end !== null &&
      end > anchor &&
      end - start <= MAX_BLOCK_CHARS &&
      /quick\s+summary/i.test(html.slice(start, end))
    ) {
      return { start, end };
    }
  }
  return null;
}

/** Section starting at <h2>/<h3> whose heading contains "Quick Summary", through following lists. */
function findHeadingQuickSummarySection(
  html: string,
  anchor: number
): { start: number; end: number } | null {
  const lookback = html.slice(0, anchor);
  const h2 = lookback.lastIndexOf('<h2');
  const h3 = lookback.lastIndexOf('<h3');
  const hStart = Math.max(h2, h3);
  if (hStart === -1) return null;

  const headingEnd = html.slice(hStart).search(/<\/h[23]\s*>/i);
  if (headingEnd === -1) return null;
  const headingHtml = html.slice(hStart, hStart + headingEnd + 10);
  if (!/quick\s+summary/i.test(headingHtml)) return null;

  const peer = /<h[23]\b[^>]*>/gi;
  let nextPeer = html.length;
  let hm: RegExpExecArray | null;
  while ((hm = peer.exec(html)) !== null) {
    if (hm.index > hStart) {
      nextPeer = hm.index;
      break;
    }
  }

  const end = nextPeer;
  if (end - hStart > MAX_BLOCK_CHARS) return null;
  return { start: hStart, end };
}

function findQuickSummaryBlockRange(
  html: string,
  matchIndex: number
): { start: number; end: number } | null {
  return (
    findEnclosingRange(html, matchIndex, 'div') ??
    findEnclosingRange(html, matchIndex, 'blockquote') ??
    findHeadingQuickSummarySection(html, matchIndex)
  );
}

function collectMergedQuickSummaryRanges(
  html: string
): { start: number; end: number }[] {
  const t = html.trim();
  if (!t || !/quick\s+summary/i.test(t)) return [];

  const idxs: number[] = [];
  const re = /quick\s+summary/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    idxs.push(m.index);
  }
  if (idxs.length === 0) return [];

  const ranges: { start: number; end: number }[] = [];
  for (const idx of idxs) {
    const r = findQuickSummaryBlockRange(t, idx);
    if (r) ranges.push(r);
  }
  if (ranges.length === 0) return [];

  ranges.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end && r.end > last.start) {
      last.start = Math.min(last.start, r.start);
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/** When there are 3+ distinct Quick Summary sections, remove the second in order. */
function removeSecondQuickSummaryAmongThreePlus(html: string): string {
  const t = html.trim();
  const merged = collectMergedQuickSummaryRanges(t);
  if (merged.length < 3) return html;
  const { start, end } = merged[1]!;
  return (t.slice(0, start) + t.slice(end)).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Removes duplicate Quick Summary callouts (same normalized HTML chunk) after the first.
 */
export function deduplicateQuickSummaryBlocksInHtml(html: string): string {
  const t = html.trim();
  if (!t || !/quick\s+summary/i.test(t)) return html;

  const merged = collectMergedQuickSummaryRanges(t);
  if (merged.length < 2) return removeSecondQuickSummaryAmongThreePlus(t);

  const seen = new Set<string>();
  const remove: { start: number; end: number }[] = [];
  for (const block of merged) {
    const chunk = t.slice(block.start, block.end);
    const fp = normalizeFingerprint(chunk);
    if (fp.length < 24) continue;
    if (seen.has(fp)) remove.push(block);
    else seen.add(fp);
  }

  let out = t;
  if (remove.length > 0) {
    remove.sort((a, b) => b.start - a.start);
    for (const { start, end } of remove) {
      out = out.slice(0, start) + out.slice(end);
    }
    out = out.replace(/\n{3,}/g, '\n\n').trim();
  }

  return removeSecondQuickSummaryAmongThreePlus(out);
}
