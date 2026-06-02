/** US English catalog: MM.DD.YY; other locales: DD.MM.YY. */
export function usesUsScholarshipDeadlineDateOrder(
  locale?: string | null
): boolean {
  const l = (locale ?? 'en').trim().toLowerCase();
  return l === 'en' || l === 'en-us';
}

/** Compact scholarship deadline date (UTC calendar day). */
export function formatScholarshipDeadlineCompactDate(
  d: Date,
  locale?: string | null
): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear() % 100).padStart(2, '0');
  return usesUsScholarshipDeadlineDateOrder(locale)
    ? `${month}.${day}.${year}`
    : `${day}.${month}.${year}`;
}
