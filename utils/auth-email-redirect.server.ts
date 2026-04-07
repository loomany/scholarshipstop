import 'server-only';

import { headers } from 'next/headers';

const SITE_ORIGIN_FALLBACK = 'https://scholarshiptop.com';

/**
 * Origin for auth email links and PKCE: must match the host the user used when the flow
 * started (cookies are set on that origin). Differs from marketing URLs — do not hardcode prod
 * here if the request is localhost.
 */
export function getServerAuthSiteOrigin(): string {
  const h = headers();
  const rawHost = (h.get('x-forwarded-host') ?? h.get('host') ?? '')
    .split(',')[0]
    .trim();
  const forwardedProto = (h.get('x-forwarded-proto') ?? '')
    .split(',')[0]
    .trim();

  if (rawHost && !/^0\.0\.0\.0(?::|$)/.test(rawHost)) {
    const hostLower = rawHost.toLowerCase();
    const looksLocal =
      hostLower.includes('localhost') ||
      hostLower.startsWith('127.') ||
      hostLower.includes('::1');
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
    const proto =
      forwardedProto ||
      (looksLocal &&
      (envUrl.startsWith('https://localhost') ||
        envUrl.startsWith('https://127.'))
        ? 'https'
        : looksLocal
          ? 'http'
          : 'https');
    const base = `${proto}://${rawHost}`.replace(/\/+$/, '');
    return base.startsWith('http') ? base : `https://${base}`;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const s = site.replace(/\/+$/, '');
    const normalized = s.startsWith('http') ? s : `https://${s}`;
    if (
      process.env.NODE_ENV === 'production' &&
      /localhost|127\.0\.0\.1|\[::1\]/i.test(normalized)
    ) {
      return SITE_ORIGIN_FALLBACK;
    }
    return normalized;
  }

  return SITE_ORIGIN_FALLBACK;
}

export function getServerAuthCallbackUrl(): string {
  return `${getServerAuthSiteOrigin()}/auth/callback`;
}

export function getServerAuthResetPasswordUrl(): string {
  return `${getServerAuthSiteOrigin()}/auth/reset_password`;
}
