/**
 * D18 GSC performance pull — audit helper (reports/data only)
 * Run: dotenv -e .env.local -- npx tsx reports/data/_d18-gsc-pull.ts
 */
import fs from 'fs';
import path from 'path';
import { googleSearchConsoleJwt, getSearchConsoleSitePropertyUrl } from '../../lib/seo/googleSearchConsole';

const BASE = 'https://scholarshiptop.com';
const PATHS = [
  '/resources/medical-scholarships-guide',
  '/essays/career-goals',
  '/resources/best-scholarships-texas-international-students',
  '/providers/loyola-university-chicago',
  '/resources/how-to-find-scholarships',
  '/resources/best-scholarship-websites'
];

async function fetchPageAnalytics(days: number) {
  const client = googleSearchConsoleJwt();
  if (!client) return { ok: false as const, error: 'Missing GOOGLE_INDEXING credentials' };

  const siteUrl = getSearchConsoleSitePropertyUrl();
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const endDate = end.toISOString().slice(0, 10);
  const startDate = start.toISOString().slice(0, 10);

  const tokenResp = await client.getAccessToken();
  const token = typeof tokenResp === 'string' ? tokenResp : tokenResp?.token ?? null;
  if (!token) return { ok: false as const, error: 'No access token' };

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  async function query(dimensions: string[]) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit: 25000,
        dataState: 'all'
      })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false as const, error: `${response.status}: ${text}` };
    }
    return { ok: true as const, rows: ((await response.json()) as { rows?: unknown[] }).rows ?? [] };
  }

  const pageRes = await query(['page']);
  if (!pageRes.ok) return pageRes;

  const pageMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  for (const row of pageRes.rows as { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[]) {
    const page = row.keys?.[0] ?? '';
    if (!page) continue;
    try {
      const key = new URL(page).pathname.replace(/\/+$/, '') || '/';
      pageMap.set(key, {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0
      });
    } catch {
      /* skip */
    }
  }

  const queryRes = await query(['page', 'query']);
  const topQueries = new Map<string, { query: string; impressions: number; clicks: number; ctr: number; position: number }>();
  if (queryRes.ok) {
    for (const row of queryRes.rows as { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[]) {
      const page = row.keys?.[0] ?? '';
      const q = row.keys?.[1] ?? '';
      if (!page || !q) continue;
      try {
        const key = new URL(page).pathname.replace(/\/+$/, '') || '/';
        if (!PATHS.includes(key)) continue;
        const prev = topQueries.get(key);
        const impressions = row.impressions ?? 0;
        if (!prev || impressions > prev.impressions) {
          topQueries.set(key, {
            query: q,
            impressions,
            clicks: row.clicks ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ?? 0
          });
        }
      } catch {
        /* skip */
      }
    }
  }

  return { ok: true as const, startDate, endDate, siteUrl, pageMap, topQueries, queryError: queryRes.ok ? null : queryRes.error };
}

async function main() {
  const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const r7 = await fetchPageAnalytics(7);
  const r28 = await fetchPageAnalytics(28);

  if (!r7.ok && !r28.ok) {
    const error = r7.error ?? r28.error ?? 'unknown';
    fs.writeFileSync(
      path.join(outDir, 'd18-gsc-access-status.json'),
      JSON.stringify({ available: false, error }, null, 2)
    );
    console.error('GSC blocked:', error);
    process.exit(2);
  }

  const lines = ['url,period,clicks,impressions,ctr,average_position,top_query,gsc_start,gsc_end'];
  for (const p of PATHS) {
    for (const [label, res] of [
      ['last_7_days', r7],
      ['last_28_days', r28]
    ] as const) {
      if (!res.ok) continue;
      const stats = res.pageMap.get(p) ?? res.pageMap.get(`${p}/`) ?? {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      };
      const top = res.topQueries.get(p);
      lines.push(
        [
          `${BASE}${p}`,
          label,
          stats.clicks,
          stats.impressions,
          stats.ctr.toFixed(4),
          stats.position.toFixed(2),
          top?.query ?? '',
          res.startDate,
          res.endDate
        ].join(',')
      );
    }
  }

  fs.writeFileSync(path.join(outDir, 'd18-gsc-performance-export.csv'), lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'd18-gsc-access-status.json'),
    JSON.stringify({ available: true, siteUrl: r28.ok ? r28.siteUrl : r7.ok ? r7.siteUrl : null }, null, 2)
  );
  console.log('Wrote d18-gsc-performance-export.csv');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
