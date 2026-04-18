import 'server-only';

import { JWT } from 'google-auth-library';

import { getURL } from '@/utils/helpers';

/** Search Analytics (Performance) — read site search traffic data. */
const SCOPE_WEBMASTERS_READONLY =
  'https://www.googleapis.com/auth/webmasters.readonly';

/**
 * URL Inspection API requires the broader Search Console scope (not only readonly).
 * We request both so one service account can run Search Analytics + inspect.
 */
const SCOPE_WEBMASTERS = 'https://www.googleapis.com/auth/webmasters';

const SEARCH_ANALYTICS_QUERY_PATH =
  'https://www.googleapis.com/webmasters/v3/sites';

const URL_INSPECTION_INSPECT =
  'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

const SEARCH_ANALYTICS_ROW_LIMIT = 25_000;

/**
 * Property URL as registered in Google Search Console.
 * URL-prefix properties use a trailing slash (`https://example.com/`).
 * Domain properties must be exactly `sc-domain:example.com` — no trailing slash (API 400 otherwise).
 */
export function getSearchConsoleSitePropertyUrl(): string {
  const fromEnv = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith('sc-domain:')) {
      return fromEnv.replace(/\/+$/, '');
    }
    const u = fromEnv.replace(/\/+$/, '');
    return `${u}/`;
  }
  const base = getURL().replace(/\/+$/, '');
  return `${base}/`;
}

/**
 * Same credentials as Indexing API; must be added as a user to the GSC property.
 * Scopes: Search Analytics (readonly) + URL Inspection (full webmasters).
 */
export function googleSearchConsoleJwt(): JWT | null {
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.trim();
  if (!email || !rawKey) return null;

  return new JWT({
    email,
    key: rawKey.replace(/\\n/g, '\n'),
    scopes: [SCOPE_WEBMASTERS_READONLY, SCOPE_WEBMASTERS]
  });
}

async function getAccessTokenOrThrow(client: JWT): Promise<string> {
  const accessToken = await client.getAccessToken();
  const token =
    typeof accessToken === 'string' ? accessToken : accessToken?.token ?? null;
  if (!token) {
    throw new Error('Could not obtain Google Search Console access token');
  }
  return token;
}

export type SearchAppearancePageCountResult =
  | {
      ok: true;
      /** Distinct URLs that had at least one impression in Search in the window (Search Analytics `page` dimension). */
      count: number;
      startDate: string;
      endDate: string;
      siteUrl: string;
    }
  | { ok: false; error: string };

/**
 * Counts distinct landing pages with Search impressions in the date range via
 * `searchAnalytics.query` (dimension `page`). This matches “pages that appeared
 * in Google Search” in the period — not the same as “indexed” in Coverage, but
 * the standard API-available metric for “in search”.
 */
export async function fetchSearchAppearancePageCount(
  options?: { siteUrl?: string; days?: number }
): Promise<SearchAppearancePageCountResult> {
  const siteUrl = options?.siteUrl ?? getSearchConsoleSitePropertyUrl();
  const days = Math.max(1, Math.min(400, options?.days ?? 30));

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const endDate = end.toISOString().slice(0, 10);
  const startDate = start.toISOString().slice(0, 10);

  try {
    const client = googleSearchConsoleJwt();
    if (!client) {
      return {
        ok: false,
        error:
          'Missing GOOGLE_INDEXING_CLIENT_EMAIL or GOOGLE_INDEXING_PRIVATE_KEY'
      };
    }

    const token = await getAccessTokenOrThrow(client);
    const encodedSite = encodeURIComponent(siteUrl);
    const endpoint = `${SEARCH_ANALYTICS_QUERY_PATH}/${encodedSite}/searchAnalytics/query`;

    let total = 0;
    let startRow = 0;

    for (;;) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: SEARCH_ANALYTICS_ROW_LIMIT,
          startRow,
          dataState: 'all'
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          ok: false,
          error: `Search Analytics ${response.status}: ${text || response.statusText}`
        };
      }

      const payload = (await response.json()) as {
        rows?: { keys?: string[] }[];
      };
      const rows = payload.rows ?? [];
      total += rows.length;
      if (rows.length < SEARCH_ANALYTICS_ROW_LIMIT) {
        break;
      }
      startRow += SEARCH_ANALYTICS_ROW_LIMIT;
    }

    return { ok: true, count: total, startDate, endDate, siteUrl };
  } catch (e) {
    console.error('[googleSearchConsole] fetchSearchAppearancePageCount', e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

export type UrlIndexInspectionResult =
  | {
      ok: true;
      verdict: string;
      coverageState?: string;
      raw?: unknown;
    }
  | { ok: false; error: string };

/**
 * True when URL Inspection reports the URL as indexed / on Google.
 * The API uses `verdict: "PASS"` for success; some UIs label that “URL is on Google”.
 */
export function isUrlInspectionIndexedInGoogle(
  result: UrlIndexInspectionResult
): boolean {
  if (!result.ok) return false;
  const v = (result.verdict ?? '').toUpperCase();
  if (v === 'PASS' || v === 'URL_IS_ON_GOOGLE') return true;
  const cov = (result.coverageState ?? '').toLowerCase();
  return cov.includes('indexed');
}

/**
 * URL Inspection API — returns index status verdict for a single URL.
 */
export async function checkUrlIndexStatus(
  inspectionUrl: string
): Promise<UrlIndexInspectionResult> {
  const siteUrl = getSearchConsoleSitePropertyUrl();
  const trimmed = inspectionUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'Empty URL' };
  }

  try {
    const client = googleSearchConsoleJwt();
    if (!client) {
      return {
        ok: false,
        error:
          'Missing GOOGLE_INDEXING_CLIENT_EMAIL or GOOGLE_INDEXING_PRIVATE_KEY'
      };
    }

    const token = await getAccessTokenOrThrow(client);

    const response = await fetch(URL_INSPECTION_INSPECT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inspectionUrl: trimmed,
        siteUrl
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        error: `URL Inspection ${response.status}: ${text || response.statusText}`
      };
    }

    const data = (await response.json()) as {
      inspectionResult?: {
        /** Official field name per Search Console API `UrlInspectionResult`. */
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
        };
        /** Legacy / mistaken key — keep as fallback if responses ever vary. */
        indexStatus?: {
          verdict?: string;
          coverageState?: string;
        };
      };
    };

    const indexBlock =
      data.inspectionResult?.indexStatusResult ??
      data.inspectionResult?.indexStatus;
    const verdict = indexBlock?.verdict ?? 'UNKNOWN_VERDICT';
    const coverageState = indexBlock?.coverageState;

    return {
      ok: true,
      verdict,
      ...(coverageState ? { coverageState } : {}),
      raw: data
    };
  } catch (e) {
    console.error('[googleSearchConsole] checkUrlIndexStatus', e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}
