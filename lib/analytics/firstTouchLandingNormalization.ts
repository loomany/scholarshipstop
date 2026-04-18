/**
 * Normalize first-touch landing URLs for storage and SQL grouping: drop noisy query
 * params (gclid, fbclid, tracking, utm_content/term) while keeping core UTM tags.
 */

const PARAMS_TO_STRIP = new Set([
  'gclid',
  'fbclid',
  '_ga',
  '_gl',
  'utm_content',
  'utm_term'
]);

/** OAuth PKCE / Supabase email OTP — never store in analytics (privacy + smaller GROUP BY keys). */
const SENSITIVE_AUTH_PARAMS = new Set(['code', 'token_hash']);

export type FirstTouchUrlNormalization = {
  /** URL without strip-list params; keeps utm_source / utm_medium / utm_campaign when present. */
  normalizedUrl: string;
  /** gclid or fbclid from the original URL (gclid preferred if both). */
  clickId: string | null;
  /** Which param populated click_id. */
  clickIdParam: 'gclid' | 'fbclid' | null;
};

const MAX_URL_LEN = 4000;
const MAX_CLICK_ID_LEN = 2000;

/**
 * Parses `raw` as absolute URL, extracts click id, removes strip-list params, rebuilds URL.
 * On parse failure returns the trimmed raw string (truncated) with no click id.
 */
export function normalizeFirstTouchLandingUrl(raw: string): FirstTouchUrlNormalization {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    const g = u.searchParams.get('gclid')?.trim();
    const f = u.searchParams.get('fbclid')?.trim();
    let clickId: string | null = null;
    let clickIdParam: 'gclid' | 'fbclid' | null = null;
    if (g) {
      clickId = g.slice(0, MAX_CLICK_ID_LEN);
      clickIdParam = 'gclid';
    } else if (f) {
      clickId = f.slice(0, MAX_CLICK_ID_LEN);
      clickIdParam = 'fbclid';
    }

    for (const p of PARAMS_TO_STRIP) {
      u.searchParams.delete(p);
    }
    for (const p of SENSITIVE_AUTH_PARAMS) {
      u.searchParams.delete(p);
    }

    /**
     * Fragment is not sent to the server over HTTP; for SPA auth (e.g. Supabase implicit /
     * magic-link hash with access_token) it must not be persisted or sent to Telegram.
     */
    u.hash = '';

    let out = u.toString();
    if (out.length > MAX_URL_LEN) {
      out = out.slice(0, MAX_URL_LEN);
    }
    return { normalizedUrl: out, clickId, clickIdParam };
  } catch {
    return {
      normalizedUrl: trimmed.slice(0, MAX_URL_LEN),
      clickId: null,
      clickIdParam: null
    };
  }
}
