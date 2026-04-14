/**
 * Classifies first-touch visits: Google Ads vs organic search vs other.
 * Prefers URL signals (gclid, etc.) over empty client UTM when the landing URL carries params.
 */

export type TrafficChannel =
  | 'google_ads'
  | 'organic_search'
  | 'other_paid'
  | 'referral'
  | 'direct_unknown';

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

/** Search / discover surfaces that imply organic-style discovery (not paid click ids). */
function isSearchEngineReferrer(referrer: string): boolean {
  const r = referrer.toLowerCase();
  return (
    r.includes('google.com') ||
    r.includes('bing.com') ||
    r.includes('duckduckgo.com') ||
    r.includes('yahoo.com') ||
    r.includes('yandex.ru') ||
    r.includes('yandex.com') ||
    r.includes('yandex.by') ||
    r.includes('yandex.kz') ||
    r.includes('syndicatedsearch.goog')
  );
}

const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'cpa', 'cpm', 'pmax']);

function isGoogleAdsSource(source: string): boolean {
  const s = source.toLowerCase();
  return (
    s.includes('google') ||
    s === 'googleads' ||
    s === 'googleadservices' ||
    s.includes('google_reklama')
  );
}

function mergeUtmFromLandingUrl(
  landingUrl: string,
  body: { utm_source: string; utm_medium: string; utm_campaign: string }
): { utm_source: string; utm_medium: string; utm_campaign: string } {
  let { utm_source, utm_medium, utm_campaign } = body;
  try {
    const u = new URL(landingUrl);
    const qs = (k: string) => u.searchParams.get(k)?.trim() ?? '';
    if (!utm_source) utm_source = qs('utm_source');
    if (!utm_medium) utm_medium = qs('utm_medium');
    if (!utm_campaign) utm_campaign = qs('utm_campaign');
  } catch {
    /* invalid landing URL handled upstream */
  }
  return { utm_source, utm_medium, utm_campaign };
}

export type ResolveTrafficChannelInput = {
  landingUrl: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

/**
 * Order: paid Google (URL + UTM) → other paid UTM → organic (search referrer) → referral → direct.
 */
export function resolveTrafficChannel(raw: ResolveTrafficChannelInput): TrafficChannel {
  const landingUrl = raw.landingUrl.trim();
  const referrer = raw.referrer.trim();
  const merged = mergeUtmFromLandingUrl(landingUrl, {
    utm_source: raw.utm_source.trim(),
    utm_medium: raw.utm_medium.trim(),
    utm_campaign: raw.utm_campaign.trim()
  });

  let url: URL | null = null;
  try {
    url = new URL(landingUrl);
  } catch {
    return 'direct_unknown';
  }

  const has = (param: string) => url!.searchParams.has(param);
  const get = (param: string) => url!.searchParams.get(param)?.trim() ?? '';

  // 1–2: Google Ads click / Ads URL params
  if (has('gclid') || has('wbraid') || has('gbraid')) {
    return 'google_ads';
  }
  if (has('gad_campaignid') || has('gad_source')) {
    return 'google_ads';
  }

  const mediumLower = merged.utm_medium.toLowerCase();
  const sourceLower = merged.utm_source.toLowerCase();
  const paidMedium =
    PAID_MEDIUMS.has(mediumLower) ||
    PAID_MEDIUMS.has(get('utm_medium').toLowerCase());

  // 3: UTM: paid + Google source
  if (paidMedium && isGoogleAdsSource(merged.utm_source || get('utm_source'))) {
    return 'google_ads';
  }

  // 4: Other paid (Meta, TikTok ads, etc.) — not organic
  const utmSrc = (merged.utm_source || get('utm_source')).trim();
  if (paidMedium && utmSrc && !isGoogleAdsSource(utmSrc)) {
    return 'other_paid';
  }

  // 5: Organic search (referrer from a search / discover surface)
  if (referrer && isSearchEngineReferrer(referrer)) {
    return 'organic_search';
  }

  // 6: Referral (external site, not search)
  if (referrer && landingUrl && !isSameSiteLanding(landingUrl, referrer)) {
    return 'referral';
  }

  return 'direct_unknown';
}

export const TRAFFIC_CHANNEL_LABELS: Record<TrafficChannel, string> = {
  google_ads: 'Google Ads (paid)',
  organic_search: 'Organic search',
  other_paid: 'Paid (non-Google)',
  referral: 'Referral',
  direct_unknown: 'Direct / unknown'
};

export function formatTrafficChannelLabel(channel: TrafficChannel | null | undefined): string {
  if (!channel || !(channel in TRAFFIC_CHANNEL_LABELS)) {
    return TRAFFIC_CHANNEL_LABELS.direct_unknown;
  }
  return TRAFFIC_CHANNEL_LABELS[channel as TrafficChannel];
}

/** Stored row → human label; recomputes from URL/UTM when `traffic_channel` is null (legacy rows). */
export function labelForVisitorRow(row: {
  traffic_channel?: string | null;
  landing_url: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}): string {
  const raw = row.traffic_channel?.trim();
  if (
    raw === 'google_ads' ||
    raw === 'organic_search' ||
    raw === 'other_paid' ||
    raw === 'referral' ||
    raw === 'direct_unknown'
  ) {
    return formatTrafficChannelLabel(raw);
  }
  return formatTrafficChannelLabel(
    resolveTrafficChannel({
      landingUrl: row.landing_url,
      referrer: row.referrer ?? '',
      utm_source: row.utm_source ?? '',
      utm_medium: row.utm_medium ?? '',
      utm_campaign: row.utm_campaign ?? ''
    })
  );
}
