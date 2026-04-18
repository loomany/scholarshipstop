import type { Tables } from '@/types_db';

type Price = Tables<'prices'>;

/** Used on the server when `NEXT_PUBLIC_SITE_URL` is missing (Railway, misconfigured builds). */
const SITE_ORIGIN_FALLBACK = 'https://scholarshiptop.com';

export const getURL = (path: string = '') => {
  path = path.replace(/^\/+/, '');

  const base =
    typeof window !== 'undefined'
      ? window.location.origin.replace(/\/+$/, '')
      : (() => {
          const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
          return site ? site.replace(/\/+$/, '') : SITE_ORIGIN_FALLBACK;
        })();

  const url = base.startsWith('http') ? base : `https://${base}`;
  return path ? `${url}/${path}` : url;
};

/**
 * OAuth / magic-link `redirectTo` for URLs returned to this app after Supabase Auth.
 *
 * **Browser (PKCE):** must use the **same origin** as the tab that called `signInWithOAuth`
 * (the code verifier lives in that origin’s storage). Using `NEXT_PUBLIC_SITE_URL` here caused
 * `www` vs apex mismatches and `exchangeCodeForSession` → AuthApiError after Google login.
 *
 * **Server:** `window` is undefined → `getURL(path)` (SITE_URL or fallback).
 */
export function getOAuthRedirectURL(path: string = '/auth/callback'): string {
  path = path.replace(/^\/+/, '');
  if (typeof window !== 'undefined') {
    const base = window.location.origin.replace(/\/+$/, '');
    return path ? `${base}/${path}` : base;
  }
  return getURL(path);
}

/**
 * OAuth `redirectTo` for Supabase — same host as the tab + optional post-auth path (`/auth/callback?next=...`).
 * `next` must be a same-site path (see `parseSafeNextPath` at call sites).
 */
export function getOAuthCallbackUrlWithNext(nextPath: string): string {
  const safe = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  return getOAuthRedirectURL(
    `/auth/callback?next=${encodeURIComponent(safe)}`
  );
}

export const postData = async ({
  url,
  data
}: {
  url: string;
  data?: { price: Price };
}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    credentials: 'same-origin',
    body: JSON.stringify(data)
  });

  return res.json();
};

export const toDateTime = (secs: number) => {
  var t = new Date(+0); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export const calculateTrialEndUnixTimestamp = (
  trialPeriodDays: number | null | undefined
) => {
  // Check if trialPeriodDays is null, undefined, or less than 2 days
  if (
    trialPeriodDays === null ||
    trialPeriodDays === undefined ||
    trialPeriodDays < 2
  ) {
    return undefined;
  }

  const currentDate = new Date(); // Current date and time
  const trialEnd = new Date(
    currentDate.getTime() + (trialPeriodDays + 1) * 24 * 60 * 60 * 1000
  ); // Add trial days
  return Math.floor(trialEnd.getTime() / 1000); // Convert to Unix timestamp in seconds
};

const toastKeyMap: { [key: string]: string[] } = {
  status: ['status', 'status_description'],
  error: ['error', 'error_description']
};

const getToastRedirect = (
  path: string,
  toastType: string,
  toastName: string,
  toastDescription: string = '',
  disableButton: boolean = false,
  arbitraryParams: string = ''
): string => {
  const [nameKey, descriptionKey] = toastKeyMap[toastType];

  const sep = path.includes('?') ? '&' : '?';
  let redirectPath = `${path}${sep}${nameKey}=${encodeURIComponent(toastName)}`;

  if (toastDescription) {
    redirectPath += `&${descriptionKey}=${encodeURIComponent(toastDescription)}`;
  }

  if (disableButton) {
    redirectPath += `&disable_button=true`;
  }

  if (arbitraryParams) {
    redirectPath += `&${arbitraryParams}`;
  }

  return redirectPath;
};

export const getStatusRedirect = (
  path: string,
  statusName: string,
  statusDescription: string = '',
  disableButton: boolean = false,
  arbitraryParams: string = ''
) =>
  getToastRedirect(
    path,
    'status',
    statusName,
    statusDescription,
    disableButton,
    arbitraryParams
  );

export const getErrorRedirect = (
  path: string,
  errorName: string,
  errorDescription: string = '',
  disableButton: boolean = false,
  arbitraryParams: string = ''
) =>
  getToastRedirect(
    path,
    'error',
    errorName,
    errorDescription,
    disableButton,
    arbitraryParams
  );

/** Pass as `getErrorRedirect(..., false, TOAST_VARIANT_WARNING_PARAM)` for soft amber toasts. */
export const TOAST_VARIANT_WARNING_PARAM = 'toast_variant=warning';
