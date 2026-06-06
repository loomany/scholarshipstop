/**
 * Stage 5 — Read-only application readiness / paid content usefulness audit.
 * SELECT only; no UPDATE/DELETE; no URL probing; no AI APIs.
 *
 *   npm run scholarships:audit-application-readiness
 *
 * Env (via dotenv): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_ROOT = path.join(
  __dirname,
  '..',
  'reports',
  'customer-value-audit'
);
const QUALITY_DIR = path.join(
  __dirname,
  '..',
  'reports',
  'scholarships-quality'
);

const TARGET_SAMPLE = 2500;
const FETCH_CHUNK = 180;

type Row = Database['public']['Tables']['scholarships']['Row'];

type StratFlags = {
  weakCsv: boolean;
  likelyTrashCsv: boolean;
  expiredCsv: boolean;
  duplicateCsv: boolean;
  suspiciousCsv: boolean;
};

type ScoredRow = {
  row: Row;
  score: number;
  bucket:
    | 'ready_to_apply'
    | 'usable_but_needs_check'
    | 'weak_paid_value'
    | 'not_subscription_worthy';
  flags: StratFlags;
  reasons: string[];
};

const SOURCE_TARGETS = [
  'bigfuture',
  'mastersportal',
  'scholarships_com',
  'scholarships360',
  'daad',
  'iefa',
  'bold_org',
  'scholarship_america',
  'scholars4dev'
] as const;

const AGGREGATOR_RE =
  /scholarships360|scholarships\.com|mastersportal\.com|bigfuture\.collegeboard|daad\.de\/deutschland\/stipendium\/datenbank|scholars4dev\.com|bold\.org|iefa\.org|scholarshipamerica\.org/i;

const TITLE_TEMPLATE_RE =
  /: eligibility|deadline|how to apply|application deadline|guide\s*$/i;

function csvEscape(s: string): string {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function csvRow(
  cols: (string | number | boolean | null | undefined)[]
): string {
  return cols.map((c) => csvEscape(c == null ? '' : String(c))).join(',');
}

function ensureDirs() {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
}

function parseCsvIds(
  filePath: string,
  maxRows: number
): { ids: string[]; extra?: Map<string, string> } {
  if (!fs.existsSync(filePath)) return { ids: [] };
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { ids: [] };
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf('id');
  if (idIdx < 0) return { ids: [] };
  const reasonIdx = header.indexOf('reason');
  const out: string[] = [];
  const reasonMap = new Map<string, string>();
  for (let i = 1; i < lines.length && out.length < maxRows; i++) {
    const row = parseCsvLine(lines[i]);
    const id = row[idIdx]?.trim();
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) continue;
    out.push(id);
    if (reasonIdx >= 0 && row[reasonIdx]) reasonMap.set(id, row[reasonIdx]);
  }
  return { ids: out, extra: reasonMap.size ? reasonMap : undefined };
}

/** Minimal CSV parser for quoted fields */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function loadStratification(): {
  idFlags: Map<string, StratFlags>;
  weakReasons: Map<string, string>;
} {
  const idFlags = new Map<string, StratFlags>();
  const weakReasons = new Map<string, string>();

  const touch = (id: string, patch: Partial<StratFlags>) => {
    const prev = idFlags.get(id) ?? {
      weakCsv: false,
      likelyTrashCsv: false,
      expiredCsv: false,
      duplicateCsv: false,
      suspiciousCsv: false
    };
    idFlags.set(id, { ...prev, ...patch });
  };

  const weakPath = path.join(QUALITY_DIR, 'weak-content.csv');
  if (fs.existsSync(weakPath)) {
    const raw = fs.readFileSync(weakPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const h = lines[0].split(',').map((x) => x.trim().toLowerCase());
    const idI = h.indexOf('id');
    const reasonI = h.indexOf('reason');
    let n = 0;
    for (let i = 1; i < lines.length && n < 1200; i++) {
      const cols = parseCsvLine(lines[i]);
      const id = cols[idI]?.trim();
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) continue;
      const reason = reasonI >= 0 ? (cols[reasonI]?.trim() ?? '') : '';
      touch(id, { weakCsv: true });
      if (/garbage|trash|spam/i.test(reason)) {
        touch(id, { likelyTrashCsv: true });
      }
      weakReasons.set(id, reason);
      n++;
    }
  }

  const expired = parseCsvIds(path.join(QUALITY_DIR, 'expired.csv'), 900);
  for (const id of expired.ids) touch(id, { expiredCsv: true });

  const dupE = parseCsvIds(path.join(QUALITY_DIR, 'duplicates-exact.csv'), 600);
  for (const id of dupE.ids) touch(id, { duplicateCsv: true });
  const dupN = parseCsvIds(path.join(QUALITY_DIR, 'duplicates-near.csv'), 600);
  for (const id of dupN.ids) touch(id, { duplicateCsv: true });

  const susp = parseCsvIds(
    path.join(QUALITY_DIR, 'suspicious-non-scholarships.csv'),
    500
  );
  for (const id of susp.ids)
    touch(id, { suspiciousCsv: true, likelyTrashCsv: true });

  return { idFlags, weakReasons };
}

