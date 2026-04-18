/**
 * Classifies first-touch visits: Google Ads vs organic search vs other.
 * Prefers URL signals (gclid, etc.) over empty client UTM when the landing URL carries params.
 *
 * Paid acquisition: normal `utm_medium` (cpc, paid, …) **or** known ad `utm_source` alone
 * (e.g. `utm_source=tiktok` with no medium) — matches how marketing links are built.
 */

export type TrafficChannel =
  | 'google_ads'
  | 'facebook_paid'
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

/** Meta / Instagram placements: `fb`, `facebook`, `ig`, `instagram`, … */
function isMetaUtmSource(utmSource: string): boolean {
  const s = utmSource.toLowerCase();
  return (
    s === 'fb' ||
    s === 'facebook' ||
    s.startsWith('facebook_') ||
    s === 'ig' ||
    s === 'instagram'
  );
}

/** Meta outbound / Ads: `fbclid`, or UTM source like `fb`, `facebook`, `ig`. */
function isFacebookPaidSignal(url: URL, utmSource: string): boolean {
  if (url.searchParams.has('fbclid')) return true;
  return isMetaUtmSource(utmSource);
}

/**
 * When `utm_medium` is omitted but the source is a known paid platform (same list as tagged ad links).
 */
function isKnownPaidAcquisitionUtmSource(utmSource: string): boolean {
  const s = utmSource.trim();
  if (!s) return false;
  if (isGoogleAdsSource(s)) return true;
  if (isMetaUtmSource(s)) return true;
  const lower = s.toLowerCase();
  if (lower === 'tiktok' || lower.startsWith('tiktok_')) return true;
  if (lower === 'reddit' || lower.startsWith('reddit_')) return true;
  return false;
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
  const paidMedium =
    PAID_MEDIUMS.has(mediumLower) ||
    PAID_MEDIUMS.has(get('utm_medium').toLowerCase());

  const utmSrc = (merged.utm_source || get('utm_source')).trim();
  const effectivePaid =
    paidMedium || (!!utmSrc && isKnownPaidAcquisitionUtmSource(utmSrc));

  // 3: UTM: paid + Google source
  if (effectivePaid && isGoogleAdsSource(utmSrc)) {
    return 'google_ads';
  }

  // 4: Paid non-Google — Facebook / Meta vs other ad networks
  if (effectivePaid && !isGoogleAdsSource(utmSrc)) {
    if (isFacebookPaidSignal(url, utmSrc)) {
      return 'facebook_paid';
    }
    if (utmSrc) {
      return 'other_paid';
    }
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
  facebook_paid: 'Facebook',
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

/**
 * TikTok / Reddit: show as own lines in admin Telegram traffic (not merged into
 * "Paid (non-Google)" / "Referral"). Uses merged UTM from landing URL + referrer.
 */
export function getSocialNetworkFirstTouchLabel(row: {
  landing_url: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}): 'TIKTOK' | 'REDDIT' | null {
  const merged = mergeUtmFromLandingUrl(row.landing_url, {
    utm_source: row.utm_source ?? '',
    utm_medium: row.utm_medium ?? '',
    utm_campaign: row.utm_campaign ?? ''
  });
  const utm = merged.utm_source.toLowerCase();
  const ref = (row.referrer ?? '').toLowerCase();
  if (utm === 'tiktok' || utm.startsWith('tiktok_') || ref.includes('tiktok.com')) {
    return 'TIKTOK';
  }
  if (utm === 'reddit' || utm.startsWith('reddit_') || ref.includes('reddit.com')) {
    return 'REDDIT';
  }
  return null;
}

/** Instant visitor alert: TIKTOK/REDDIT when applicable, else standard channel label. */
export function formatFirstTouchVisitorAlertLabel(args: {
  traffic_channel: TrafficChannel;
  landing_url: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}): string {
  const social = getSocialNetworkFirstTouchLabel({
    landing_url: args.landing_url,
    referrer: args.referrer,
    utm_source: args.utm_source,
    utm_medium: args.utm_medium,
    utm_campaign: args.utm_campaign
  });
  if (social) return social;
  return formatTrafficChannelLabel(args.traffic_channel);
}

/** Stored row → human label; recomputes from URL/UTM when `traffic_channel` is null (legacy rows). */
/**
 * Bucket for first-touch Telegram admin prefs (must match `TRAFFIC_NOTIFY_SOURCE_KEYS`).
 */
export type FirstTouchNotifySourceKey =
  | TrafficChannel
  | 'tiktok'
  | 'reddit';

/** Maps a visit to one key for per-source admin notification toggles. */
export function getFirstTouchNotifySourceKey(args: {
  traffic_channel: TrafficChannel;
  landing_url: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}): FirstTouchNotifySourceKey {
  const social = getSocialNetworkFirstTouchLabel({
    landing_url: args.landing_url,
    referrer: args.referrer,
    utm_source: args.utm_source,
    utm_medium: args.utm_medium,
    utm_campaign: args.utm_campaign
  });
  if (social === 'TIKTOK') return 'tiktok';
  if (social === 'REDDIT') return 'reddit';
  return args.traffic_channel;
}

export function labelForVisitorRow(row: {
  traffic_channel?: string | null;
  landing_url: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}): string {
  const social = getSocialNetworkFirstTouchLabel(row);
  if (social) return social;

  const resolved = resolveTrafficChannel({
    landingUrl: row.landing_url,
    referrer: row.referrer ?? '',
    utm_source: row.utm_source ?? '',
    utm_medium: row.utm_medium ?? '',
    utm_campaign: row.utm_campaign ?? ''
  });
  const raw = row.traffic_channel?.trim();
  if (raw === 'other_paid' && resolved === 'facebook_paid') {
    return formatTrafficChannelLabel('facebook_paid');
  }
  if (
    raw === 'google_ads' ||
    raw === 'facebook_paid' ||
    raw === 'organic_search' ||
    raw === 'other_paid' ||
    raw === 'referral' ||
    raw === 'direct_unknown'
  ) {
    return formatTrafficChannelLabel(raw);
  }
  return formatTrafficChannelLabel(resolved);
}
