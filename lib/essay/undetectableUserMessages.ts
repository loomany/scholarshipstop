/** Minimum character count for Undetectable Humanization API (matches server `undetectableHumanize`). */
export const UNDETECTABLE_MIN_CONTENT_CHARS = 50;

function responseBodyLooksLikeHtml(text: string): boolean {
  const s = text.trimStart();
  return (
    /^<!doctype\s+html/i.test(s) ||
    /^<html[\s>]/i.test(s) ||
    (s.startsWith('<!--') && /<html/i.test(s)) ||
    (s.startsWith('<') && s.length > 80 && /<\/html>/i.test(s))
  );
}

/** Normalizes API output for toasts; avoids showing raw HTML from CDN errors (e.g. Cloudflare 5xx). */
export function friendlyUndetectableError(raw: string): string {
  const trimmed = raw.trim();
  if (responseBodyLooksLikeHtml(trimmed)) {
    return 'Undetectable.AI returned HTML instead of data — often a temporary outage, geo-block, or network filter. Try again later or from another network or VPN.';
  }
  const t = trimmed.toLowerCase();
  if (t.includes('insufficient credit')) {
    return 'Your Undetectable.AI account is out of credits. Add credits in the Undetectable.AI dashboard.';
  }
  return trimmed.length > 600 ? `${trimmed.slice(0, 580)}…` : trimmed;
}
