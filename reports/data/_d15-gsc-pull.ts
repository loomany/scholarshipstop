/**
 * D15 one-off GSC pull for priority URLs — audit only, not product code.
 * Run: dotenv -e .env.local -- npx tsx reports/data/_d15-gsc-pull.ts
 */
import fs from 'fs';
import path from 'path';
import { googleSearchConsoleJwt, getSearchConsoleSitePropertyUrl } from '../../lib/seo/googleSearchConsole';

const PRIORITY_PATHS = [
  '/resources/medical-scholarships-guide',
  '/essays/career-goals',
  '/essays/financial-need',
  '/resources/how-to-find-scholarships',
  '/resources/best-scholarship-websites',
  '/resources/best-scholarships-texas-international-students',
  '/scholarships/texas',
  '/scholarships/california',
  '/scholarships/new-york',
  '/scholarships/florida',
  '/scholarships/illinois',
  '/scholarships/texas/tarleton-state-university',
  '/scholarships/california/california-state-university-northridge',
  '/compare/states',
  '/compare/universities',
  '/compare/states/california-vs-texas',
  '/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida',
  '/providers/loyola-university-chicago',
  '/providers/alamo-colleges-foundation'
];

const BASE = 'https://scholarshiptop.com';

type Period = { label: string; days: number };

const PERIODS: Period[] = [
  { label: 'last_7_days', days: 7 },
  { label: 'last_28_days', days: 28 }
];

async function fetchAnalytics(days: number) {
  const client = googleSearchConsoleJwt();
  if (!client) {
    return { ok: false as const, error: 'Missing GOOGLE_INDEXING credentials' };
  }
  const siteUrl = getSearchConsoleSitePropertyUrl();
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const endDate = end.toISOString().slice(0, 10);
  const startDate = start.toISOString().slice(0, 10);

  const tokenResp = await client.getAccessToken();
  const token =
    typeof tokenResp === 'string' ? tokenResp : tokenResp?.token ?? null;
  if (!token) return { ok: false as const, error: 'No access token' };

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
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
      rowLimit: 25000,
      dataState: 'all'
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false as const, error: `${response.status}: ${text}` };
  }
  const payload = (await response.json()) as {
    rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[];
  };
  const map = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  for (const row of payload.rows ?? []) {
    const page = row.keys?.[0] ?? '';
    if (!page) continue;
    try {
      const u = new URL(page);
      const key = u.pathname.replace(/\/+$/, '') || '/';
      map.set(key, {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0
      });
    } catch {
      /* skip */
    }
  }
  return { ok: true as const, startDate, endDate, siteUrl, map };
}

async function main() {
  const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const results7 = await fetchAnalytics(7);
  const results28 = await fetchAnalytics(28);

  if (!results7.ok && !results28.ok) {
    console.error('GSC unavailable:', results7.error ?? results28.error);
    fs.writeFileSync(
      path.join(outDir, 'd15-gsc-status.json'),
      JSON.stringify({ available: false, error: results7.error ?? results28.error }, null, 2)
    );
    process.exit(2);
  }

  const lines = [
    'url,period,clicks,impressions,ctr,avg_position,gsc_start,gsc_end'
  ];
  for (const p of PRIORITY_PATHS) {
    const full = `${BASE}${p}`;
    for (const period of PERIODS) {
      const res = period.days === 7 ? results7 : results28;
      if (!res.ok) continue;
      const stats = res.map.get(p) ?? res.map.get(`${p}/`) ?? {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      };
      lines.push(
        [
          full,
          period.label,
          stats.clicks,
          stats.impressions,
          stats.ctr.toFixed(4),
          stats.position.toFixed(2),
          res.startDate,
          res.endDate
        ].join(',')
      );
    }
  }

  const csvPath = path.join(outDir, 'd15-search-console-priority-url-status.csv');
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'd15-gsc-status.json'),
    JSON.stringify(
      {
        available: true,
        siteUrl: results28.ok ? results28.siteUrl : results7.ok ? results7.siteUrl : null,
        rowsWritten: lines.length - 1
      },
      null,
      2
    )
  );
  console.log('Wrote', csvPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
