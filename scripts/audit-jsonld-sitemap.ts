/**
 * Sampled JSON-LD audit: parse sitemap → random /scholarships/* URLs + fixed “other” pages,
 * fetch HTML, extract application/ld+json, run internal consistency checks, notify Telegram.
 * Also reports a full sitemap inventory (counts by path: essays, resources, providers, etc.).
 *
 * Railway / cron:
 *   dotenv -e .env.production -- npx tsx scripts/audit-jsonld-sitemap.ts
 *
 * Dry run (no Telegram):
 *   npx tsx scripts/audit-jsonld-sitemap.ts --dry-run
 *
 * Env:
 *   JSONLD_AUDIT_BASE_URL | NEXT_PUBLIC_SITE_URL | SITE_URL — site origin (required)
 *   TELEGRAM_BOT_TOKEN — required unless --dry-run
 *   TELEGRAM_ADMIN_IDS or JSONLD_AUDIT_TELEGRAM_CHAT_ID — destination chat(s)
 *
 * Optional:
 *   JSONLD_AUDIT_SCHOLARSHIP_SAMPLE=100
 *   JSONLD_AUDIT_OTHER_SAMPLE=5
 */

import { escapeTelegramHtml } from '../lib/telegram/resourceNotifyCore';

const UA =
  'ScholarshipTopJsonLdAudit/1.0 (+https://scholarshiptop.com; internal SEO script)';

const DEFAULT_SCHOLARSHIP_N = 100;
const DEFAULT_OTHER_N = 5;
const FETCH_TIMEOUT_MS = 45_000;
const TELEGRAM_MAX = 3900;

type AuditFailure = { url: string; issues: string[] };

function getBaseUrl(): string {
  const raw =
    process.env.JSONLD_AUDIT_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (!raw) {
    throw new Error(
      'Set JSONLD_AUDIT_BASE_URL or NEXT_PUBLIC_SITE_URL or SITE_URL to the public site origin.'
    );
  }
  return raw.replace(/\/+$/, '');
}

function parseArgs(): { dryRun: boolean } {
  const dryRun = process.argv.includes('--dry-run');
  return { dryRun };
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = m[1]?.trim();
    if (u) out.push(u);
  }
  return out;
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/xml,text/xml,*/*'
      }
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, text: msg };
  } finally {
    clearTimeout(t);
  }
}

async function fetchHtml(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    return { ok: res.ok, status: res.status, html };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, html: msg };
  } finally {
    clearTimeout(t);
  }
}

async function collectAllSitemapUrls(base: string): Promise<string[]> {
  const indexUrl = `${base}/sitemap.xml`;
  const { ok, text: indexXml } = await fetchText(indexUrl);
  if (!ok) {
    throw new Error(`Failed to fetch sitemap index ${indexUrl} (HTTP not OK)`);
  }
  const childSitemaps = extractLocs(indexXml);
  if (childSitemaps.length === 0) {
    throw new Error(`No <loc> entries in ${indexUrl}`);
  }

  const all = new Set<string>();
  for (const sm of childSitemaps) {
    const r = await fetchText(sm);
    if (!r.ok) {
      console.warn('[audit-jsonld] skip child sitemap (fetch failed):', sm, r.status);
      continue;
    }
    for (const u of extractLocs(r.text)) {
      all.add(u);
    }
  }
  return [...all];
}

/** Counts URLs by pathname prefix so the report explains why e.g. /scholarships/… is not “the whole site”. */
export type SitemapInventoryCounts = {
  total: number;
  home: number;
  scholarshipsHub: number;
  scholarshipsUnder: number;
  essays: number;
  resources: number;
  providers: number;
  tools: number;
  other: number;
};

function summarizeSitemapUrls(urls: string[]): SitemapInventoryCounts {
  const c: SitemapInventoryCounts = {
    total: urls.length,
    home: 0,
    scholarshipsHub: 0,
    scholarshipsUnder: 0,
    essays: 0,
    resources: 0,
    providers: 0,
    tools: 0,
    other: 0
  };
  for (const url of urls) {
    let p: string;
    try {
      p = new URL(url).pathname;
    } catch {
      c.other += 1;
      continue;
    }
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    if (p === '/' || p === '') {
      c.home += 1;
    } else if (p === '/scholarships') {
      c.scholarshipsHub += 1;
    } else if (p.startsWith('/scholarships/')) {
      c.scholarshipsUnder += 1;
    } else if (p === '/essays' || p.startsWith('/essays/')) {
      c.essays += 1;
    } else if (p === '/resources' || p.startsWith('/resources/')) {
      c.resources += 1;
    } else if (p === '/providers' || p.startsWith('/providers/')) {
      c.providers += 1;
    } else if (p === '/tools' || p.startsWith('/tools/')) {
      c.tools += 1;
    } else {
      c.other += 1;
    }
  }
  return c;
}

