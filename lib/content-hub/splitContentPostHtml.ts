/**
 * Split HTML at ~ratio through, on the first closing block tag after the target index.
 */
export function splitContentPostHtmlAtRatio(
  html: string,
  ratio: number,
  minTotalLength: number
): { before: string; after: string } | null {
  const trimmed = html.trim();
  if (trimmed.length < minTotalLength) return null;

  const targetIdx = Math.floor(trimmed.length * ratio);
  const tail = trimmed.slice(targetIdx);
  const blockClose = tail.match(/<\/(p|h2|h3|ul|ol|blockquote|div)>/i);
  if (!blockClose || blockClose.index === undefined) return null;

  const splitAt = targetIdx + blockClose.index + blockClose[0].length;
  const before = trimmed.slice(0, splitAt).trim();
  const after = trimmed.slice(splitAt).trim();
  if (!before || after.length < 80) return null;

  return { before, after };
}

const MIN_AFTER_PRIMARY = 120;
const MIN_AFTER_MID = 80;

/**
 * Prefer split after first in-body section title (h2) + first paragraph — typical editorial intro.
 * Else after second </p>. Else ratio ~20%.
 */
export function splitForPrimaryCtaInsertion(
  html: string
): { before: string; after: string } | null {
  const t = html.trim();
  if (t.length < 500) return null;

  const h2Rx = /<\/h2\s*>/i;
  const h2Match = h2Rx.exec(t);
  if (h2Match) {
    const afterH2 = h2Match.index + h2Match[0].length;
    const tail = t.slice(afterH2);
    const pClose = tail.match(/<\/p\s*>/i);
    if (pClose && pClose.index !== undefined) {
      const splitAt = afterH2 + pClose.index + pClose[0].length;
      const before = t.slice(0, splitAt).trim();
      const after = t.slice(splitAt).trim();
      if (before && after.length >= MIN_AFTER_PRIMARY) {
        return { before, after };
      }
    }
  }

  const pGlobal = /<\/p\s*>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = pGlobal.exec(t)) !== null) {
    count += 1;
    if (count === 2) {
      const splitAt = m.index + m[0].length;
      const before = t.slice(0, splitAt).trim();
      const after = t.slice(splitAt).trim();
      if (after.length >= MIN_AFTER_PRIMARY) {
        return { before, after };
      }
      break;
    }
  }

  return splitContentPostHtmlAtRatio(t, 0.2, 500);
}

/** Second split inside remainder for mid-article soft CTA. */
export function splitForMidCtaInRemainder(
  html: string
): { before: string; after: string } | null {
  return splitContentPostHtmlAtRatio(html.trim(), 0.38, 450);
}