function jsonHasData(v: unknown): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  const s = String(v).trim();
  return s.length > 2 && s !== '[]' && s !== '{}';
}

function isValidHttp(u: string | null | undefined): boolean {
  const t = (u ?? '').trim();
  return /^https?:\/\//i.test(t);
}

function combinedDescriptionLength(r: Row): number {
  return (
    (r.description?.length ?? 0) +
    (r.summary_short?.length ?? 0) +
    (r.summary_long?.length ?? 0)
  );
}

function hasDeadline(r: Row): boolean {
  return Boolean(
    (r.deadline_date && String(r.deadline_date).trim()) ||
    (r.deadline_text && r.deadline_text.trim().length > 0)
  );
}

function isExpired(r: Row, now: Date): boolean {
  const st = (r.scholarship_status ?? '').toLowerCase();
  if (st.includes('expired')) return true;
  if (r.days_until_deadline != null && r.days_until_deadline < 0) return true;
  if (r.deadline_date) {
    const d = new Date(r.deadline_date);
    if (!Number.isNaN(d.getTime()) && d.getTime() < now.getTime()) return true;
  }
  return false;
}

function isExpiredOver12Months(r: Row, now: Date): boolean {
  if (!r.deadline_date) return false;
  const d = new Date(r.deadline_date);
  if (Number.isNaN(d.getTime())) return false;
  const ms = now.getTime() - d.getTime();
  return ms > 365.25 * 24 * 3600 * 1000 * 12;
}

function isAggregatorOnly(r: Row): boolean {
  const u = (r.url ?? '').trim();
  if (!u) return false;
  if ((r.provider_url ?? '').trim().length > 0) return false;
  return AGGREGATOR_RE.test(u);
}

function titleGeneric(r: Row): boolean {
  const t = (r.title ?? '').trim();
  if (t.length < 12) return true;
  if (TITLE_TEMPLATE_RE.test(t)) return true;
  return false;
}

function hasOfficialishLink(r: Row): boolean {
  if ((r.provider_url ?? '').trim().length > 0) return true;
  const u = (r.url ?? '').trim();
  if (!u) return false;
  if (AGGREGATOR_RE.test(u)) return false;
  return isValidHttp(u);
}

