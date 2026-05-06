/**
 * Stage 6 — Google discoverability prep (CSV only). No HTTP to Google; no scraping; SELECT only.
 *
 *   npm run scholarships:audit-google-discoverability
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (via dotenv)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_ROOT = path.join(__dirname, '..', 'reports', 'customer-value-audit');

const MAX_ROWS = 280;
const MIN_ROWS_TARGET = 200;
const MIN_PER_SOURCE = 14;
const MAX_WEAK_IN_SAMPLE = 48;
const FETCH_CHUNK = 100;

const SOURCE_TARGETS = [
  'bigfuture',
  'mastersportal',
  'scholarships_com',
  'scholarships360',
  'daad',
  'iefa',
  'bold_org',
  'scholarship_america'
] as const;

type SourceTarget = (typeof SOURCE_TARGETS)[number];

const AGGREGATOR_SOURCES = new Set<string>([
  ...SOURCE_TARGETS,
  'scholars4dev',
  'wemakescholars',
  'unigo'
]);

type Row = Database['public']['Tables']['scholarships']['Row'];

type Bucket = 'ready_to_apply' | 'usable_but_needs_check' | 'weak_paid_value';

type Cand = { id: string; source: string | null; bucket: Bucket };

function csvEscape(s: string): string {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function csvRow(cols: (string | number | boolean | null | undefined)[]): string {
  return cols.map((c) => csvEscape(c == null ? '' : String(c))).join(',');
}

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

function parseExamplesFile(absPath: string, bucket: Bucket): Cand[] {
  if (!fs.existsSync(absPath)) return [];
  const raw = fs.readFileSync(absPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf('id');
  const srcIdx = header.indexOf('source');
  if (idIdx < 0 || srcIdx < 0) return [];
  const out: Cand[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const id = row[idIdx]?.trim();
    const source = row[srcIdx]?.trim() || null;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) continue;
    out.push({ id, source, bucket });
  }
  return out;
}

function bucketRank(b: Bucket): number {
  if (b === 'ready_to_apply') return 3;
  if (b === 'usable_but_needs_check') return 2;
  return 1;
}

function mergeCandidates(lists: Cand[]): Map<string, Cand> {
  const m = new Map<string, Cand>();
  for (const c of lists) {
    const prev = m.get(c.id);
    if (!prev || bucketRank(c.bucket) > bucketRank(prev.bucket)) {
      m.set(c.id, c);
    }
  }
  return m;
}

function isGenericTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (t.length < 18) return true;
  if (/^(the\s+)?(presidential|dean'?s?|merit|academic|music|athletic|stem)\s+scholarship\b/i.test(t)) return true;
  if (/\bguide\s*$/i.test(t) && /\b20\d{2}\b/.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words <= 4 && t.length < 42) return true;
  return false;
}

function applyUrlLooksPublicListingOrPortal(u: string | null | undefined): boolean {
  if (!u) return false;
  const s = u.toLowerCase();
  return (
    /scholarships\.com|scholarships360|bigfuture\.collegeboard|mastersportal|iefa\.org\/scholarships|bold\.org\/scholarships|scholarshipamerica\.org|scholarsapply\.org|daad\.de\/deutschland\/stipendium\/datenbank/i.test(
      s
    ) ||
    /academicworks\.com|ngwebsolutions\.com/i.test(s)
  );
}

function deadlineYear(row: Row): string {
  const d = row.deadline_date;
  if (d && /^(\d{4})/.test(d)) return RegExp.$1;
  const txt = row.deadline_text || '';
  const m = txt.match(/\b(20\d{2})\b/);
  return m ? m[1] : '';
}

function expectedReplaceabilityRisk(row: Row): 'high' | 'medium' | 'low' {
  const title = row.title?.trim() || '';
  const prov = row.provider_name?.trim() || '';
  const src = row.source || '';
  const apply = row.apply_url || row.url || '';
  const generic = isGenericTitle(title);
  const hasProv = prov.length > 2;
  const agg = AGGREGATOR_SOURCES.has(src);
  const portalOrListing = applyUrlLooksPublicListingOrPortal(apply);

  if (generic) return 'low';
  if (!hasProv) {
    if (portalOrListing && agg) return 'medium';
    return 'low';
  }
  if (agg && portalOrListing) return 'high';
  if (agg && !portalOrListing) return 'medium';
  if (!agg && portalOrListing) return 'medium';
  return 'medium';
}

function buildQueries(row: Row): {
  exact: string;
  titleProv: string;
  titleSch: string;
  titleYear: string;
  titleProvSch: string;
  titleSt: string;
} {
  const title = (row.title || '').trim();
  const prov = (row.provider_name || '').trim();
  const y = deadlineYear(row);
  return {
    exact: title,
    titleProv: [title, prov].filter(Boolean).join(' '),
    titleSch: title ? `${title} scholarship` : '',
    titleYear: y ? `${title} ${y}`.trim() : `${title} deadline`.trim(),
    titleProvSch: [title, prov, 'scholarship'].filter(Boolean).join(' '),
    titleSt: title ? `${title} ScholarshipStop` : ''
  };
}

function yn(v: unknown): string {
  if (v == null) return 'no';
  if (typeof v === 'string') return v.trim().length > 0 ? 'yes' : 'no';
  return 'yes';
}

function collectBalancedSample(
  byId: Map<string, Cand>,
  weakIds: Set<string>
): string[] {
  const perSource: Record<string, Cand[]> = {};
  for (const s of SOURCE_TARGETS) perSource[s] = [];

  for (const c of byId.values()) {
    const src = c.source || '';
    if ((SOURCE_TARGETS as readonly string[]).includes(src)) {
      perSource[src].push(c);
    }
  }

  const rankOrder = (c: Cand) => bucketRank(c.bucket);
  for (const s of SOURCE_TARGETS) {
    perSource[s].sort((a, b) => rankOrder(b) - rankOrder(a));
  }

  const selected: string[] = [];
  const seen = new Set<string>();

  const pushId = (id: string) => {
    if (seen.has(id) || selected.length >= MAX_ROWS) return;
    seen.add(id);
    selected.push(id);
  };

  for (const s of SOURCE_TARGETS) {
    const list = perSource[s];
    let n = 0;
    for (const c of list) {
      if (n >= MIN_PER_SOURCE) break;
      pushId(c.id);
      n++;
    }
  }

  const weakFirst = [...byId.values()].filter((c) => weakIds.has(c.id));
  weakFirst.sort(() => Math.random() - 0.5);
  let weakAdded = 0;
  for (const c of weakFirst) {
    if (selected.length >= MAX_ROWS || weakAdded >= MAX_WEAK_IN_SAMPLE) break;
    const before = selected.length;
    pushId(c.id);
    if (selected.length > before) weakAdded++;
  }

  const rest = [...byId.values()].sort((a, b) => rankOrder(b) - rankOrder(a));
  for (const c of rest) {
    if (selected.length >= MAX_ROWS) break;
    pushId(c.id);
  }

  return selected;
}

async function supplementIdsFromDb(
  supabase: ReturnType<typeof createClient<Database>>,
  have: Set<string>,
  rowsSoFar: Row[]
): Promise<string[]> {
  const countBy = new Map<string, number>();
  const rmap = new Map(rowsSoFar.map((r) => [r.id, r]));
  for (const id of have) {
    const r = rmap.get(id);
    const s = r?.source || '';
    if (!s) continue;
    countBy.set(s, (countBy.get(s) || 0) + 1);
  }

  const extra: string[] = [];
  for (const s of SOURCE_TARGETS) {
    let c = countBy.get(s) || 0;
    if (c >= MIN_PER_SOURCE) continue;
    const need = MIN_PER_SOURCE - c;
    const fetchN = Math.min(100, need + 35);
    const { data, error } = await supabase
      .from('scholarships')
      .select('id')
      .eq('source', s)
      .eq('is_active', true)
      .not('title', 'is', null)
      .limit(fetchN);
    if (error) {
      console.warn(`[google-discoverability] supplement ${s}:`, error.message);
      continue;
    }
    let ids = (data || []).map((r) => r.id).filter((id) => id && !have.has(id));
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    for (const id of ids) {
      if (have.size + extra.length >= MAX_ROWS) break;
      if (c >= MIN_PER_SOURCE) break;
      have.add(id);
      extra.push(id);
      c++;
      countBy.set(s, c);
    }
  }
  return extra;
}

async function topUpIds(
  supabase: ReturnType<typeof createClient<Database>>,
  have: Set<string>,
  need: number
): Promise<string[]> {
  const extra: string[] = [];
  let i = 0;
  while (extra.length < need && have.size + extra.length < MAX_ROWS && i < 400) {
    i++;
    const s = SOURCE_TARGETS[i % SOURCE_TARGETS.length];
    const { data, error } = await supabase
      .from('scholarships')
      .select('id')
      .eq('source', s)
      .eq('is_active', true)
      .not('title', 'is', null)
      .limit(40);
    if (error) continue;
    const candidates = (data || []).map((r) => r.id).filter((id) => id && !have.has(id));
    if (!candidates.length) continue;
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    have.add(id);
    extra.push(id);
  }
  return extra;
}

async function fetchRowsByIds(
  supabase: ReturnType<typeof createClient<Database>>,
  ids: string[]
): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += FETCH_CHUNK) {
    const slice = ids.slice(i, i + FETCH_CHUNK);
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        [
          'id',
          'slug',
          'title',
          'provider_name',
          'source',
          'deadline_date',
          'award_amount_text',
          'apply_url',
          'provider_url',
          'url',
          'deadline_text',
          'category',
          'host_country_codes',
          'applicant_country_codes',
          'field_of_study'
        ].join(', ')
      )
      .in('id', slice);
    if (error) throw new Error(error.message);
    if (data?.length) out.push(...(data as Row[]));
  }
  const byId = new Map(out.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Row[];
}

function writePlanMd(opts: {
  rowCount: number;
  sourcesCovered: string[];
  riskHigh: number;
  riskMedium: number;
  riskLow: number;
  categoriesSampled: string[];
  hostCountriesSampled: string[];
}) {
  const {
    rowCount,
    sourcesCovered,
    riskHigh,
    riskMedium,
    riskLow,
    categoriesSampled,
    hostCountriesSampled
  } = opts;

  const md = `# Google discoverability — Этап 6 (план, без автопоиска)

## 1. Что этот этап **не** делает

- Нет запросов к Google, парсинга SERP, SerpAPI и браузерной автоматизации поиска.
- Только подготовка CSV с текстами запросов и пустыми колонками под **ручную** проверку.

## 2. Как вручную проверять CSV

1. Открыть \`google-check-queries.csv\` в таблице.
2. Для каждой строки вставить в Google \`query_exact_title\` (лучше инкогнито / без персонализации).
3. При необходимости повторить с \`query_title_provider\`, \`query_title_scholarship\`, \`query_title_deadline_year\`, \`query_title_provider_scholarship\`.
4. В колонки \`manual_google_url_*\` вставить URL строки поиска из браузера **или** URL лучшего совпадения — выберите одну конвенцию для всего файла.
5. Зафиксировать исход: тот же грант в топе или нет.

## 3. Как оценивать risk после ручного поиска

- **Нашли официальный источник в топ-3** → высокая воспроизводимость через Google.
- **Нашли тот же грант на агрегаторе** (scholarships.com, BigFuture и т.д.) → часто **high** replaceability для paywall-теasers.
- **Быстро не нашли** — проверить альтернативные query-колонки.
- **Заголовок двусмысленный** — много одноимённых программ → скорее **low**.

Колонка \`expected_replaceability_risk\` — **эвристика до ручной проверки**; её нужно корректировать по фактическим SERP.

| Уровень | Смысл (авто-эвристика) |
|---------|-------------------------|
| **high** | Редкий заголовок, есть provider, источник/apply похожи на публичный листинг или портал — пользователю проще восстановить карточку снаружи. |
| **medium** | Смешанные сигналы. |
| **low** | Короткий/шаблонный title, нет provider или поиск «шумный» без контекста профиля/фильтров. |

## 4. Что лучше скрывать до оплаты при высоком replaceability

Если ручная проверка показывает много **high**:

- Точные внешние **apply URL**, длинные блоки eligibility/requirements, прямые **provider URLs** — разумно оставить за подпиской (совместимо с текущей blur-моделью).
- В teaser оставить **title**, грубый **дедлайн**, high-level **географию/категорию** без полного пути к подаче.

## 5. Какие paid values Google **не** заменяет

- **Фильтры** и структурированные фасеты  
- **Персональный матчинг** / ранжирование под профиль  
- **Saved list** и синхронизация между устройствами  
- **Напоминания о дедлайнах** и трекинг  
- Курируемые **easy apply / no essay** шорткаты при вашей валидации сигналов  
- **Чеклист подачи** и сценарии внутри продукта  
- **Дедуп**, скрытие мусора и просроченного шума  

---

## Метаданные прогона (генерируются скриптом)

- **Строк в CSV:** ${rowCount}
- **Источники в выборке:** ${sourcesCovered.length ? sourcesCovered.join(', ') : '(нет)'}
- **Эвристика risk:** high=${riskHigh}, medium=${riskMedium}, low=${riskLow}
- **Примеры category из БД (усечено):** ${categoriesSampled.length ? categoriesSampled.slice(0, 25).join('; ') : '—'}
- **Примеры host country codes (усечено):** ${hostCountriesSampled.length ? hostCountriesSampled.slice(0, 25).join(', ') : '—'}

### Предварительные выводы до ручного Google

- Строки с **high** — кандидаты на лёгкую бесплатную находимость; подтверждать только вручную.
- **low** всё равно могут быть ценны внутри продукта за счёт фильтров и матчинга.
- Слабые official/program URL из Этапа 5 не равны автоматически «низкой заменяемости»: уникальный title + агрегатор могут давать быстрый поиск.

---

**Этап 6 завершён.** Этап 7 — только после явного approve.
`;

  fs.writeFileSync(path.join(REPORT_ROOT, 'google-discoverability-plan.md'), md, 'utf8');
}

async function main() {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[google-discoverability] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const readyPath = path.join(REPORT_ROOT, 'ready-to-apply-examples.csv');
  const usablePath = path.join(REPORT_ROOT, 'usable-but-needs-check-examples.csv');
  const weakPath = path.join(REPORT_ROOT, 'weak-paid-value-examples.csv');

  const ready = parseExamplesFile(readyPath, 'ready_to_apply');
  const usable = parseExamplesFile(usablePath, 'usable_but_needs_check');
  const weak = parseExamplesFile(weakPath, 'weak_paid_value');
  const weakIds = new Set(weak.map((w) => w.id));

  const byId = mergeCandidates([...ready, ...usable, ...weak]);
  let idOrder = collectBalancedSample(byId, weakIds);

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const countPerSource = (ids: string[], rows: Row[]) => {
    const map = new Map<string, number>();
    const rmap = new Map(rows.map((r) => [r.id, r]));
    for (const id of ids) {
      const r = rmap.get(id);
      const s = r?.source || '';
      if (!s) continue;
      map.set(s, (map.get(s) || 0) + 1);
    }
    return map;
  };

  let rows = await fetchRowsByIds(supabase, idOrder);
  let have = new Set(idOrder);

  if (idOrder.length < MIN_ROWS_TARGET || SOURCE_TARGETS.some((s) => (countPerSource(idOrder, rows).get(s) || 0) < MIN_PER_SOURCE)) {
    const extra = await supplementIdsFromDb(supabase, have, rows);
    idOrder = [...idOrder, ...extra].slice(0, MAX_ROWS);
    rows = await fetchRowsByIds(supabase, idOrder);
    have = new Set(idOrder);
  }

  if (rows.length < MIN_ROWS_TARGET) {
    const extra2 = await supplementIdsFromDb(supabase, have, rows);
    idOrder = [...idOrder, ...extra2].slice(0, MAX_ROWS);
    rows = await fetchRowsByIds(supabase, idOrder);
  }

  idOrder = idOrder.slice(0, MAX_ROWS);
  rows = await fetchRowsByIds(supabase, idOrder);
  const foundIds = new Set(rows.map((r) => r.id));
  idOrder = idOrder.filter((id) => foundIds.has(id));

  if (rows.length < MIN_ROWS_TARGET && idOrder.length < MAX_ROWS) {
    const need = Math.min(MAX_ROWS - idOrder.length, MIN_ROWS_TARGET - rows.length);
    const more = await topUpIds(supabase, new Set(idOrder), need);
    idOrder = [...idOrder, ...more].slice(0, MAX_ROWS);
    rows = await fetchRowsByIds(supabase, idOrder);
  }

  const header = [
    'id',
    'slug',
    'title',
    'provider_name',
    'source',
    'deadline_date',
    'award_amount_text',
    'apply_url_present',
    'provider_url_present',
    'query_exact_title',
    'query_title_provider',
    'query_title_scholarship',
    'query_title_deadline_year',
    'query_title_provider_scholarship',
    'query_title_scholarshiptop',
    'manual_google_url_exact_title',
    'manual_google_url_title_provider',
    'manual_google_url_title_scholarship',
    'expected_replaceability_risk'
  ];

  const lines = [csvRow(header)];
  let riskHigh = 0;
  let riskMedium = 0;
  let riskLow = 0;
  const categories = new Set<string>();
  const hosts = new Set<string>();

  for (const r of rows) {
    const risk = expectedReplaceabilityRisk(r);
    if (risk === 'high') riskHigh++;
    else if (risk === 'medium') riskMedium++;
    else riskLow++;
    if (r.category) categories.add(r.category);
    const hc = r.host_country_codes;
    if (Array.isArray(hc)) {
      for (const x of hc) {
        if (typeof x === 'string') hosts.add(x);
      }
    } else if (hc && typeof hc === 'object') {
      for (const x of Object.values(hc as Record<string, unknown>)) {
        if (typeof x === 'string') hosts.add(x);
      }
    }

    const q = buildQueries(r);
    lines.push(
      csvRow([
        r.id,
        r.slug,
        r.title,
        r.provider_name,
        r.source,
        r.deadline_date,
        r.award_amount_text,
        yn(r.apply_url || r.url),
        yn(r.provider_url),
        q.exact,
        q.titleProv,
        q.titleSch,
        q.titleYear,
        q.titleProvSch,
        q.titleSt,
        '',
        '',
        '',
        risk
      ])
    );
  }

  const csvPath = path.join(REPORT_ROOT, 'google-check-queries.csv');
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf8');

  const sourcesCovered = [...new Set(rows.map((r) => r.source).filter(Boolean))].sort() as string[];

  writePlanMd({
    rowCount: rows.length,
    sourcesCovered,
    riskHigh,
    riskMedium,
    riskLow,
    categoriesSampled: [...categories].sort(),
    hostCountriesSampled: [...hosts].sort()
  });

  console.log(
    `[google-discoverability] Wrote ${rows.length} rows → ${csvPath}\n` +
      `[google-discoverability] Sources: ${sourcesCovered.join(', ')}\n` +
      `[google-discoverability] Heuristic risk — high:${riskHigh} medium:${riskMedium} low:${riskLow}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
