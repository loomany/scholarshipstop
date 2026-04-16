const FALLBACK = 'https://scholarshiptop.com';

/**
 * Canonical site origin for transactional emails when there is no Request (cron, CLI).
 * Uses NEXT_PUBLIC_SITE_URL or SITE_URL; safe for scripts outside Next.js.
 */
export function getEmailSiteOrigin(): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (site) {
    const s = site.replace(/\/+$/, '');
    return s.startsWith('http') ? s : `https://${s}`;
  }
  return FALLBACK;
}