function scoreAndBucket(r: Row, flags: StratFlags, now: Date): ScoredRow {
  const reasons: string[] = [];
  let s = 0;

  const applyOrUrl = !!(r.apply_url?.trim() || r.url?.trim());
  if (applyOrUrl) {
    s += 20;
    const primary = (r.apply_url ?? r.url ?? '').trim();
    if (isValidHttp(primary)) s += 10;
    else reasons.push('apply/url not http(s)');
  }

  if (hasOfficialishLink(r)) s += 10;
  else if ((r.official_source_name ?? '').trim()) s += 5;

  if (hasDeadline(r)) s += 15;
  else reasons.push('missing deadline');

  if (!isExpired(r, now)) {
    if (hasDeadline(r)) s += 10;
  } else {
    reasons.push('expired');
  }

  if ((r.provider_name ?? '').trim() || (r.official_source_name ?? '').trim())
    s += 10;
  else reasons.push('missing provider name');

  const tit = (r.title ?? '').trim();
  if (tit.length >= 8 && !titleGeneric(r)) s += 10;
  else {
    reasons.push('weak title');
  }

  if ((r.award_amount_text ?? '').trim().length > 0) s += 10;
  else reasons.push('missing amount text');

  const descLen = combinedDescriptionLength(r);
  if (descLen > 200) s += 10;
  else if (descLen > 80) s += 5;

  const elig =
    (r.eligibility_text ?? '').trim().length > 20 ||
    jsonHasData(r.citizenship_statuses) ||
    jsonHasData(r.applicant_country_codes);
  if (elig) s += 10;
  else reasons.push('thin eligibility');

  const loc =
    jsonHasData(r.host_country_codes) ||
    !!(r.location_scope ?? '').trim() ||
    jsonHasData(r.country_eligibility_notes);
  if (loc) s += 5;

  const cat =
    !!(r.category ?? '').trim() ||
    jsonHasData(r.study_levels) ||
    jsonHasData(r.field_of_study);
  if (cat) s += 5;

  const req =
    (r.requirements_text ?? '').trim().length > 20 ||
    (r.requirements_html ?? '').trim().length > 40 ||
    (r.requirement_signals_count ?? 0) > 0 ||
    jsonHasData(r.requirement_types);
  if (req) s += 10;
  else reasons.push('thin requirements');

  if (isExpiredOver12Months(r, now)) {
    s -= 30;
    reasons.push('deadline >12 months ago');
  }
  if (!applyOrUrl) {
    s -= 40;
    reasons.push('no apply_url and no url');
  }
  if (!hasOfficialishLink(r) && !(r.provider_url ?? '').trim()) {
    s -= 15;
    reasons.push('no official/provider program URL');
  }
  if (!hasDeadline(r)) s -= 20;
  if (
    !(r.provider_name ?? '').trim() &&
    !(r.official_source_name ?? '').trim()
  ) {
    s -= 15;
  }
  if (descLen < 100) {
    s -= 20;
    reasons.push('description/summary short');
  }
  if (titleGeneric(r)) s -= 15;

  if (flags.duplicateCsv) {
    s -= 15;
    reasons.push('flagged duplicate (quality CSV)');
  }
  if (flags.likelyTrashCsv || flags.suspiciousCsv) {
    s -= 40;
    reasons.push('flagged suspicious/trash (quality CSV)');
  }
  if (isAggregatorOnly(r)) {
    s -= 15;
    reasons.push('aggregator listing only, no provider_url');
  }

  s = Math.max(0, Math.min(100, Math.round(s)));

  let bucket: ScoredRow['bucket'];
  if (s >= 80) bucket = 'ready_to_apply';
  else if (s >= 60) bucket = 'usable_but_needs_check';
  else if (s >= 40) bucket = 'weak_paid_value';
  else bucket = 'not_subscription_worthy';

  return { row: r, score: s, bucket, flags, reasons };
}

function verdictFromPct(pctGood: number): string {
  if (pctGood >= 70) return 'strong_paid_content';
  if (pctGood >= 50) return 'acceptable_paid_content';
  if (pctGood >= 35) return 'weak_paid_content';
  return 'not_ready_for_subscription';
}

