import { resolveTrafficChannel } from '@/lib/analytics/resolveTrafficChannel';

type DeriveAttributionInput = {
  landingUrl: string;
  normalizedLandingUrl: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  clickId: string | null;
  clickIdParam: string | null;
};

function hostFromUrl(raw: string): string | null {
  try {
    const host = new URL(raw).hostname.trim().toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function mergedUtmFromLandingUrl(
  landingUrl: string,
  body: { utm_source: string; utm_medium: string; utm_campaign: string }
): { source: string; medium: string; campaign: string } {
  let source = body.utm_source.trim();
  let medium = body.utm_medium.trim();
  let campaign = body.utm_campaign.trim();
  try {
    const u = new URL(landingUrl);
    if (!source) source = u.searchParams.get('utm_source')?.trim() ?? '';
    if (!medium) medium = u.searchParams.get('utm_medium')?.trim() ?? '';
    if (!campaign) campaign = u.searchParams.get('utm_campaign')?.trim() ?? '';
  } catch {
    // Invalid URL is validated upstream in route; keep fallback values.
  }
  return { source, medium, campaign };
}

function searchEngineSourceFromReferrer(referrer: string): string | null {
  const host = hostFromUrl(referrer);
  if (!host) return null;
  if (host.includes('google.')) return 'google';
  if (host.includes('bing.')) return 'bing';
  if (host.includes('duckduckgo.')) return 'duckduckgo';
  if (host.includes('yahoo.')) return 'yahoo';
  if (host.includes('yandex.')) return 'yandex';
  return null;
}

function deriveSourceMedium(args: {
  trafficChannel: ReturnType<typeof resolveTrafficChannel>;
  source: string;
  medium: string;
  referrer: string;
  clickIdParam: string | null;
}): { source: string; medium: string } {
  const utmSource = args.source.trim();
  const utmMedium = args.medium.trim();
  if (utmSource || utmMedium) {
    return {
      source: utmSource || 'unknown',
      medium: utmMedium || (args.trafficChannel.includes('paid') ? 'paid' : 'unknown')
    };
  }

  if (args.clickIdParam === 'gclid' || args.clickIdParam === 'wbraid' || args.clickIdParam === 'gbraid') {
    return { source: 'google', medium: 'cpc' };
  }
  if (args.clickIdParam === 'fbclid') {
    return { source: 'facebook', medium: 'paid_social' };
  }
  if (args.clickIdParam === 'ttclid') {
    return { source: 'tiktok', medium: 'paid_social' };
  }

  const searchSource = searchEngineSourceFromReferrer(args.referrer);
  if (searchSource) return { source: searchSource, medium: 'organic' };

  const refHost = hostFromUrl(args.referrer);
  if (refHost) return { source: refHost, medium: 'referral' };

  return { source: 'direct', medium: 'none' };
}

function landingPathFromUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return u.pathname || '/';
  } catch {
    return '/';
  }
}

export type DerivedAttribution = {
  source: string;
  medium: string;
  campaign: string | null;
  referrer: string | null;
  landingPath: string;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
};

export function deriveAttribution(input: DeriveAttributionInput): DerivedAttribution {
  const merged = mergedUtmFromLandingUrl(input.landingUrl, {
    utm_source: input.utm_source,
    utm_medium: input.utm_medium,
    utm_campaign: input.utm_campaign
  });
  const trafficChannel = resolveTrafficChannel({
    landingUrl: input.landingUrl,
    referrer: input.referrer,
    utm_source: merged.source,
    utm_medium: merged.medium,
    utm_campaign: merged.campaign
  });
  const srcMed = deriveSourceMedium({
    trafficChannel,
    source: merged.source,
    medium: merged.medium,
    referrer: input.referrer,
    clickIdParam: input.clickIdParam
  });

  const clickId = input.clickId?.trim() || null;
  const clickKey = input.clickIdParam?.trim().toLowerCase() || null;
  const gclid =
    clickKey === 'gclid' || clickKey === 'wbraid' || clickKey === 'gbraid' ? clickId : null;
  const fbclid = clickKey === 'fbclid' ? clickId : null;
  const ttclid = clickKey === 'ttclid' ? clickId : null;

  return {
    source: srcMed.source.slice(0, 120),
    medium: srcMed.medium.slice(0, 120),
    campaign: merged.campaign ? merged.campaign.slice(0, 300) : null,
    referrer: input.referrer ? input.referrer.slice(0, 4000) : null,
    landingPath: landingPathFromUrl(input.normalizedLandingUrl).slice(0, 2048),
    gclid,
    fbclid,
    ttclid
  };
}
