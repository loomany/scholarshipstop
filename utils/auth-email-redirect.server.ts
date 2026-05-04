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

function normalizeSiteOrigin(url: string): string {
  const s = url.replace(/\/+$/, '');
  return s.startsWith('http') ? s : `https://${s}`;
}

/** True for localhost / loopback hosts — not used as canonical links in password-reset emails. */
function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    const h = hostname.toLowerCase();
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '[::1]' ||
      h.endsWith('.local')
    );
  } catch {
    return true;
  }
}

/**
 * Base URL for links inside outbound transactional email (Resend).
 * Prefer `NEXT_PUBLIC_SITE_URL` / `SITE_URL` when they point at a public host — avoids
 * `localhost` in real inboxes when verification is triggered from local dev or a request
 * whose `Host` header is loopback. Same idea as {@link getServerAuthResetPasswordUrl}.
 */
export function getServerTransactionalEmailSiteOrigin(): string {
  const envCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.SITE_URL?.trim()
  ].filter((s): s is string => Boolean(s));

  for (const raw of envCandidates) {
    const origin = normalizeSiteOrigin(raw);
    if (!isLocalDevelopmentOrigin(origin)) {
      return origin;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return SITE_ORIGIN_FALLBACK;
  }

  return getServerAuthSiteOrigin();
}

/**
 * Return URL for Supabase `redirectTo` on password reset.
 * When `NEXT_PUBLIC_SITE_URL` is set to your public domain (e.g. production), reset links in
 * emails use that host even if the forgot-password form was submitted from local dev — avoiding
 * localhost links in real inboxes. Local-only URLs still fall back to the request host.
 */
export function getServerAuthResetPasswordUrl(): string {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envSite) {
    const origin = normalizeSiteOrigin(envSite);
    if (!isLocalDevelopmentOrigin(origin)) {
      return `${origin}/auth/reset_password`;
    }
  }
  return `${getServerAuthSiteOrigin()}/auth/reset_password`;
}
