import { mergeUtmFromLandingUrl } from '@/lib/analytics/resolveTrafficChannel';

export type UserAgentSummary = {
  raw: string | null;
  short: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  os: string;
  browser: string;
  botName: string | null;
};

export type ExplainTrafficInput = {
  landingUrl: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  userAgentSummary: Pick<UserAgentSummary, 'botName' | 'short' | 'deviceType'>;
};

function firstIpv4FromForwardedFor(xff: string): string | null {
  const first = xff.split(',')[0]?.trim();
  if (!first) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(first)) return first;
  return null;
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  const pick = (name: string) => headers.get(name)?.trim();
  const cf = pick('cf-connecting-ip');
  if (cf) return cf;
  const realIp = pick('x-real-ip');
  if (realIp) return realIp;
  const xff = pick('x-forwarded-for');
  if (xff) {
    const ip = firstIpv4FromForwardedFor(xff);
    if (ip) return ip;
    const raw = xff.split(',')[0]?.trim();
    if (raw) return raw;
  }
  const trueClient = pick('true-client-ip');
  if (trueClient) return trueClient;
  return null;
}

export function getCountryFromHeaders(headers: Headers): string | null {
  const pick = (name: string) => headers.get(name)?.trim();
  const cf = pick('cf-ipcountry');
  if (cf && cf.toUpperCase() !== 'XX' && cf !== 'T1') return cf.toUpperCase();
  const vercel = pick('x-vercel-ip-country');
  if (vercel) return vercel.toUpperCase();
  const code = pick('x-country-code');
  if (code) return code.toUpperCase();
  return null;
}

export function maskIp(ip: string | null | undefined): string | null {
  const s = (ip ?? '').trim();
  if (!s) return null;
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }
  if (s.includes(':')) {
    const parts = s.split(':').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}:xxxx`;
    if (parts.length === 1) return `${parts[0]}:xxxx`;
  }
  return null;
}

function matchChromeVersion(ua: string): string | null {
  const m = ua.match(/Chrome\/([\d.]+)/i);
  return m?.[1]?.split('.')[0] ?? null;
}

function matchSafariVersion(ua: string): string | null {
  const m = ua.match(/Version\/([\d.]+)/i);
  return m?.[1] ?? null;
}

function matchFirefoxVersion(ua: string): string | null {
  const m = ua.match(/Firefox\/([\d.]+)/i);
  return m?.[1] ?? null;
}

function detectOs(ua: string): string {
  if (/CrOS/i.test(ua)) return 'ChromeOS';
  if (/iPad/i.test(ua)) return 'iPadOS';
  if (/iPhone/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'unknown';
}

function detectBotName(ua: string): string | null {
  const u = ua;
  if (/TelegramBot/i.test(u)) return 'TelegramBot';
  if (/meta-externalagent/i.test(u)) return 'Meta external agent';
  if (/pageburst/i.test(u)) return 'pageburst';
  if (/AdsBot-Google|Google-Adwords-Instant/i.test(u)) return 'AdsBot-Google';
  if (/Googlebot/i.test(u)) return 'Googlebot';
  if (/bingbot/i.test(u)) return 'Bingbot';
  if (/AhrefsBot/i.test(u)) return 'AhrefsBot';
  if (/SemrushBot/i.test(u)) return 'SemrushBot';
  return null;
}

function detectBrowserLabel(ua: string): string {
  if (/Snapchat/i.test(ua)) return 'Snapchat in-app';
  if (/Instagram/i.test(ua)) return 'Instagram in-app';
  if (/FacebookExternalHit|FBAN|FBAV/i.test(ua)) return 'Facebook in-app';
  if (/Edg\/([\d.]+)/i.test(ua)) {
    const v = ua.match(/Edg\/([\d.]+)/i)?.[1]?.split('.')[0];
    return v ? `Edge ${v}` : 'Edge';
  }
  if (/CriOS\/([\d.]+)/i.test(ua)) {
    const v = ua.match(/CriOS\/([\d.]+)/i)?.[1]?.split('.')[0];
    return v ? `Chrome iOS ${v}` : 'Chrome iOS';
  }
  if (/GSA\//i.test(ua)) return 'Google App';
  if (/Firefox\//i.test(ua)) {
    const fv = matchFirefoxVersion(ua);
    return fv ? `Firefox ${fv}` : 'Firefox';
  }
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    const cv = matchChromeVersion(ua);
    return cv ? `Chrome ${cv}` : 'Chrome';
  }
  if (/Safari\//i.test(ua) && /Version\//i.test(ua)) {
    const sv = matchSafariVersion(ua);
    return sv ? `Safari ${sv}` : 'Safari';
  }
  return 'unknown';
}

export function summarizeUserAgent(ua: string | null | undefined): UserAgentSummary {
  const raw = ua?.trim() ? ua.trim().slice(0, 800) : null;
  if (!raw) {
    return {
      raw: null,
      short: 'unknown',
      deviceType: 'unknown',
      os: 'unknown',
      browser: 'unknown',
      botName: null
    };
  }

  const botName = detectBotName(raw);
  if (botName) {
    return {
      raw,
      short: botName,
      deviceType: 'bot',
      os: 'unknown',
      browser: botName,
      botName
    };
  }

  const os = detectOs(raw);
  const browser = detectBrowserLabel(raw);
  let deviceType: UserAgentSummary['deviceType'] = 'unknown';
  if (/iPad/i.test(raw)) deviceType = 'tablet';
  else if (/iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(raw)) deviceType = 'mobile';
  else if (/Android/i.test(raw)) deviceType = 'mobile';
  else if (/CrOS|Windows NT|Mac OS X|Macintosh|Linux|X11/i.test(raw)) deviceType = 'desktop';

  const short = `${browser} · ${os}`.trim();
  return { raw, short, deviceType, os, browser, botName: null };
}

function hasGoogleAdsClickParamsInLanding(landingUrl: string): boolean {
  try {
    const u = new URL(landingUrl);
    return (
      u.searchParams.has('gclid') ||
      u.searchParams.has('gbraid') ||
      u.searchParams.has('wbraid')
    );
  } catch {
    return false;
  }
}

function referrerDisplayHost(referrer: string): string | null {
  try {
    return new URL(referrer.trim()).hostname || null;
  } catch {
    return null;
  }
}

export function explainTrafficReason(input: ExplainTrafficInput): string {
  const { landingUrl, referrer, utm_source, utm_medium, utm_campaign, userAgentSummary } = input;
  const merged = mergeUtmFromLandingUrl(landingUrl, {
    utm_source,
    utm_medium,
    utm_campaign
  });

  if (hasGoogleAdsClickParamsInLanding(landingUrl)) {
    return 'Google Ads click id detected';
  }

  if (merged.utm_source.trim() || merged.utm_medium.trim()) {
    return 'UTM attribution detected';
  }

  const ref = referrer.trim();
  if (ref) {
    const host = referrerDisplayHost(ref);
    if (host) return `Referrer detected: ${host}`;
    return 'Referrer detected';
  }

  if (userAgentSummary.botName) {
    return 'Known bot/preview user-agent';
  }

  if (!ref && !merged.utm_source.trim() && !merged.utm_medium.trim()) {
    return 'No referrer or UTM; browser-like direct/opened link';
  }

  return 'Fallback traffic classification';
}
