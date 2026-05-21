/**
 * Smoke check funnel routes: HTTP status, robots meta, hreflang, /en links.
 * Usage: SMOKE_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-funnel-seo-smoke.ts
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

const PATHS = [
  '/get-scholarships',
  '/signin',
  '/subscription',
  '/es/get-scholarships',
  '/fr/get-scholarships',
  '/es/signin',
  '/fr/signin',
  '/es/subscription',
  '/fr/subscription'
] as const;

type Row = {
  path: string;
  status: number;
  robots: string;
  hreflang: string[];
  hasEnLink: boolean;
};

function parseRobots(html: string): string {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  return m?.[1] ?? '(default — no explicit robots meta)';
}

function parseHreflang(html: string): string[] {
  const langs = new Set<string>();
  const re = /hreflang=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) langs.add(m[1]);
  return [...langs].sort();
}

async function check(path: string): Promise<Row> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  const html = await res.text();
  return {
    path,
    status: res.status,
    robots: parseRobots(html),
    hreflang: parseHreflang(html),
    hasEnLink: /href=["']\/en(?:\/|["'])/.test(html)
  };
}

async function main(): Promise<void> {
  const rows = await Promise.all(PATHS.map(check));
  console.log(JSON.stringify({ base: BASE, rows }, null, 2));
  const bad = rows.filter((r) => r.status !== 200);
  if (bad.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
