/**
 * Best-effort removal of known third-party application UI copy from HTML
 * before sanitization. Used only when rich HTML is shown as a last resort.
 */
export function stripScholarshipSourceHtmlNoise(html: string): string {
  if (!html) return html;
  let s = html;
  const blocks: RegExp[] = [
    /[\s\S]{0,800}?application\s+is\s+ready\s+to\s+be\s+submitted[\s\S]{0,800}?/gi,
    /[\s\S]{0,600}?mark\s+as\s+started[\s\S]{0,600}?/gi,
    /[\s\S]{0,600}?mark\s+as\s+submitted[\s\S]{0,600}?/gi,
    /[\s\S]{0,800}?sign\s+up\s+for\s+scholarship\s+updates[\s\S]{0,800}?/gi,
    /[\s\S]{0,800}?this\s+application\s+is\s+ready[\s\S]{0,800}?/gi
  ];
  for (const re of blocks) {
    s = s.replace(re, '');
  }
  return s;
}
