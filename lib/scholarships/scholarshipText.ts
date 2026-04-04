function isLikelySourceCtaLine(line: string): boolean {
  const low = line.toLowerCase();
  if (low.length < 12) return false;
  return (
    low.includes('application is ready') ||
    low.includes('ready to be submitted') ||
    low.includes('mark as started') ||
    low.includes('mark as submitted') ||
    (low.includes('sign up for') && low.includes('update'))
  );
}

/** Drop junk lines from stored requirements (legacy rows + parser artifacts). */
export function sanitizeRequirementLines(
  text: string | null | undefined
): string[] {
  if (!text?.trim()) return [];
  const junk = new Set([
    '|',
    '.',
    'not',
    'a',
    'A',
    '—',
    '-',
    '•',
    '·',
    '▪'
  ]);
  const out: string[] = [];
  for (const line of text.replace(/\r/g, '\n').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (junk.has(s)) continue;
    if (s.length <= 1 && /[a-zA-Z]/.test(s) && !/\d/.test(s)) continue;
    if (/^[\s|.\-–—•·▪]+$/.test(s)) continue;
    if (isLikelySourceCtaLine(s)) continue;
    out.push(s);
  }
  return out;
}
