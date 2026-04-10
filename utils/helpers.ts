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
 * OAuth `redirectTo`: prefer `NEXT_PUBLIC_SITE_URL` from the client bundle so production logins
 * always return to the public domain (not a preview host, wrong port, or stale tab origin).
 * If unset (typical local dev), use the current page origin.
 */
export function getOAuthRedirectURL(path: string = '/auth/callback'): string {
  path = path.replace(/^\/+/, '');
  if (typeof window === 'undefined') {
    return getURL(path);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = site
    ? (() => {
        const s = site.replace(/\/+$/, '');
        return s.startsWith('http') ? s : `https://${s}`;
      })()
    : window.location.origin.replace(/\/+$/, '');
  return path ? `${base}/${path}` : base;
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
