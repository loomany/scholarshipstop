/** Public Custom GPT URL (sharing link — safe to bundle). Override with `NEXT_PUBLIC_SCHOLARSHIPTOP_NAVIGATOR_URL` if needed. */
export const SCHOLARSHIPTOP_NAVIGATOR_DEFAULT_HREF =
  'https://chatgpt.com/g/g-69f66bca74848191ac57327e99706e00-scholarshiptop-navigator';

/**
 * Href for the ScholarshipTop Navigator GPT. Uses env when it is set to a valid `http:`/`https:`
 * URL; otherwise falls back so local dev works without `.env.local`.
 */
export function getScholarshipTopNavigatorHref(): string {
  const raw = process.env.NEXT_PUBLIC_SCHOLARSHIPTOP_NAVIGATOR_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) return raw;
  return SCHOLARSHIPTOP_NAVIGATOR_DEFAULT_HREF;
}