function sitemapInventorySum(s: SitemapInventoryCounts): number {
  return (
    s.home +
    s.scholarshipsHub +
    s.scholarshipsUnder +
    s.essays +
    s.resources +
    s.providers +
    s.tools +
    s.other
  );
}

function isScholarshipSectionUrl(url: string, base: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }
  const basePath = new URL(base).pathname.replace(/\/+$/, '') || '/';
  if (basePath !== '/' && path.startsWith(basePath)) {
    path = path.slice(basePath.length) || '/';
    if (!path.startsWith('/')) path = `/${path}`;
  }
  return path.startsWith('/scholarships/');
}

function shuffleInPlace<T>(arr: T[], seed: number): void {
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function sampleUrls(urls: string[], n: number, seed: number): string[] {
  if (urls.length <= n) return [...urls];
  const copy = [...urls];
  shuffleInPlace(copy, seed);
  return copy.slice(0, n);
}

function extractLdJsonBlocks(html: string): { raw: string; error?: string }[] {
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: { raw: string; error?: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim() ?? '';
    if (!raw) {
      out.push({ raw: '', error: 'empty script body' });
      continue;
    }
    out.push({ raw });
  }
  return out;
}

function typesOf(node: Record<string, unknown>): string[] {
  const t = node['@type'];
  if (t == null) return [];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string');
  if (typeof t === 'string') return [t];
  return [];
}

function walkJsonLdIssues(
  node: unknown,
  path: string,
  issues: string[],
  insideOfferPriceSpec = false
): void {
  if (node === null) {
    issues.push(`${path}: unexpected null`);
    return;
  }
  if (typeof node !== 'object') return;

  if (Array.isArray(node)) {
    node.forEach((item, i) =>
      walkJsonLdIssues(item, `${path}[${i}]`, issues, insideOfferPriceSpec)
    );
    return;
  }

  const o = node as Record<string, unknown>;

  if ('@graph' in o && Array.isArray(o['@graph'])) {
    walkJsonLdIssues(o['@graph'], `${path}.@graph`, issues, insideOfferPriceSpec);
    return;
  }

  const types = typesOf(o);

  const criticalNullKeys = ['name', 'description', 'url', 'text'] as const;
  for (const k of criticalNullKeys) {
    if (k in o && o[k] === null) {
      issues.push(`${path}.${k}: null`);
    }
  }

  if (types.includes('FAQPage')) {
    const me = o.mainEntity;
    if (!Array.isArray(me) || me.length === 0) {
      issues.push(`${path} (FAQPage): mainEntity missing or empty array`);
    }
  }

  if (types.includes('EducationalOccupationalProgram')) {
    const dataKeys = Object.keys(o).filter((k) => k !== '@context' && k !== '@type');
    const onlyIdPointer =
      dataKeys.length === 1 && dataKeys[0] === '@id' && typeof o['@id'] === 'string';
    if (!onlyIdPointer) {
      for (const k of ['name', 'description', 'url'] as const) {
        const v = o[k];
        if (typeof v !== 'string' || !v.trim()) {
          issues.push(
            `${path} (EducationalOccupationalProgram): ${k} missing or empty string`
          );
        }
      }
    }
  }

  if (types.includes('Offer')) {
    const ps = o.priceSpecification;
    if (ps != null && typeof ps === 'object' && !Array.isArray(ps)) {
      const pso = ps as Record<string, unknown>;
      const pTypes = typesOf(pso);
      if (
        pTypes.includes('UnitPriceSpecification') ||
        pTypes.includes('PriceSpecification')
      ) {
        const price = pso.price;
        if (price === null || price === undefined) {
          issues.push(`${path} (Offer.priceSpecification): price is null/undefined`);
        } else if (typeof price !== 'number' || Number.isNaN(price)) {
          issues.push(`${path} (Offer.priceSpecification): price must be a finite number`);
        }
        if (pso.priceCurrency == null || pso.priceCurrency === '') {
          issues.push(`${path} (Offer.priceSpecification): priceCurrency missing`);
        }
      }
    }
  }

  if (types.includes('UnitPriceSpecification') || insideOfferPriceSpec) {
    const price = o.price;
    if ('price' in o && (price === null || price === undefined)) {
      issues.push(`${path} (UnitPriceSpecification): price is null/undefined`);
    }
  }

  const nextInside =
    insideOfferPriceSpec || types.includes('UnitPriceSpecification');

  for (const [k, v] of Object.entries(o)) {
    if (k === '@context' || k === '@type') continue;
    walkJsonLdIssues(v, `${path}.${k}`, issues, nextInside);
  }
}

function validateParsedJsonLd(parsed: unknown, pathLabel: string): string[] {
  const issues: string[] = [];
  walkJsonLdIssues(parsed, pathLabel, issues, false);
  return issues;
}

function parseTelegramChatIds(): number[] {
  const single = process.env.JSONLD_AUDIT_TELEGRAM_CHAT_ID?.trim();
  if (single) {
    const n = Number(single);
    if (Number.isFinite(n)) return [n];
  }
  const raw = process.env.TELEGRAM_ADMIN_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

async function sendTelegramHtml(chatId: number, html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.error('[audit-jsonld] Telegram send failed', res.status, t);
    return false;
  }
  return true;
}

function chunkTelegramMessages(lines: string[]): string[] {
  const flush = (s: string, max: number): string[] => {
    if (s.length <= max) return [s];
    const parts: string[] = [];
    for (let i = 0; i < s.length; i += max) {
      parts.push(s.slice(i, i + max));
    }
    return parts;
  };

  const chunks: string[] = [];
  let cur = '';
  for (const line of lines) {
    const add = (cur ? '\n' : '') + line;
    if (cur.length + add.length > TELEGRAM_MAX) {
      if (cur) chunks.push(...flush(cur, TELEGRAM_MAX));
      cur = line;
      while (cur.length > TELEGRAM_MAX) {
        chunks.push(cur.slice(0, TELEGRAM_MAX));
        cur = cur.slice(TELEGRAM_MAX);
      }
    } else {
      cur += add;
    }
  }
  if (cur) chunks.push(...flush(cur, TELEGRAM_MAX));
  return chunks;
}

async function main() {
  const { dryRun } = parseArgs();
  const base = getBaseUrl();
  const seed =
    Number(process.env.JSONLD_AUDIT_SEED) ||
    Math.floor(Date.now() / 86_400_000);

  const nSch = Math.max(
    1,
    Number(process.env.JSONLD_AUDIT_SCHOLARSHIP_SAMPLE) || DEFAULT_SCHOLARSHIP_N
  );
  const nOther = Math.max(
    1,
    Number(process.env.JSONLD_AUDIT_OTHER_SAMPLE) || DEFAULT_OTHER_N
  );

  console.log('[audit-jsonld] base URL:', base);
  console.log('[audit-jsonld] sample:', nSch, 'scholarship URLs +', nOther, 'other');

  const allUrls = await collectAllSitemapUrls(base);
  const inventory = summarizeSitemapUrls(allUrls);
  console.log('[audit-jsonld] sitemap inventory:', inventory);

  const scholarshipPool = allUrls.filter((u) => isScholarshipSectionUrl(u, base));
  const pickedSch = sampleUrls(scholarshipPool, nSch, seed);

  const otherFixed = [
    `${base}/`,
    `${base}/scholarships`,
    `${base}/resources`,
    `${base}/essays`,
    `${base}/providers`
  ].slice(0, nOther);

  const targets = [...new Set([...pickedSch, ...otherFixed])];

  const failures: AuditFailure[] = [];
  let ok = 0;
  let parseErrors = 0;

  for (const url of targets) {
    const { ok: httpOk, status, html } = await fetchHtml(url);
    if (!httpOk) {
      failures.push({
        url,
        issues: [`HTTP ${status || 'error'} fetching page`]
      });
      continue;
    }

    const blocks = extractLdJsonBlocks(html);
    if (blocks.length === 0) {
      failures.push({ url, issues: ['no &lt;script type="application/ld+json"&gt; blocks'] });
      continue;
    }

    const pageIssues: string[] = [];
    let anyParsed = false;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.error) {
        pageIssues.push(`block[${i}]: ${b.error}`);
        parseErrors += 1;
        continue;
      }
      try {
        const parsed = JSON.parse(b.raw) as unknown;
        anyParsed = true;
        pageIssues.push(...validateParsedJsonLd(parsed, `block[${i}]`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        pageIssues.push(`block[${i}]: JSON.parse failed — ${msg}`);
        parseErrors += 1;
      }
    }

    if (!anyParsed) {
      failures.push({ url, issues: pageIssues });
      continue;
    }

    if (pageIssues.length > 0) {
      failures.push({ url, issues: pageIssues });
    } else {
      ok += 1;
    }
  }

  const total = targets.length;
  const failCount = failures.length;

  const invSum = sitemapInventorySum(inventory);
  const summaryLines: string[] = [
    `<b>JSON-LD audit</b> <code>${escapeTelegramHtml(base)}</code>`,
    '',
    `<b>Sitemap inventory</b> (unique <code>&lt;loc&gt;</code> across child sitemaps)`,
    `• Total: <b>${inventory.total}</b>`,
    `• <code>/</code> (home): ${inventory.home}`,
    `• <code>/scholarships</code> (hub only): ${inventory.scholarshipsHub}`,
    `• <code>/scholarships/…</code> (listings + grants + hubs): ${inventory.scholarshipsUnder}`,
    `• <code>/essays</code>…: ${inventory.essays}`,
    `• <code>/resources</code>…: ${inventory.resources}`,
    `• <code>/providers</code>…: ${inventory.providers}`,
    `• <code>/tools</code>…: ${inventory.tools}`,
    `• Other paths: ${inventory.other}`,
    ...(invSum !== inventory.total
      ? [
          `⚠️ <i>Bucket sum ${invSum} ≠ total ${inventory.total}</i>`
        ]
      : []),
    '',
    `Sampled <b>${total}</b> pages for JSON-LD checks (${pickedSch.length} from <code>/scholarships/…</code> pool of ${scholarshipPool.length}, plus hub/other URLs).`,
    `✅ <b>${ok}</b> OK · ❌ <b>${failCount}</b> with issues · parse errors in blocks: ${parseErrors}`,
    ''
  ];

  if (failures.length === 0) {
    summaryLines.push('<i>No structural issues in sampled JSON-LD.</i>');
  } else {
    summaryLines.push(`<b>Issues (${failures.length} URLs)</b>`);
    const maxList = 25;
    failures.slice(0, maxList).forEach((f, idx) => {
      summaryLines.push(
        `${idx + 1}. ${escapeTelegramHtml(f.url)}`
      );
      f.issues.slice(0, 8).forEach((issue) => {
        summaryLines.push(`   · ${escapeTelegramHtml(issue)}`);
      });
      if (f.issues.length > 8) {
        summaryLines.push(
          `   · … +${f.issues.length - 8} more`
        );
      }
    });
    if (failures.length > maxList) {
      summaryLines.push(`… and ${failures.length - maxList} more URLs with issues.`);
    }
  }

  const textChunks = chunkTelegramMessages(summaryLines);

  console.log('\n--- Report ---\n');
  for (const chunk of textChunks) {
    console.log(chunk.replace(/<[^>]+>/g, ''));
  }

  if (!dryRun) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      console.error('[audit-jsonld] TELEGRAM_BOT_TOKEN missing; set it or use --dry-run');
      process.exit(1);
    }
    const chats = parseTelegramChatIds();
    if (chats.length === 0) {
      console.error(
        '[audit-jsonld] No Telegram chat: set JSONLD_AUDIT_TELEGRAM_CHAT_ID or TELEGRAM_ADMIN_IDS'
      );
      process.exit(1);
    }
    let telegramOk = true;
    for (const chatId of chats) {
      for (const chunk of textChunks) {
        const sent = await sendTelegramHtml(chatId, chunk);
        if (!sent) telegramOk = false;
      }
    }
    if (!telegramOk) process.exit(1);
  } else {
    console.log('\n[audit-jsonld] --dry-run: skipping Telegram.');
  }

  const nonzero =
    process.env.JSONLD_AUDIT_EXIT_NONZERO?.trim() === '1' ||
    process.env.JSONLD_AUDIT_EXIT_NONZERO?.toLowerCase() === 'true';
  process.exit(nonzero && failCount > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
