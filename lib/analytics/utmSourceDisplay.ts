/**
 * Maps raw `utm_source` / `utm_content` to the label shown in admin Telegram alerts.
 * When `utm_source` is empty, infers from `referrer` + `landingUrl` (SEO vs direct vs referral).
 * Unknown `utm_source` values use UPPERCASE (see product spec).
 */

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function isSameSiteLanding(landingUrl: string, referrer: string): boolean {
  try {
    const land = new URL(landingUrl);
    const ref = new URL(referrer);
    return normalizeHost(land.hostname) === normalizeHost(ref.hostname);
  } catch {
    return false;
  }
}

/** Organic search referrers (substring match on full referrer URL). */
function isSearchEngineReferrer(referrer: string): boolean {
  const r = referrer.toLowerCase();
  return (
    r.includes('google.com') ||
    r.includes('bing.com') ||
    r.includes('yandex.ru') ||
    r.includes('yandex.com') ||
    r.includes('yandex.by') ||
    r.includes('yandex.kz')
  );
}

function sourceFromReferrerOnly(referrer: string, landingUrl: string): string {
  const ref = referrer.trim();
  if (!ref) {
    return 'Direct / Organic';
  }
  if (landingUrl.trim() && isSameSiteLanding(landingUrl, ref)) {
    return 'Direct / Organic';
  }
  if (isSearchEngineReferrer(ref)) {
    return 'SEO / Search';
  }
  return 'Referral';
}

export function formatVisitorSourceDisplay(
  rawUtmSource: string,
  rawUtmContent?: string,
  context?: { referrer?: string; landingUrl?: string }
): string {
  const source = rawUtmSource.trim();
  const content = (rawUtmContent ?? '').trim();

  if (source) {
    const lower = source.toLowerCase();
    /** Meta (Facebook/Instagram) paid — optional creative id in utm_content */
    if (lower === 'facebook' || lower === 'instagram') {
      const suffix = content ? ` (${content})` : '';
      return `Meta Ads${suffix}`;
    }
    if (lower === 'tiktok') return 'TikTok Ads';
    if (lower === 'reddit') return 'Reddit Ads';
    if (lower === 'google') return 'Google Ads';
    return source.toUpperCase();
  }

  return sourceFromReferrerOnly(
    context?.referrer ?? '',
    context?.landingUrl ?? ''
  );
}