async function main() {
  ensureDirs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { idFlags, weakReasons } = loadStratification();
  const stratIds = [...idFlags.keys()];
  const now = new Date();

  const candidateIds = new Set<string>();

  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  for (const id of shuffle(stratIds).slice(0, 900)) candidateIds.add(id);

  for (const src of SOURCE_TARGETS) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id')
      .eq('is_active', true)
      .eq('source', src)
      .limit(90);
    if (error) {
      console.warn(`Source query ${src}:`, error.message);
      continue;
    }
    for (const row of data ?? []) {
      if (row.id) candidateIds.add(row.id);
    }
  }

  const { count: activeCount, error: cErr } = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (cErr) {
    console.error('Count error:', cErr.message);
    process.exit(1);
  }
  const totalActive = activeCount ?? 0;
  const span = Math.max(0, totalActive - FETCH_CHUNK);

  let guard = 0;
  while (candidateIds.size < TARGET_SAMPLE && guard < 80) {
    guard++;
    const start = span > 0 ? Math.floor(Math.random() * span) : 0;
    const { data, error } = await supabase
      .from('scholarships')
      .select('id')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(start, start + FETCH_CHUNK - 1);
    if (error) {
      console.warn('Range fetch:', error.message);
      break;
    }
    for (const row of data ?? []) {
      if (row.id) candidateIds.add(row.id);
    }
  }

  const allIds = [...candidateIds].slice(0, TARGET_SAMPLE + 400);
  const selectCols =
    'id,title,description,summary_short,summary_long,provider_name,provider_url,official_source_name,url,apply_url,source,source_id,award_amount_text,deadline_text,deadline_date,category,slug,is_active,scholarship_status,created_at,updated_at,eligibility_text,requirements_text,requirements_html,study_levels,field_of_study,citizenship_statuses,applicant_country_codes,host_country_codes,location_scope,country_eligibility_notes,days_until_deadline,requirement_types,requirement_signals_count';

  const rowsById = new Map<string, Row>();
  for (let i = 0; i < allIds.length; i += FETCH_CHUNK) {
    const chunk = allIds.slice(i, i + FETCH_CHUNK);
    const { data, error } = await supabase
      .from('scholarships')
      .select(selectCols)
      .in('id', chunk);
    if (error) {
      console.error('Batch select error:', error.message);
      process.exit(1);
    }
    for (const r of data ?? []) rowsById.set(r.id, r as Row);
  }

  const scored: ScoredRow[] = [];
  for (const r of rowsById.values()) {
    const flags = idFlags.get(r.id) ?? {
      weakCsv: false,
      likelyTrashCsv: false,
      expiredCsv: false,
      duplicateCsv: false,
      suspiciousCsv: false
    };
    scored.push(scoreAndBucket(r, flags, now));
  }

  scored.sort((a, b) => b.score - a.score);
  const finalSample = scored.slice(0, TARGET_SAMPLE);

  const n = finalSample.length;
  const count = (b: ScoredRow['bucket']) =>
    finalSample.filter((x) => x.bucket === b).length;
  const cReady = count('ready_to_apply');
  const cUsable = count('usable_but_needs_check');
  const cWeak = count('weak_paid_value');
  const cNot = count('not_subscription_worthy');

  const pct = (c: number) => (n === 0 ? 0 : Math.round((c / n) * 1000) / 10);

  const missingApply = finalSample.filter(
    (x) => !(x.row.apply_url ?? '').trim() && !(x.row.url ?? '').trim()
  ).length;
  const missingOfficial = finalSample.filter(
    (x) => !hasOfficialishLink(x.row)
  ).length;
  const missingDeadline = finalSample.filter((x) => !hasDeadline(x.row)).length;
  const missingAmount = finalSample.filter(
    (x) => !(x.row.award_amount_text ?? '').trim()
  ).length;
  const missingElig = finalSample.filter(
    (x) =>
      !(x.row.eligibility_text ?? '').trim() &&
      !jsonHasData(x.row.citizenship_statuses) &&
      !jsonHasData(x.row.applicant_country_codes)
  ).length;
  const missingLoc = finalSample.filter(
    (x) =>
      !jsonHasData(x.row.host_country_codes) &&
      !(x.row.location_scope ?? '').trim() &&
      !jsonHasData(x.row.country_eligibility_notes)
  ).length;
  const expiredC = finalSample.filter((x) => isExpired(x.row, now)).length;
  const expired12 = finalSample.filter((x) =>
    isExpiredOver12Months(x.row, now)
  ).length;
  const weakDesc = finalSample.filter(
    (x) => combinedDescriptionLength(x.row) < 100
  ).length;
  const dupFlag = finalSample.filter((x) => x.flags.duplicateCsv).length;
  const trashFlag = finalSample.filter(
    (x) => x.flags.likelyTrashCsv || x.flags.suspiciousCsv
  ).length;

  const bySource = new Map<
    string,
    { sum: number; n: number; ready: number; weak: number; notw: number }
  >();
  for (const x of finalSample) {
    const src = (x.row.source ?? 'unknown').trim() || 'unknown';
    const cur = bySource.get(src) ?? {
      sum: 0,
      n: 0,
      ready: 0,
      weak: 0,
      notw: 0
    };
    cur.sum += x.score;
    cur.n += 1;
    if (x.bucket === 'ready_to_apply') cur.ready += 1;
    if (
      x.bucket === 'weak_paid_value' ||
      x.bucket === 'not_subscription_worthy'
    ) {
      cur.weak += 1;
    }
    if (x.bucket === 'not_subscription_worthy') cur.notw += 1;
    bySource.set(src, cur);
  }

  const sourceRows = [...bySource.entries()]
    .filter(([, v]) => v.n >= 5)
    .map(([source, v]) => ({
      source,
      count: v.n,
      avgScore: Math.round((v.sum / v.n) * 10) / 10,
      readyPct: Math.round((v.ready / v.n) * 1000) / 10,
      weakOrWorsePct: Math.round((v.weak / v.n) * 1000) / 10
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const topStrong = [...sourceRows].slice(0, 10);
  const topWeak = [...sourceRows].reverse().slice(0, 10);

  const pctGood = pct(cReady + cUsable);
  const verdict = verdictFromPct(pctGood);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalSampled: n,
    readyToApply: { count: cReady, pct: pct(cReady) },
    usableButNeedsCheck: { count: cUsable, pct: pct(cUsable) },
    weakPaidValue: { count: cWeak, pct: pct(cWeak) },
    notSubscriptionWorthy: { count: cNot, pct: pct(cNot) },
    missingApplyUrl: { count: missingApply, pct: pct(missingApply) },
    missingOfficialOrProviderUrl: {
      count: missingOfficial,
      pct: pct(missingOfficial)
    },
    missingDeadline: { count: missingDeadline, pct: pct(missingDeadline) },
    missingAmount: { count: missingAmount, pct: pct(missingAmount) },
    missingEligibility: { count: missingElig, pct: pct(missingElig) },
    missingCountryLocationStudy: { count: missingLoc, pct: pct(missingLoc) },
    expired: { count: expiredC, pct: pct(expiredC) },
    expiredOver12Months: { count: expired12, pct: pct(expired12) },
    weakDescriptionUnder100Chars: { count: weakDesc, pct: pct(weakDesc) },
    duplicateFlagged: { count: dupFlag, pct: pct(dupFlag) },
    likelyTrashFlagged: { count: trashFlag, pct: pct(trashFlag) },
    top10StrongestSources: topStrong,
    top10WeakestSources: topWeak,
    examplesReadyToApply: finalSample
      .filter((x) => x.bucket === 'ready_to_apply')
      .slice(0, 20)
      .map((x) => ({
        id: x.row.id,
        title: x.row.title,
        source: x.row.source,
        score: x.score
      })),
    examplesWeakPaidValue: finalSample
      .filter((x) => x.bucket === 'weak_paid_value')
      .slice(0, 20)
      .map((x) => ({
        id: x.row.id,
        title: x.row.title,
        source: x.row.source,
        score: x.score
      })),
    examplesNotWorthy: finalSample
      .filter((x) => x.bucket === 'not_subscription_worthy')
      .slice(0, 20)
      .map((x) => ({
        id: x.row.id,
        title: x.row.title,
        source: x.row.source,
        score: x.score
      })),
    verdict,
    pctReadyPlusUsable: pctGood,
    avgScore:
      Math.round(
        (finalSample.reduce((a, x) => a + x.score, 0) / Math.max(1, n)) * 10
      ) / 10
  };

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'application-readiness-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  const recHeader = [
    'id',
    'title',
    'source',
    'score',
    'bucket',
    'apply_url',
    'url',
    'provider_url',
    'deadline_date',
    'deadline_text',
    'award_amount_text',
    'provider_name',
    'official_source_name',
    'scholarship_status',
    'is_active',
    'weak_csv',
    'likely_trash_csv',
    'expired_csv',
    'duplicate_csv',
    'suspicious_csv',
    'weak_csv_reason',
    'score_reasons'
  ];
  const recLines = [csvRow(recHeader)];
  for (const x of finalSample) {
    const wr = weakReasons.get(x.row.id) ?? '';
    recLines.push(
      csvRow([
        x.row.id,
        x.row.title ?? '',
        x.row.source ?? '',
        x.score,
        x.bucket,
        x.row.apply_url ?? '',
        x.row.url ?? '',
        x.row.provider_url ?? '',
        x.row.deadline_date ?? '',
        x.row.deadline_text ?? '',
        x.row.award_amount_text ?? '',
        x.row.provider_name ?? '',
        x.row.official_source_name ?? '',
        x.row.scholarship_status ?? '',
        x.row.is_active ?? '',
        x.flags.weakCsv,
        x.flags.likelyTrashCsv,
        x.flags.expiredCsv,
        x.flags.duplicateCsv,
        x.flags.suspiciousCsv,
        wr,
        x.reasons.join('; ')
      ])
    );
  }
  fs.writeFileSync(
    path.join(REPORT_ROOT, 'application-readiness-records.csv'),
    recLines.join('\n'),
    'utf8'
  );

  function examplesCsv(
    name: string,
    pred: (x: ScoredRow) => boolean,
    limit: number
  ) {
    const h = [
      'id',
      'title',
      'source',
      'score',
      'bucket',
      'url',
      'apply_url',
      'provider_url'
    ];
    const lines = [csvRow(h)];
    for (const x of finalSample.filter(pred).slice(0, limit)) {
      lines.push(
        csvRow([
          x.row.id,
          x.row.title ?? '',
          x.row.source ?? '',
          x.score,
          x.bucket,
          x.row.url ?? '',
          x.row.apply_url ?? '',
          x.row.provider_url ?? ''
        ])
      );
    }
    fs.writeFileSync(path.join(REPORT_ROOT, name), lines.join('\n'), 'utf8');
  }

  examplesCsv(
    'ready-to-apply-examples.csv',
    (x) => x.bucket === 'ready_to_apply',
    40
  );
  examplesCsv(
    'usable-but-needs-check-examples.csv',
    (x) => x.bucket === 'usable_but_needs_check',
    40
  );
  examplesCsv(
    'weak-paid-value-examples.csv',
    (x) => x.bucket === 'weak_paid_value',
    40
  );
  examplesCsv(
    'not-subscription-worthy.csv',
    (x) => x.bucket === 'not_subscription_worthy',
    40
  );

  const bySrcLines = [
    csvRow([
      'source',
      'sample_count',
      'avg_score',
      'ready_pct',
      'weak_or_worse_pct'
    ])
  ];
  for (const r of sourceRows) {
    bySrcLines.push(
      csvRow([r.source, r.count, r.avgScore, r.readyPct, r.weakOrWorsePct])
    );
  }
  fs.writeFileSync(
    path.join(REPORT_ROOT, 'application-readiness-by-source.csv'),
    bySrcLines.join('\n'),
    'utf8'
  );

  const md: string[] = [];
  md.push('# Scholarship application checklist audit (Stage 5)');
  md.push('');
  md.push(`- **Generated:** ${summary.generatedAt}`);
  md.push(`- **Sample size:** ${n}`);
  md.push(
    `- **Verdict:** **${verdict}** (ready+usable = ${pctGood}% of sample)`
  );
  md.push(`- **Mean readiness score:** ${summary.avgScore}`);
  md.push('');
  md.push('## Distribution');
  md.push('');
  md.push(`| Bucket | Count | % |`);
  md.push(`|--------|------:|--:|`);
  md.push(`| ready_to_apply | ${cReady} | ${pct(cReady)} |`);
  md.push(`| usable_but_needs_check | ${cUsable} | ${pct(cUsable)} |`);
  md.push(`| weak_paid_value | ${cWeak} | ${pct(cWeak)} |`);
  md.push(`| not_subscription_worthy | ${cNot} | ${pct(cNot)} |`);
  md.push('');
  md.push('## Data gaps (sample)');
  md.push('');
  md.push(`- Missing apply_url **and** url: **${pct(missingApply)}%**`);
  md.push(
    `- Missing official/provider-style URL (heuristic): **${pct(missingOfficial)}%**`
  );
  md.push(`- Missing deadline: **${pct(missingDeadline)}%**`);
  md.push(`- Missing award text: **${pct(missingAmount)}%**`);
  md.push(`- Thin eligibility signals: **${pct(missingElig)}%**`);
  md.push(`- Thin location / host / scope: **${pct(missingLoc)}%**`);
  md.push(`- Expired (any rule): **${pct(expiredC)}%**`);
  md.push(`- Deadline over 12 months ago: **${pct(expired12)}%**`);
  md.push(`- Description+summary under 100 chars: **${pct(weakDesc)}%**`);
  md.push(`- Duplicate-flagged (CSV): **${pct(dupFlag)}%**`);
  md.push(`- Trash/suspicious-flagged (CSV): **${pct(trashFlag)}%**`);
  md.push('');
  md.push('## Ответы (по ТЗ)');
  md.push('');
  md.push(
    `1. **Может ли платный пользователь реально податься?** Частично: **${pctGood}%** строк в выборке попадают в ready+usable; остальное требует ручной проверки или не тянет paywall.`
  );
  md.push(`2. **% ready_to_apply:** **${pct(cReady)}%**`);
  md.push(`3. **% usable_but_needs_check:** **${pct(cUsable)}%**`);
  md.push(
    `4. **% weak + not worthy:** **${pct(cWeak + cNot)}%** (weak: ${pct(cWeak)}, not worthy: ${pct(cNot)})`
  );
  md.push(
    `5. **Сколько не стоит показывать за paywall?** Ориентир: **${cNot}** записей в классе not_subscription_worthy (${pct(cNot)}%) плюс часть weak_paid_value при продуктовых порогах.`
  );
  md.push('');
  md.push('6. **Сильные источники (по avg score, n≥5):**');
  for (const r of topStrong) {
    md.push(`   - ${r.source}: avg ${r.avgScore}, ready ${r.readyPct}%`);
  }
  md.push('');
  md.push('7. **Слабые источники (низкий avg score, n≥5):**');
  for (const r of topWeak) {
    md.push(
      `   - ${r.source}: avg ${r.avgScore}, weak+worse ${r.weakOrWorsePct}%`
    );
  }
  md.push('');
  md.push(
    '8. **Поля, чаще мешающие подаче:** отсутствие `apply_url`/`url`, отсутствие program `provider_url`, слабый `deadline_*`, короткие `description`/`summary_*`, пустые eligibility/location JSON.'
  );
  md.push(
    '9. **Что улучшить в данных:** добить официальные/program URLs, нормализовать дедлайны, расширить описания не-агрегаторных карточек, снизить долю expired/дубликатов в активном каталоге.'
  );
  md.push('');
  if (pctGood >= 50) {
    md.push(
      '10. **Продавать подписку на текущей базе?** Да, с оговорками: при доле ready+usable ≥50% база **приемлема** для paid; при ≥70% — **сильнее**; ниже 50% — сначала качество данных.'
    );
  } else {
    md.push(
      '10. **Продавать подписку на текущей базе?** Осторожно: доля ready+usable <50% в этой выборке — лучше усилить данные до масштабирования paid traffic.'
    );
  }
  md.push(
    '11. **Что показывать бесплатно как teaser:** заголовок, краткий summary, дедлайн-бакет, страна/уровень на high-level, без прямых offsite apply ссылок (как у вас в paywall-модели).'
  );
  md.push(
    '12. **Что закрывать за подпиской:** полные apply URLs, provider контакты, длинные eligibility/requirements, IQ/essay AI блоки, smart filters — всё, что снижает ценность подписки если отдать бесплатно.'
  );
  md.push('');
  md.push('---');
  md.push('');
  md.push(
    'См. также: `application-readiness-summary.json`, `application-readiness-records.csv`.'
  );

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'application-readiness-report.md'),
    md.join('\n'),
    'utf8'
  );

  console.log(`[application-readiness] Sampled ${n} rows → ${REPORT_ROOT}`);
  console.log(
    `[application-readiness] Verdict: ${verdict} (ready+usable ${pctGood}%)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
