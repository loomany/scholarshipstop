/**
 * Discover provider contacts and partnership/affiliate signals from public pages.
 *
 * Usage:
 *   npx tsx scripts/discover-provider-partnerships.ts
 *   npx tsx scripts/discover-provider-partnerships.ts --input=scripts/data/providers-seed.csv
 *   npx tsx scripts/discover-provider-partnerships.ts --concurrency=4 --delay-ms=800 --limit=100
 *   npx tsx scripts/discover-provider-partnerships.ts --discover-web --discover-limit=200
 *   npx tsx scripts/discover-provider-partnerships.ts --from-site --skip-scanned
 *   npx tsx scripts/discover-provider-partnerships.ts --from-site --skip-scanned --rescan-after-days=14
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  sendProviderDiscoveryTelegramFailure,
  sendProviderDiscoveryTelegramSummary
} from '@/lib/telegram/providerDiscoveryReport';

type SignalsConfig = {
  partnerPathCandidates: string[];
  keywordsRu: string[];
  keywordsEn: string[];
  ignoreEmailFragments: string[];
};

type PageEvidence = {
  url: string;
  status: number;
  matchedKeywords: string[];
  snippet: string | null;
  emails: string[];
};

type DomainReport = {
  domain: string;
  scannedAt: string;
  success: boolean;
  errors: string[];
  checkedUrls: string[];
  emails: string[];
  hasPartnershipSignals: boolean;
  confidenceScore: number;
  evidence: PageEvidence[];
};

type ProviderSeed = {
  slug: string;
  displayName: string;
  officialUrl: string | null;
};

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_INPUT = path.join(ROOT, 'scripts', 'data', 'providers-seed.csv');
const DEFAULT_CONFIG = path.join(
  ROOT,
  'scripts',
  'config',
  'partnership-signals.json'
);
const OUT_DIR = path.join(ROOT, 'scripts', 'output');
const OUT_JSON = path.join(OUT_DIR, 'provider-partnerships-report.json');
const OUT_CSV = path.join(OUT_DIR, 'provider-partnerships-report.csv');
const OUT_DISCOVERED = path.join(OUT_DIR, 'provider-partnerships-discovered-domains.csv');
const OUT_LIVE_LOG = path.join(OUT_DIR, 'provider-discovery-live.log');
const DEFAULT_DISCOVER_QUERIES = [
  'site:.com грант для студентов',
  'site:.org scholarship program apply',
  'гранты обучение подать заявку',
  'student grants provider',
  'funding opportunities students apply'
];
const BLOCKED_DISCOVERY_HOSTS = [
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'yandex.ru',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'wikipedia.org',
  'vk.com',
  't.me'
];
const PROVIDER_STATS = 'provider_scholarship_stats' as unknown as 'scholarships';
const PROVIDER_SCAN_RUNS_TABLE =
  'provider_partnership_scan_runs' as unknown as 'scholarships';
const PROVIDER_CONTACTS_TABLE =
  'provider_partnership_contacts' as unknown as 'scholarships';
const PROVIDER_DOMAIN_SCANS_TABLE =
  'provider_partnership_domain_scans' as unknown as 'scholarships';

type ProviderContactUpsertRow = {
  run_id: string | null;
  contact_key: string;
  domain: string;
  email: string | null;
  partner_url: string | null;
  evidence_url: string | null;
  confidence_score: number;
  has_partnership_signal: boolean;
  scanned_at: string;
  updated_at: string;
};

function parseArg(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

function parseNumberArg(name: string, fallback: number): number {
  const raw = parseArg(name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseListArg(name: string): string[] {
  const raw = parseArg(name);
  if (!raw) return [];
  return raw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadEnvFiles(): void {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

function resetLiveLog(append: boolean): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (append && fs.existsSync(OUT_LIVE_LOG)) {
    fs.appendFileSync(
      OUT_LIVE_LOG,
      `\n# --- new run ---\n# started_at=${new Date().toISOString()}\n`,
      'utf8'
    );
    return;
  }
  fs.writeFileSync(
    OUT_LIVE_LOG,
    `# provider-discovery-live\n# started_at=${new Date().toISOString()}\n`,
    'utf8'
  );
}

function liveLog(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(OUT_LIVE_LOG, `${line}\n`, 'utf8');
}

function normalizeDomain(raw: string): string | null {
  const t = raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!t) return null;
  const noPath = t.split('/')[0]?.trim().toLowerCase() ?? '';
  if (!noPath || noPath.includes(' ')) return null;
  return noPath;
}

function readSeedDomains(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const values =
    lines[0].toLowerCase() === 'domain' ? lines.slice(1) : lines;
  const seen = new Set<string>();
  for (const value of values) {
    const [first] = value.split(',');
    const domain = normalizeDomain(first ?? '');
    if (domain) seen.add(domain);
  }
  return [...seen];
}

function loadSignals(configPath: string): SignalsConfig {
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as SignalsConfig;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractEmailsFromHtml(html: string, ignoreFragments: string[]): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g;
  const raw = html.match(emailRegex) ?? [];
  const out = new Set<string>();
  for (const value of raw) {
    const email = value.toLowerCase();
    if (email.length > 120) continue;
    if (ignoreFragments.some((fragment) => email.includes(fragment.toLowerCase()))) {
      continue;
    }
    out.add(email);
  }
  return [...out];
}

function isLikelyCampaignReadyEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email) return false;
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return false;
  if (email.endsWith('.phone')) return false;
  if (email.includes('..')) return false;
  return true;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

function makeSnippet(text: string, keyword: string): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 120);
  const end = Math.min(text.length, idx + keyword.length + 120);
  return text.slice(start, end).trim();
}

function buildCandidateUrls(domain: string, paths: string[]): string[] {
  const set = new Set<string>();
  set.add(`https://${domain}`);
  set.add(`http://${domain}`);
  for (const p of paths) {
    const pathValue = p.startsWith('/') ? p : `/${p}`;
    set.add(`https://${domain}${pathValue}`);
    set.add(`http://${domain}${pathValue}`);
  }
  return [...set];
}

async function fetchWithRetry(url: string, retries: number): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; provider-partnership-discovery/1.0; +https://scholarshiptop.com)'
        }
      });
      clearTimeout(timeout);
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const backoff = Math.min(5_000, 500 * 2 ** (attempt - 1));
        await sleep(backoff);
      }
    }
  }
  throw new Error(
    `Request failed for ${url}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function shouldSkipDiscoveredDomain(domain: string): boolean {
  return BLOCKED_DISCOVERY_HOSTS.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`)
  );
}

function skipReasonForDiscoveredDomain(domain: string): string | null {
  for (const blocked of BLOCKED_DISCOVERY_HOSTS) {
    if (domain === blocked || domain.endsWith(`.${blocked}`)) {
      return `blocked-host:${blocked}`;
    }
  }
  return null;
}

function isCaptchaLikeText(text: string): boolean {
  const lower = text.toLowerCase();
  const markers = [
    'captcha',
    'i am not a robot',
    'verify you are human',
    'verify that you are human',
    'unusual traffic',
    'automated queries',
    'security check',
    'подтвердите, что вы человек',
    'проверка безопасности',
    'я не робот'
  ];
  return markers.some((marker) => lower.includes(marker));
}

function extractDomainsFromSearchHtml(html: string): string[] {
  const hrefRegex = /href="([^"]+)"/g;
  const set = new Set<string>();
  for (;;) {
    const match = hrefRegex.exec(html);
    if (!match) break;
    const rawHref = match[1] ?? '';
    if (!rawHref.startsWith('http://') && !rawHref.startsWith('https://')) {
      continue;
    }
    try {
      const hostname = new URL(rawHref).hostname.toLowerCase();
      const domain = normalizeDomain(hostname);
      if (!domain) continue;
      if (shouldSkipDiscoveredDomain(domain)) continue;
      set.add(domain);
    } catch {
      continue;
    }
  }
  return [...set];
}

async function discoverProviderDomainsFromWeb(
  queries: string[],
  delayMs: number,
  discoverLimit: number
): Promise<string[]> {
  const found = new Set<string>();
  const pagesPerQuery = 3;
  const pageSize = 30;

  for (const query of queries) {
    for (let page = 0; page < pagesPerQuery; page++) {
      if (found.size >= discoverLimit) break;
      const start = page * pageSize;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
        query
      )}&s=${start}`;
      try {
        const res = await fetchWithRetry(searchUrl, 3);
        if (!res.ok) {
          await sleep(delayMs);
          continue;
        }
        const html = await res.text();
        const domains = extractDomainsFromSearchHtml(html);
        for (const domain of domains) {
          found.add(domain);
          if (found.size >= discoverLimit) break;
        }
      } catch {
        // best effort discovery: continue to next query/page
      }
      await sleep(delayMs);
    }
  }
  return [...found];
}

async function fetchProvidersFromSite(limit: number): Promise<ProviderSeed[]> {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for --from-site.'
    );
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from(PROVIDER_STATS)
    .select('slug, display_name')
    .order('scholarship_count', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load providers from site: ${error.message}`);
  const baseRows = (data ?? [])
    .map((row) => ({
      slug: String((row as { slug?: string }).slug ?? '').trim(),
      displayName: String((row as { display_name?: string }).display_name ?? '').trim()
    }))
    .filter((row) => row.slug);

  const { data: providersData, error: providersError } = await supabase
    .from('providers')
    .select('slug, official_url')
    .in(
      'slug',
      baseRows.map((row) => row.slug)
    );
  if (providersError) {
    throw new Error(`Failed to load official URLs from providers: ${providersError.message}`);
  }
  const officialBySlug = new Map<string, string>();
  for (const row of providersData ?? []) {
    const slug = String((row as { slug?: string }).slug ?? '').trim();
    const official = String((row as { official_url?: string }).official_url ?? '').trim();
    if (slug && official) officialBySlug.set(slug, official);
  }

  return baseRows.map((row) => ({
    slug: row.slug,
    displayName: row.displayName,
    officialUrl: officialBySlug.get(row.slug) ?? null
  }));
}

async function discoverDomainsWithBrowser(
  providers: ProviderSeed[],
  discoverLimit: number,
  showBrowser: boolean,
  delayMs: number,
  captchaPauseMs: number
): Promise<string[]> {
  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium'
    );
  }
  const browser = await playwright.chromium.launch({ headless: !showBrowser, slowMo: 120 });
  const page = await browser.newPage();
  const found = new Set<string>();
  const rejected = new Map<string, number>();

  try {
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      if (found.size >= discoverLimit) break;
      const query = `${provider.displayName || provider.slug} scholarship grant provider official site`;
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      liveLog(
        `[browser-discovery ${i + 1}/${providers.length}] provider="${provider.displayName || provider.slug}" slug="${provider.slug}"`
      );
      liveLog(`[browser-discovery] query: ${query}`);
      let domains: string[] = [];
      let solved = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForTimeout(800);
        const pageText = await page.evaluate(() => (document.body?.innerText ?? '').slice(0, 7000));
        if (isCaptchaLikeText(pageText)) {
          liveLog(
            `[browser-discovery] captcha-suspected for provider="${provider.slug}" attempt=${attempt}; auto-pause ${captchaPauseMs}ms`
          );
          await page.waitForTimeout(captchaPauseMs);
          continue;
        }
        solved = true;
        domains = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          return anchors
            .map((a) => a.getAttribute('href') || '')
            .filter((href) => href.startsWith('http://') || href.startsWith('https://'));
        });
        break;
      }
      if (!solved) {
        liveLog(
          `[browser-discovery] skip provider due to persistent captcha: ${provider.slug}`
        );
        await page.waitForTimeout(delayMs);
        continue;
      }
      let acceptedThisProvider = 0;
      let rejectedThisProvider = 0;
      for (const href of domains) {
        const domain = normalizeDomain(href);
        if (!domain) {
          rejectedThisProvider += 1;
          rejected.set('invalid-domain', (rejected.get('invalid-domain') ?? 0) + 1);
          continue;
        }
        const skipReason = skipReasonForDiscoveredDomain(domain);
        if (skipReason) {
          rejectedThisProvider += 1;
          rejected.set(skipReason, (rejected.get(skipReason) ?? 0) + 1);
          liveLog(`[browser-discovery] rejected: ${domain} (${skipReason})`);
          continue;
        }
        const alreadyHad = found.has(domain);
        found.add(domain);
        if (alreadyHad) {
          rejectedThisProvider += 1;
          rejected.set('duplicate-domain', (rejected.get('duplicate-domain') ?? 0) + 1);
          continue;
        }
        acceptedThisProvider += 1;
        liveLog(`[browser-discovery] accepted: ${domain}`);
        if (found.size >= discoverLimit) break;
      }
      liveLog(
        `[browser-discovery] provider done: accepted=${acceptedThisProvider}, rejected=${rejectedThisProvider}, discovered_total=${found.size}`
      );
      await page.waitForTimeout(delayMs);
    }
    if (rejected.size > 0) {
      liveLog('[browser-discovery] rejection summary:');
      for (const [reason, count] of [...rejected.entries()].sort((a, b) => b[1] - a[1])) {
        liveLog(`- ${reason}: ${count}`);
      }
    }
  } finally {
    if (!showBrowser) {
      await browser.close();
    } else {
      liveLog('Browser left open for visibility. Close it manually when done.');
    }
  }
  return [...found];
}

function computeConfidence(report: Omit<DomainReport, 'confidenceScore'>): number {
  let score = 0;
  if (report.success) score += 10;
  if (report.emails.length > 0) score += 35;
  if (report.emails.some((email) => /^partners?@|affiliate@|bizdev@/.test(email))) {
    score += 15;
  }
  if (report.hasPartnershipSignals) score += 30;
  if (report.evidence.some((item) => item.matchedKeywords.length >= 2)) score += 10;
  return Math.max(0, Math.min(100, score));
}

function buildProviderContactRows(
  reports: DomainReport[],
  runId: string | null
): ProviderContactUpsertRow[] {
  const rows: ProviderContactUpsertRow[] = [];
  const nowIso = new Date().toISOString();
  const seen = new Set<string>();
  for (const report of reports) {
    const domain = report.domain.trim().toLowerCase();
    const partnerLinks = report.evidence
      .filter((item) => item.matchedKeywords.length > 0)
      .map((item) => item.url.trim())
      .filter(Boolean);
    for (const rawEmail of report.emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!isLikelyCampaignReadyEmail(email)) continue;
      const key = `email:${domain}:${email}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        run_id: runId,
        contact_key: key,
        domain,
        email,
        partner_url: partnerLinks[0] ?? null,
        evidence_url: report.evidence[0]?.url ?? null,
        confidence_score: report.confidenceScore,
        has_partnership_signal: report.hasPartnershipSignals,
        scanned_at: report.scannedAt,
        updated_at: nowIso
      });
    }
    for (const partnerUrl of partnerLinks) {
      const key = `partner:${domain}:${partnerUrl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        run_id: runId,
        contact_key: key,
        domain,
        email: null,
        partner_url: partnerUrl,
        evidence_url: partnerUrl,
        confidence_score: report.confidenceScore,
        has_partnership_signal: true,
        scanned_at: report.scannedAt,
        updated_at: nowIso
      });
    }
  }
  return rows;
}

async function persistProviderScanResultsToSupabase(
  reports: DomainReport[],
  startedAtIso: string
): Promise<void> {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    liveLog('Skip Supabase persistence: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    return;
  }
  const supabase = createClient(url, key);
  const uniqueEmails = new Set<string>();
  for (const report of reports) {
    for (const email of report.emails) {
      if (isLikelyCampaignReadyEmail(email)) uniqueEmails.add(email.trim().toLowerCase());
    }
  }
  const partnerDomainCount = reports.filter((item) => item.hasPartnershipSignals).length;
  const nowIso = new Date().toISOString();
  const runInsert = {
    started_at: startedAtIso,
    finished_at: nowIso,
    input_domain_count: reports.length,
    scanned_domain_count: reports.length,
    unique_emails_count: uniqueEmails.size,
    partner_domain_count: partnerDomainCount,
    status: 'ok',
    error_message: null,
    report_json_path: OUT_JSON,
    report_csv_path: OUT_CSV,
    live_log_path: OUT_LIVE_LOG
  };
  const { data: runRow, error: runError } = await supabase
    .from(PROVIDER_SCAN_RUNS_TABLE)
    .insert(runInsert)
    .select('id')
    .single();
  if (runError) {
    throw new Error(`Failed to insert provider scan run: ${runError.message}`);
  }
  const runId = String((runRow as { id?: string }).id ?? '');
  const rows = buildProviderContactRows(reports, runId || null);
  if (rows.length === 0) {
    liveLog(`Supabase run saved (${runId}) with 0 contact rows.`);
  } else {
    const { error: contactsError } = await supabase
      .from(PROVIDER_CONTACTS_TABLE)
      .upsert(rows, { onConflict: 'contact_key' });
    if (contactsError) {
      throw new Error(`Failed to upsert provider contacts: ${contactsError.message}`);
    }
    liveLog(`Supabase contacts upserted: run=${runId}, rows=${rows.length}`);
  }

  const domainRows = reports.map((report) => ({
    domain: report.domain.trim().toLowerCase(),
    last_run_id: runId || null,
    scanned_at: report.scannedAt,
    success: report.success,
    updated_at: nowIso
  }));
  const { error: domainScansError } = await supabase
    .from(PROVIDER_DOMAIN_SCANS_TABLE)
    .upsert(domainRows, { onConflict: 'domain' });
  if (domainScansError) {
    throw new Error(`Failed to upsert provider domain scans: ${domainScansError.message}`);
  }
  liveLog(`Supabase domain scan checkpoints updated: ${domainRows.length}`);
}

async function loadRecentlyScannedDomainsFromSupabase(
  rescanAfterDays: number
): Promise<Set<string>> {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return new Set<string>();
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from(PROVIDER_DOMAIN_SCANS_TABLE)
    .select('domain, scanned_at')
    .order('scanned_at', { ascending: false })
    .limit(50_000);
  if (error) {
    liveLog(`Skip scanned-domain prefilter (supabase error): ${error.message}`);
    // Fallback: use previous JSON report so reruns continue from domains not seen before.
    if (fs.existsSync(OUT_JSON)) {
      try {
        const raw = fs.readFileSync(OUT_JSON, 'utf8');
        const parsed = JSON.parse(raw) as { domain?: string; scannedAt?: string }[];
        const out = new Set<string>();
        const cutoffMs =
          rescanAfterDays > 0 ? Date.now() - rescanAfterDays * 24 * 60 * 60 * 1000 : null;
        for (const row of parsed ?? []) {
          const domain = String(row.domain ?? '')
            .trim()
            .toLowerCase();
          if (!domain) continue;
          if (cutoffMs != null) {
            const scannedAtMs = row.scannedAt ? Date.parse(row.scannedAt) : NaN;
            if (!Number.isFinite(scannedAtMs) || scannedAtMs < cutoffMs) continue;
          }
          out.add(domain);
        }
        liveLog(`Skip scanned fallback from JSON report: domains=${out.size}`);
        return out;
      } catch (fallbackError) {
        liveLog(
          `Skip scanned fallback JSON parse failed: ${
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }`
        );
      }
    }
    return new Set<string>();
  }
  const cutoffMs =
    rescanAfterDays > 0 ? Date.now() - rescanAfterDays * 24 * 60 * 60 * 1000 : null;
  const out = new Set<string>();
  for (const row of data ?? []) {
    const domain = String((row as { domain?: string }).domain ?? '')
      .trim()
      .toLowerCase();
    if (!domain) continue;
    if (cutoffMs != null) {
      const scannedAtRaw = String((row as { scanned_at?: string }).scanned_at ?? '').trim();
      const scannedAtMs = scannedAtRaw ? Date.parse(scannedAtRaw) : NaN;
      if (!Number.isFinite(scannedAtMs) || scannedAtMs < cutoffMs) continue;
    }
    out.add(domain);
  }
  return out;
}

async function inspectDomain(
  domain: string,
  signals: SignalsConfig,
  delayMs: number
): Promise<DomainReport> {
  const checkedUrls: string[] = [];
  const errors: string[] = [];
  const evidence: PageEvidence[] = [];
  const emailSet = new Set<string>();
  let success = false;
  const keywords = [...signals.keywordsRu, ...signals.keywordsEn];
  const urls = buildCandidateUrls(domain, signals.partnerPathCandidates);

  for (const url of urls) {
    checkedUrls.push(url);
    try {
      const res = await fetchWithRetry(url, 3);
      const status = res.status;
      if (!res.ok) {
        if (status >= 500) {
          errors.push(`${url} -> HTTP ${status}`);
        }
        await sleep(delayMs);
        continue;
      }
      success = true;
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('text/html')) {
        await sleep(delayMs);
        continue;
      }
      const html = await res.text();
      const text = stripHtml(html);
      const emails = extractEmailsFromHtml(html, signals.ignoreEmailFragments);
      for (const email of emails) emailSet.add(email);
      const matchedKeywords = detectKeywords(text, keywords);
      if (emails.length > 0 || matchedKeywords.length > 0) {
        const snippetKeyword = matchedKeywords[0] ?? '';
        evidence.push({
          url,
          status,
          matchedKeywords,
          snippet: snippetKeyword ? makeSnippet(text, snippetKeyword) : null,
          emails
        });
      }
    } catch (error) {
      errors.push(
        `${url} -> ${error instanceof Error ? error.message : String(error)}`
      );
    }
    await sleep(delayMs);
  }

  const base: Omit<DomainReport, 'confidenceScore'> = {
    domain,
    scannedAt: new Date().toISOString(),
    success,
    errors,
    checkedUrls,
    emails: [...emailSet],
    hasPartnershipSignals: evidence.some((item) => item.matchedKeywords.length > 0),
    evidence
  };
  return {
    ...base,
    confidenceScore: computeConfidence(base)
  };
}

async function inspectDomainWithBrowser(
  domain: string,
  signals: SignalsConfig,
  page: import('playwright').Page,
  delayMs: number
): Promise<DomainReport> {
  const checkedUrls: string[] = [];
  const errors: string[] = [];
  const evidence: PageEvidence[] = [];
  const emailSet = new Set<string>();
  let success = false;
  const keywords = [...signals.keywordsRu, ...signals.keywordsEn];
  const urls = buildCandidateUrls(domain, signals.partnerPathCandidates);

  for (const url of urls) {
    checkedUrls.push(url);
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000
      });
      const status = response?.status() ?? 0;
      if (!response || status >= 400) {
        if (status >= 500) errors.push(`${url} -> HTTP ${status}`);
        await page.waitForTimeout(delayMs);
        continue;
      }
      success = true;
      const html = await page.content();
      const text = stripHtml(html);
      const emails = extractEmailsFromHtml(html, signals.ignoreEmailFragments);
      for (const email of emails) emailSet.add(email);
      const matchedKeywords = detectKeywords(text, keywords);
      if (emails.length > 0 || matchedKeywords.length > 0) {
        const snippetKeyword = matchedKeywords[0] ?? '';
        evidence.push({
          url,
          status,
          matchedKeywords,
          snippet: snippetKeyword ? makeSnippet(text, snippetKeyword) : null,
          emails
        });
      }
    } catch (error) {
      errors.push(
        `${url} -> ${error instanceof Error ? error.message : String(error)}`
      );
    }
    await page.waitForTimeout(delayMs);
  }

  const base: Omit<DomainReport, 'confidenceScore'> = {
    domain,
    scannedAt: new Date().toISOString(),
    success,
    errors,
    checkedUrls,
    emails: [...emailSet],
    hasPartnershipSignals: evidence.some((item) => item.matchedKeywords.length > 0),
    evidence
  };
  return {
    ...base,
    confidenceScore: computeConfidence(base)
  };
}

async function runQueue<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  worker: (item: TIn, index: number) => Promise<TOut>
): Promise<TOut[]> {
  const results: TOut[] = new Array(items.length);
  let nextIndex = 0;

  async function consume(): Promise<void> {
    while (true) {
      const current = nextIndex;
      if (current >= items.length) return;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => consume())
  );
  return results;
}

function csvEscape(value: string): string {
  const quoted = value.replace(/"/g, '""');
  return `"${quoted}"`;
}

function buildCsvRow(report: DomainReport): string {
  const firstEvidence = report.evidence[0] ?? null;
  const cols = [
    report.domain,
    report.success ? 'yes' : 'no',
    report.hasPartnershipSignals ? 'yes' : 'no',
    String(report.confidenceScore),
    report.emails.join(';'),
    firstEvidence?.url ?? '',
    (firstEvidence?.matchedKeywords ?? []).join(';'),
    firstEvidence?.snippet ?? '',
    String(report.errors.length)
  ];
  return cols.map(csvEscape).join(',');
}

function writeOutputs(reports: DomainReport[]): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(reports, null, 2)}\n`, 'utf8');

  const header = [
    'domain',
    'success',
    'hasPartnershipSignals',
    'confidenceScore',
    'emails',
    'evidenceUrl',
    'matchedKeywords',
    'evidenceSnippet',
    'errorCount'
  ];
  const rows = [header.map(csvEscape).join(','), ...reports.map(buildCsvRow)];
  fs.writeFileSync(OUT_CSV, `${rows.join('\n')}\n`, 'utf8');
}

function writeDiscoveredDomains(domains: string[]): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = ['domain', ...domains];
  fs.writeFileSync(OUT_DISCOVERED, `${rows.join('\n')}\n`, 'utf8');
}

function isMissingSupabaseTableError(message: string): boolean {
  return (
    message.includes("Could not find the table 'public.provider_partnership_scan_runs'") ||
    message.includes("Could not find the table 'public.provider_partnership_contacts'") ||
    message.includes("Could not find the table 'public.provider_partnership_domain_scans'")
  );
}

function printSummary(reports: DomainReport[]): void {
  const withEmail = reports.filter((item) => item.emails.length > 0).length;
  const withPartnerSignal = reports.filter((item) => item.hasPartnershipSignals).length;
  const top = [...reports]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 10);

  console.log(`Scanned domains: ${reports.length}`);
  console.log(`Domains with email: ${withEmail}`);
  console.log(`Domains with partnership signals: ${withPartnerSignal}`);
  console.log(`JSON report: ${OUT_JSON}`);
  console.log(`CSV report: ${OUT_CSV}`);
  console.log('Top leads:');
  for (const item of top) {
    console.log(
      `- ${item.domain} | score=${item.confidenceScore} | email=${item.emails[0] ?? '-'} | partner=${item.hasPartnershipSignals ? 'yes' : 'no'}`
    );
  }
}

async function main() {
  const startedAtIso = new Date().toISOString();
  const appendLiveLog = hasFlag('append-live-log');
  resetLiveLog(appendLiveLog);
  const inputPath = path.resolve(parseArg('input') ?? DEFAULT_INPUT);
  const configPath = path.resolve(parseArg('config') ?? DEFAULT_CONFIG);
  const concurrency = parseNumberArg('concurrency', 3);
  const delayMs = parseNumberArg('delay-ms', 650);
  const limit = parseNumberArg('limit', 0);
  const discoverWeb = hasFlag('discover-web');
  const fromSite = hasFlag('from-site');
  const showBrowser = hasFlag('show-browser') || fromSite;
  const fromSiteLimit = parseNumberArg('from-site-limit', 300);
  const discoverLimit = parseNumberArg('discover-limit', 250);
  const captchaPauseMs = parseNumberArg('captcha-pause-ms', 90_000);
  /**
   * For site-provider runs we keep browser scan on by default so the operator
   * always sees what the scanner is doing in real time.
   */
  const scanInBrowser = hasFlag('scan-in-browser') || fromSite;
  const skipScanned = hasFlag('skip-scanned');
  const rescanAfterDaysRaw = parseNumberArg('rescan-after-days', 0);
  const rescanAfterDays = Math.max(0, rescanAfterDaysRaw);
  const discoverQueries = parseListArg('discover-queries');

  const signals = loadSignals(configPath);
  const seedDomains = readSeedDomains(inputPath);
  let allDomains = [...seedDomains];

  if (fromSite) {
    const providers = await fetchProvidersFromSite(fromSiteLimit);
    liveLog(`Loaded providers from site: ${providers.length}`);
    const fromOfficial = providers
      .map((item) => normalizeDomain(item.officialUrl ?? ''))
      .filter((item): item is string => Boolean(item));
    allDomains = [...new Set([...allDomains, ...fromOfficial])];
    if (discoverWeb) {
      const discoveredByBrowser = await discoverDomainsWithBrowser(
        providers,
        discoverLimit,
        showBrowser,
        delayMs,
        captchaPauseMs
      );
      writeDiscoveredDomains(discoveredByBrowser);
      liveLog(`Discovered with browser: ${discoveredByBrowser.length}`);
      allDomains = [...new Set([...allDomains, ...discoveredByBrowser])];
    }
  }

  if (discoverWeb) {
    const webQueries =
      discoverQueries.length > 0 ? discoverQueries : DEFAULT_DISCOVER_QUERIES;
    console.log(`Web discovery enabled. Queries: ${webQueries.length}`);
    const discovered = await discoverProviderDomainsFromWeb(
      webQueries,
      delayMs,
      discoverLimit
    );
    writeDiscoveredDomains(discovered);
    liveLog(`Discovered from web: ${discovered.length}`);
    liveLog(`Discovered domains saved: ${OUT_DISCOVERED}`);
    allDomains = [...new Set([...allDomains, ...discovered])];
  }
  let target = limit > 0 ? allDomains.slice(0, limit) : allDomains;
  if (skipScanned) {
    const scanned = await loadRecentlyScannedDomainsFromSupabase(rescanAfterDays);
    if (scanned.size > 0) {
      const before = target.length;
      target = target.filter((domain) => !scanned.has(domain));
      liveLog(
        `Skip scanned enabled: removed=${before - target.length}, remaining=${target.length}, scanned_cache=${scanned.size}, rescan_after_days=${rescanAfterDays}`
      );
    } else {
      liveLog('Skip scanned enabled, but no scanned domains loaded from Supabase.');
    }
  }

  if (target.length === 0) {
    console.log('No domains to scan. Check input CSV.');
    process.exit(0);
  }

  console.log(`Input: ${inputPath}`);
  console.log(`Config: ${configPath}`);
  console.log(`Seed domains: ${seedDomains.length}`);
  console.log(`Total unique domains after discovery: ${allDomains.length}`);
  console.log(`Domains queued: ${target.length}`);
  console.log(`Concurrency: ${concurrency}, delay: ${delayMs}ms`);

  let reports: DomainReport[] = [];
  if (scanInBrowser) {
    let playwright: typeof import('playwright');
    try {
      playwright = await import('playwright');
    } catch {
      throw new Error(
        'Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium'
      );
    }
    const browser = await playwright.chromium.launch({ headless: false, slowMo: 80 });
    const page = await browser.newPage();
    try {
      for (let i = 0; i < target.length; i++) {
        const domain = target[i];
        liveLog(`[scan-in-browser ${i + 1}/${target.length}] ${domain}`);
        const report = await inspectDomainWithBrowser(domain, signals, page, delayMs);
        reports.push(report);
      }
    } finally {
      liveLog('Domain scan browser left open for visibility. Close manually when done.');
    }
  } else {
    reports = await runQueue(target, concurrency, async (domain, index) => {
      console.log(`[${index + 1}/${target.length}] ${domain}`);
      return inspectDomain(domain, signals, delayMs);
    });
  }

  writeOutputs(reports);
  printSummary(reports);
  try {
    await persistProviderScanResultsToSupabase(reports, startedAtIso);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingSupabaseTableError(message)) {
      liveLog(`Skip Supabase persistence: ${message}`);
    } else {
      throw error;
    }
  }
  await sendProviderDiscoveryTelegramSummary(reports);
  liveLog(`Live log saved: ${OUT_LIVE_LOG}`);
}

main().catch((error) => {
  console.error(error);
  void sendProviderDiscoveryTelegramFailure(
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
