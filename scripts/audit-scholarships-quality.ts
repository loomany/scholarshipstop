/**
 * Read-only scholarships catalog quality audit.
 *
 *   dotenv -e .env.local -- npx tsx scripts/audit-scholarships-quality.ts
 *   dotenv -e .env.local -- npx tsx scripts/audit-scholarships-quality.ts --check-urls
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'scholarships-quality');

const BATCH_SIZE = 800;
const NEAR_JACCARD_MIN = 0.82;
const NEAR_LEV_MIN = 0.88;
const NEAR_MAX_PAIRS = 12_000;
const NEAR_BLOCK_COMPARE_CAP = 80;

const STOP_WORDS = new Set([
  'scholarship',
  'scholarships',
  'grant',
  'grants',
  'award',
  'awards',
  'funding',
  'program',
  'programs',
  'application',
  'applications',
  'apply',
  'the',
  'a',
  'an',
  'for',
  'and',
  'or',
  'of',
  'to',
  'in',
  'at'
]);

const POSITIVE_RE =
  /scholarship|scholarships|\bgrant\b|\bgrants\b|fellowship|fellowships|bursar|financial aid|tuition|\baward\b|\bfunding\b|stipend|\bstudent|\bstudents|undergraduate|graduate|\bcollege\b|\buniversity\b/i;

const ANTI_RE =
  /\bloan\b|\bjob\b|\bvacancy\b|internship only|course only|bootcamp only|credit card|\bcasino\b|\bbetting\b|\bcoupon\b|\bdiscount\b|\binsurance\b|\bmortgage\b|\bcrypto\b|\badult\b|\blogin\b|sign\s*in|privacy policy|terms of service/i;

const GARBAGE_RE =
  /undefined|\bnull\b|\bNaN\b|lorem ipsum|click here|read more|coming soon|page not found|access denied|\bsubscribe\b|javascript:|cookie policy|\badvertisement\b/i;

type Row = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'title'
  | 'description'
  | 'summary_short'
  | 'summary_long'
  | 'provider_name'
  | 'provider_url'
  | 'url'
  | 'apply_url'
  | 'source'
  | 'award_amount_text'
  | 'deadline_text'
  | 'deadline_date'
  | 'is_active'
  | 'category'
  | 'slug'
  | 'created_at'
>;

function parseArgs(argv: string[]) {
  return { wantUrlProbe: argv.includes('--check-urls') };
}

function ensureReportDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function csvEscape(s: string): string {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function csvRow(cols: string[]): string {
  return cols.map(csvEscape).join(',');
}

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordTokens(norm: string): string[] {
  return norm.split(/\s+/).filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n]!;
}

function levRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length, 1);
}

function canonicalPrimaryUrl(url: string | null, applyUrl: string | null): string | null {
  const raw = (applyUrl?.trim() || url?.trim() || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    u.hash = '';
    let p = u.pathname.replace(/\/+$/, '');
    if (!p) p = '/';
    u.pathname = p;
    return u.href;
  } catch {
    return raw;
  }
}

function combinedDescription(r: Row): string {
  return [r.description, r.summary_short, r.summary_long].filter(Boolean).join('\n');
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isExpiredDeadline(deadlineDate: string | null): boolean {
  if (!deadlineDate) return false;
  const d = deadlineDate.slice(0, 10);
  return d < todayUtc();
}

function deadlineYearBad(deadlineDate: string | null): boolean {
  if (!deadlineDate) return false;
  const y = Number(deadlineDate.slice(0, 4));
  return !Number.isFinite(y) || y < 1990 || y > 2037;
}

function titleGarbageSymbols(title: string): boolean {
  if (!title.trim()) return false;
  const nonAlnum = title.replace(/[a-zA-Z0-9\s]/g, '').length;
  return nonAlnum > title.length * 0.35;
}

function tooManyDigits(title: string): boolean {
  const digits = (title.match(/\d/g) || []).length;
  return title.length > 0 && digits > title.length * 0.45;
}

function hasPositiveKeywordBlob(r: Row): boolean {
  const blob =
    `${r.title}\n${combinedDescription(r)}\n${r.category ?? ''}`.toLowerCase();
  return POSITIVE_RE.test(blob);
}

function hasAntiKeywordBlob(r: Row): boolean {
  const blob = `${r.title}\n${combinedDescription(r)}`.toLowerCase();
  return ANTI_RE.test(blob);
}

function hasGarbageBlob(r: Row): boolean {
  const blob = `${r.title}\n${combinedDescription(r)}`.toLowerCase();
  return GARBAGE_RE.test(blob);
}

type ScoreResult = {
  score: number;
  reasons: string[];
  bucket: 'good' | 'ok' | 'needs_review' | 'likely_trash';
};

function classifyBucket(score: number): ScoreResult['bucket'] {
  if (score >= 80) return 'good';
  if (score >= 60) return 'ok';
  if (score >= 40) return 'needs_review';
  return 'likely_trash';
}

function computeScore(opts: {
  r: Row;
  desc: string;
  primaryUrl: string | null;
  exactDup: boolean;
  nearDup: boolean;
}): ScoreResult {
  const { r, desc, primaryUrl, exactDup, nearDup } = opts;
  const reasons: string[] = [];
  let score = 100;

  const title = (r.title ?? '').trim();
  if (!title) {
    score -= 40;
    reasons.push('missing_title');
  } else if (title.length < 10) {
    score -= 20;
    reasons.push('short_title');
  }

  if (!desc.trim()) {
    score -= 30;
    reasons.push('missing_description');
  } else if (desc.trim().length < 100) {
    score -= 20;
    reasons.push('short_description');
  }

  if (!(r.provider_name ?? '').trim()) {
    score -= 10;
    reasons.push('missing_provider');
  }

  if (!primaryUrl) {
    score -= 15;
    reasons.push('missing_url');
  }

  if (!(r.deadline_date ?? '').trim() && !(r.deadline_text ?? '').trim()) {
    score -= 10;
    reasons.push('missing_deadline');
  }

  if (isExpiredDeadline(r.deadline_date)) {
    score -= 15;
    reasons.push('expired_deadline');
  }

  if (!hasPositiveKeywordBlob(r)) {
    score -= 25;
    reasons.push('no_grant_keywords');
  }

  if (hasAntiKeywordBlob(r)) {
    score -= 30;
    reasons.push('anti_keywords');
  }

  if (exactDup) {
    score -= 40;
    reasons.push('exact_duplicate_group');
  }

  if (nearDup) {
    score -= 25;
    reasons.push('near_duplicate');
  }

  if (hasGarbageBlob(r)) {
    score -= 30;
    reasons.push('parser_garbage');
  }

  if (titleGarbageSymbols(title)) {
    score -= 15;
    reasons.push('title_symbol_noise');
  }

  if (tooManyDigits(title)) {
    score -= 10;
    reasons.push('title_digit_heavy');
  }

  if (desc.trim() && title && desc.trim().toLowerCase() === title.toLowerCase()) {
    score -= 15;
    reasons.push('description_equals_title');
  }

  if (deadlineYearBad(r.deadline_date)) {
    score -= 10;
    reasons.push('deadline_year_suspicious');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons, bucket: classifyBucket(score) };
}

async function fetchAllRows(): Promise<Row[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const selectCols =
    'id,title,description,summary_short,summary_long,provider_name,provider_url,url,apply_url,source,award_amount_text,deadline_text,deadline_date,is_active,category,slug,created_at';

  const out: Row[] = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(selectCols)
      .order('id', { ascending: true })
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error('Supabase select error:', error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    out.push(...(data as Row[]));
    process.stderr.write(`\rFetched ${out.length} scholarships…`);
    if (data.length < BATCH_SIZE) break;
  }
  process.stderr.write('\n');
  return out;
}

type DupRecord = { key: string; kind: string; groupSize: number };

function buildExactDupMaps(rows: Row[]) {
  const normTitle = (r: Row) => normalizeTitle(r.title ?? '');
  const normProv = (r: Row) => normalizeTitle(r.provider_name ?? '');
  const normAmt = (r: Row) => normalizeTitle(r.award_amount_text ?? '');

  const groupsTitle = new Map<string, Row[]>();
  const groupsTitleProv = new Map<string, Row[]>();
  const groupsUrl = new Map<string, Row[]>();
  const groupsTitleDeadline = new Map<string, Row[]>();
  const groupsTitleAmt = new Map<string, Row[]>();

  for (const r of rows) {
    const nt = normTitle(r);
    if (nt) {
      pushMap(groupsTitle, nt, r);
      const np = normProv(r);
      if (np) pushMap(groupsTitleProv, `${nt}||${np}`, r);
      const nd = (r.deadline_date ?? '').trim();
      if (nd) pushMap(groupsTitleDeadline, `${nt}||${nd}`, r);
      const na = normAmt(r);
      if (na) pushMap(groupsTitleAmt, `${nt}||${na}`, r);
    }
    const u = canonicalPrimaryUrl(r.url, r.apply_url);
    if (u) pushMap(groupsUrl, u, r);
  }

  const dupRecords = new Map<string, DupRecord>();
  const exactDupIds = new Set<string>();

  const ingest = (kind: string, m: Map<string, Row[]>) => {
    for (const [k, list] of m) {
      if (list.length <= 1) continue;
      const key = `${kind}:${k}`;
      dupRecords.set(key, { key, kind, groupSize: list.length });
      for (const r of list) exactDupIds.add(r.id);
    }
  };

  ingest('norm_title', groupsTitle);
  ingest('title_provider', groupsTitleProv);
  ingest('primary_url', groupsUrl);
  ingest('title_deadline', groupsTitleDeadline);
  ingest('title_amount', groupsTitleAmt);

  return {
    dupRecords,
    exactDupIds,
    groupsTitle,
    groupsTitleProv,
    groupsUrl,
    groupsTitleDeadline,
    groupsTitleAmt
  };
}

function pushMap(m: Map<string, Row[]>, k: string, r: Row) {
  const arr = m.get(k);
  if (arr) arr.push(r);
  else m.set(k, [r]);
}

function buildNearPairs(rows: Row[]): { pairs: NearPair[]; nearIds: Set<string> } {
  const blocks = new Map<string, Row[]>();
  for (const r of rows) {
    const nt = normalizeTitle(r.title ?? '');
    const words = wordTokens(nt);
    const prefix =
      words.slice(0, 5).join(' ') || nt.slice(0, Math.min(48, nt.length)) || '_empty_';
    const src = (r.source ?? 'null').trim().toLowerCase() || 'null';
    const bk = `${src}::${prefix}`;
    pushMap(blocks, bk, r);
  }

  const seenPair = new Set<string>();
  const pairs: NearPair[] = [];
  const nearIds = new Set<string>();

  const addPair = (a: Row, b: Row, score: number, reason: string) => {
    if (a.id === b.id) return;
    const [x, y] = a.id < b.id ? [a, b] : [b, a];
    const pk = `${x.id}#${y.id}`;
    if (seenPair.has(pk)) return;
    seenPair.add(pk);
    pairs.push({
      id: x.id,
      matched_id: y.id,
      title: (x.title ?? '').slice(0, 500),
      provider: (x.provider_name ?? '').slice(0, 300),
      similarity_score: score,
      matched_title: (y.title ?? '').slice(0, 500),
      reason
    });
    nearIds.add(x.id);
    nearIds.add(y.id);
  };

  for (const [, list] of blocks) {
    if (list.length < 2) continue;
    const n = Math.min(list.length, NEAR_BLOCK_COMPARE_CAP);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (pairs.length >= NEAR_MAX_PAIRS) return { pairs, nearIds };
        const a = list[i]!;
        const b = list[j]!;
        const na = normalizeTitle(a.title ?? '');
        const nb = normalizeTitle(b.title ?? '');
        if (!na || !nb) continue;
        const sa = new Set(wordTokens(na));
        const sb = new Set(wordTokens(nb));
        const jac = jaccard(sa, sb);
        let reason = '';
        let sim = jac;
        if (jac >= NEAR_JACCARD_MIN) {
          reason = `jaccard_words:${jac.toFixed(3)}`;
        } else if (na.length < 120 && nb.length < 120) {
          const lr = levRatio(na, nb);
          if (lr >= NEAR_LEV_MIN) {
            sim = lr;
            reason = `levenshtein:${lr.toFixed(3)}`;
          }
        }
        if (reason) addPair(a, b, Math.round(sim * 1000) / 1000, reason);
      }
    }
  }

  return { pairs, nearIds };
}

type NearPair = {
  id: string;
  matched_id: string;
  title: string;
  provider: string;
  similarity_score: number;
  matched_title: string;
  reason: string;
};

async function probeUrls(urls: string[], concurrency: number) {
  const results: { url: string; status: string; detail: string }[] = [];
  let idx = 0;

  async function worker() {
    for (;;) {
      const i = idx++;
      if (i >= urls.length) return;
      const u = urls[i]!;
      let status = 'network_error';
      let detail = '';
      try {
        new URL(u);
      } catch {
        results.push({ url: u, status: 'invalid_url', detail: '' });
        continue;
      }
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 10_000);
        const res = await fetch(u, {
          method: 'GET',
          redirect: 'manual',
          signal: c.signal,
          headers: { Range: 'bytes=0-0' }
        });
        clearTimeout(t);
        status = mapStatus(res.status);
      } catch (e) {
        detail = e instanceof Error ? e.message : String(e);
        status = detail.includes('abort') ? 'timeout' : 'network_error';
      }
      results.push({ url: u, status, detail });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function mapStatus(code: number): string {
  if (code >= 200 && code < 300) return '200_ok';
  if (code === 301 || code === 302 || code === 303 || code === 307 || code === 308)
    return `${code}_redirect`;
  if (code === 403) return '403_forbidden';
  if (code === 404) return '404_not_found';
  if (code === 410) return '410_gone';
  return `http_${code}`;
}

async function main() {
  const { wantUrlProbe } = parseArgs(process.argv.slice(2));
  ensureReportDir();

  const rows = await fetchAllRows();
  const total = rows.length;
  const active = rows.filter((r) => coalesceActive(r)).length;

  const {
    dupRecords,
    exactDupIds,
    groupsTitle,
    groupsTitleProv,
    groupsUrl,
    groupsTitleDeadline,
    groupsTitleAmt
  } = buildExactDupMaps(rows);
  const normTitleUnique = groupsTitle.size;
  let exactDupRowCount = 0;
  for (const [, list] of groupsTitle) {
    if (list.length > 1) exactDupRowCount += list.length;
  }

  const { pairs: nearPairs, nearIds } = buildNearPairs(rows);

  const missingUrl = rows.filter(
    (r) => !canonicalPrimaryUrl(r.url, r.apply_url)
  ).length;
  const missingDeadline = rows.filter(
    (r) => !(r.deadline_date ?? '').trim() && !(r.deadline_text ?? '').trim()
  ).length;
  const expired = rows.filter((r) => isExpiredDeadline(r.deadline_date)).length;

  const scored: {
    r: Row;
    score: ScoreResult;
    desc: string;
    primaryUrl: string | null;
  }[] = [];

  const weakRows: {
    id: string;
    title: string;
    reason: string;
    missing_fields: string;
  }[] = [];

  const suspiciousRows: {
    id: string;
    title: string;
    provider: string;
    url: string;
    reason: string;
    quality_score: number;
  }[] = [];

  const expiredRows: { id: string; title: string; deadline: string; url: string }[] =
    [];

  let good = 0,
    ok = 0,
    rev = 0,
    trash = 0;

  for (const r of rows) {
    const desc = combinedDescription(r);
    const primaryUrl = canonicalPrimaryUrl(r.url, r.apply_url);
    const score = computeScore({
      r,
      desc,
      primaryUrl,
      exactDup: exactDupIds.has(r.id),
      nearDup: nearIds.has(r.id)
    });
    scored.push({ r, score, desc, primaryUrl });

    if (score.bucket === 'good') good++;
    else if (score.bucket === 'ok') ok++;
    else if (score.bucket === 'needs_review') rev++;
    else trash++;

    const missingFields: string[] = [];
    if (!(r.title ?? '').trim()) missingFields.push('title');
    if (!desc.trim()) missingFields.push('description');
    if (!(r.provider_name ?? '').trim()) missingFields.push('provider_name');
    if (!primaryUrl) missingFields.push('url');
    if (!(r.deadline_date ?? '').trim() && !(r.deadline_text ?? '').trim()) {
      missingFields.push('deadline');
    }

    if (
      missingFields.length ||
      (r.title ?? '').trim().length < 10 ||
      (desc.trim().length > 0 && desc.trim().length < 100) ||
      hasGarbageBlob(r)
    ) {
      const wr: string[] = [];
      if (missingFields.length) wr.push(`missing:${missingFields.join('+')}`);
      if ((r.title ?? '').trim().length < 10) wr.push('short_title');
      if (desc.trim().length > 0 && desc.trim().length < 100)
        wr.push('short_description');
      if (hasGarbageBlob(r)) wr.push('garbage_phrase');
      weakRows.push({
        id: r.id,
        title: (r.title ?? '').slice(0, 400),
        reason: wr.join(';'),
        missing_fields: missingFields.join('|')
      });
    }

    if (
      hasAntiKeywordBlob(r) ||
      (!hasPositiveKeywordBlob(r) && score.score < 55)
    ) {
      suspiciousRows.push({
        id: r.id,
        title: (r.title ?? '').slice(0, 400),
        provider: (r.provider_name ?? '').slice(0, 200),
        url: primaryUrl ?? '',
        reason: [
          hasAntiKeywordBlob(r) ? 'anti_keyword_hit' : '',
          !hasPositiveKeywordBlob(r) ? 'no_positive_keywords' : ''
        ]
          .filter(Boolean)
          .join(';'),
        quality_score: score.score
      });
    }

    if (isExpiredDeadline(r.deadline_date)) {
      expiredRows.push({
        id: r.id,
        title: (r.title ?? '').slice(0, 400),
        deadline: (r.deadline_date ?? r.deadline_text ?? '').slice(0, 80),
        url: primaryUrl ?? ''
      });
    }
  }

  scored.sort((a, b) => a.score.score - b.score.score);
  const top200 = scored.slice(0, 200);
  const top50Manual = scored.slice(0, 50);

  const dupCsvLines: string[] = [
    csvRow(['id', 'title', 'provider', 'url', 'duplicate_key', 'duplicate_group_size'])
  ];

  function appendExactDupCsv(kind: string, m: Map<string, Row[]>) {
    for (const [k, list] of m) {
      if (list.length <= 1) continue;
      const dupKey = `${kind}:${k}`;
      for (const r of list) {
        const primaryUrl = canonicalPrimaryUrl(r.url, r.apply_url) ?? '';
        dupCsvLines.push(
          csvRow([
            r.id,
            r.title ?? '',
            r.provider_name ?? '',
            primaryUrl,
            dupKey,
            String(list.length)
          ])
        );
      }
    }
  }

  appendExactDupCsv('norm_title', groupsTitle);
  appendExactDupCsv('title_provider', groupsTitleProv);
  appendExactDupCsv('primary_url', groupsUrl);
  appendExactDupCsv('title_deadline', groupsTitleDeadline);
  appendExactDupCsv('title_amount', groupsTitleAmt);

  const nearCsvLines: string[] = [
    csvRow([
      'id',
      'title',
      'provider',
      'similarity_score',
      'matched_id',
      'matched_title',
      'reason'
    ])
  ];
  for (const p of nearPairs) {
    nearCsvLines.push(
      csvRow([
        p.id,
        p.title,
        p.provider,
        String(p.similarity_score),
        p.matched_id,
        p.matched_title,
        p.reason
      ])
    );
  }

  const suspCsv = [
    csvRow(['id', 'title', 'provider', 'url', 'reason', 'quality_score']),
    ...suspiciousRows.map((x) =>
      csvRow([
        x.id,
        x.title,
        x.provider,
        x.url,
        x.reason,
        String(x.quality_score)
      ])
    )
  ];

  const weakCsv = [
    csvRow(['id', 'title', 'reason', 'missing_fields']),
    ...weakRows.map((x) => csvRow([x.id, x.title, x.reason, x.missing_fields]))
  ];

  const expCsv = [
    csvRow(['id', 'title', 'deadline', 'url']),
    ...expiredRows.map((x) => csvRow([x.id, x.title, x.deadline, x.url]))
  ];

  const manual200Csv = [
    csvRow(['id', 'title', 'provider', 'url', 'quality_score', 'reasons']),
    ...top200.map(({ r, score, primaryUrl }) =>
      csvRow([
        r.id,
        (r.title ?? '').slice(0, 500),
        (r.provider_name ?? '').slice(0, 300),
        primaryUrl ?? '',
        String(score.score),
        score.reasons.join(';')
      ])
    )
  ];

  const scoreById = new Map(scored.map((x) => [x.r.id, x.score.score]));

  const sourceAgg = new Map<
    string,
    {
      total: number;
      dup: number;
      susp: number;
      weak: number;
      expired: number;
      scoreSum: number;
    }
  >();

  const weakId = new Set(weakRows.map((w) => w.id));
  const suspId = new Set(suspiciousRows.map((s) => s.id));

  for (const r of rows) {
    const src = (r.source ?? '(null)').trim() || '(null)';
    const g =
      sourceAgg.get(src) ??
      { total: 0, dup: 0, susp: 0, weak: 0, expired: 0, scoreSum: 0 };
    g.total++;
    if (exactDupIds.has(r.id)) g.dup++;
    if (suspId.has(r.id)) g.susp++;
    if (weakId.has(r.id)) g.weak++;
    if (isExpiredDeadline(r.deadline_date)) g.expired++;
    g.scoreSum += scoreById.get(r.id) ?? 0;
    sourceAgg.set(src, g);
  }

  const sourceCsvLines: string[] = [
    csvRow([
      'source',
      'total',
      'duplicates_count',
      'suspicious_count',
      'weak_count',
      'expired_count',
      'quality_score_avg'
    ])
  ];

  const sourceRows = [...sourceAgg.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [src, g] of sourceRows) {
    const avg = g.total ? Math.round((g.scoreSum / g.total) * 100) / 100 : 0;
    sourceCsvLines.push(
      csvRow([
        src,
        String(g.total),
        String(g.dup),
        String(g.susp),
        String(g.weak),
        String(g.expired),
        String(avg)
      ])
    );
  }

  const worstSources = [...sourceAgg.entries()]
    .filter(([, g]) => g.total >= 5)
    .map(([src, g]) => ({
      source: src,
      total: g.total,
      suspicious_pct: Math.round((g.susp / g.total) * 1000) / 10,
      weak_pct: Math.round((g.weak / g.total) * 1000) / 10,
      avg_score: Math.round((g.scoreSum / g.total) * 100) / 100
    }))
    .sort(
      (a, b) =>
        b.suspicious_pct - a.suspicious_pct ||
        b.weak_pct - a.weak_pct ||
        a.avg_score - b.avg_score
    )
    .slice(0, 20);

  fs.writeFileSync(path.join(REPORT_DIR, 'duplicates-exact.csv'), dupCsvLines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'duplicates-near.csv'), nearCsvLines.join('\n'), 'utf8');
  fs.writeFileSync(
    path.join(REPORT_DIR, 'suspicious-non-scholarships.csv'),
    suspCsv.join('\n'),
    'utf8'
  );
  fs.writeFileSync(path.join(REPORT_DIR, 'weak-content.csv'), weakCsv.join('\n'), 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'expired.csv'), expCsv.join('\n'), 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'source-quality.csv'), sourceCsvLines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'manual-review-top-200.csv'), manual200Csv.join('\n'), 'utf8');

  const summary = {
    generatedAt: new Date().toISOString(),
    total_scholarships: total,
    active_is_active_true: active,
    unique_normalized_titles: normTitleUnique,
    exact_duplicate_title_groups_over_1: [...groupsTitle.values()].filter((l) => l.length > 1)
      .length,
    exact_duplicate_title_rows_affected: exactDupRowCount,
    exact_duplicate_metric_any_key_rows: exactDupIds.size,
    near_duplicate_pairs_reported: nearPairs.length,
    near_duplicate_rows_touched: nearIds.size,
    missing_primary_url: missingUrl,
    missing_deadline: missingDeadline,
    expired_deadline_date: expired,
    quality_distribution: {
      good_80_plus: good,
      ok_60_79: ok,
      needs_review_40_59: rev,
      likely_trash_0_39: trash,
      pct_good: pct(good, total),
      pct_ok: pct(ok, total),
      pct_review: pct(rev, total),
      pct_trash: pct(trash, total)
    },
    duplicate_keys_multi_kind: dupRecords.size,
    top_20_worst_sources: worstSources,
    top_50_manual_review: top50Manual.map(({ r, score, primaryUrl }) => ({
      id: r.id,
      title: (r.title ?? '').slice(0, 200),
      provider: (r.provider_name ?? '').slice(0, 120),
      url: primaryUrl ?? '',
      quality_score: score.score,
      reasons: score.reasons
    }))
  };

  fs.writeFileSync(
    path.join(REPORT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  if (wantUrlProbe) {
    const urlSet = new Set<string>();
    for (const r of rows) {
      const u = canonicalPrimaryUrl(r.url, r.apply_url);
      if (u?.startsWith('http')) urlSet.add(u);
    }
    const urls = [...urlSet].slice(0, 2500);
    console.error(`Checking ${urls.length} unique URLs (cap 2500)…`);
    const urlResults = await probeUrls(urls, 8);
    const lines = [
      csvRow(['url', 'status', 'detail']),
      ...urlResults.map((x) => csvRow([x.url, x.status, x.detail]))
    ];
    fs.writeFileSync(path.join(REPORT_DIR, 'url-status.csv'), lines.join('\n'), 'utf8');
  }

  console.log(JSON.stringify(summary, null, 2));

  console.error('\nReports written to:', REPORT_DIR);
}

function coalesceActive(r: Row): boolean {
  return r.is_active === true;
}

function pct(n: number, d: number): number {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
