/**
 * AI enrichment for scholarships with missing applicant_country_codes.
 *
 * Default: dry-run, limited to 10 rows for safe testing.
 * Writes require --apply, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.
 *
 *   dotenv -e .env.local -- npx tsx scripts/enrich-applicant-countries.ts
 *   dotenv -e .env.local -- npx tsx scripts/enrich-applicant-countries.ts --limit=50
 *   dotenv -e .env.local -- npx tsx scripts/enrich-applicant-countries.ts --limit=50 --apply
 *   dotenv -e .env.local -- npx tsx scripts/enrich-applicant-countries.ts --limit=0 --apply
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

type ScholarshipRow = {
  id: string;
  title: string | null;
  provider_name: string | null;
  description: string | null;
  summary_short: string | null;
  summary_long: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
  requirements_text_clean: string | null;
  who_can_apply: string | null;
  state_territory_text: string | null;
  citizenship_statuses: unknown;
  applicant_country_codes: unknown;
};

type Args = {
  apply: boolean;
  allRows: boolean;
  limit: number | null;
  batchSize: number;
  delayMs: number;
  timeoutMs: number;
  retries: number;
};

const DEFAULT_LIMIT = 10;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const MODEL = 'gpt-4o-mini';
const ISO_RE = /^[A-Z]{2}$/;

const SYSTEM_PROMPT =
  'You are an expert data extractor for a scholarship platform. Your job is to read scholarship descriptions and determine which citizenships are eligible to apply. Return ONLY a valid JSON array of 2-letter ISO-3166-1 alpha-2 country codes (e.g., ["US", "IN", "KZ"]). If the scholarship is explicitly open to all international students globally without restriction, return [] because this schema supports only ISO country codes. Do not include markdown formatting or any other text.';

function parseNonNegativeIntArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePositiveIntArg(name: string, fallback: number): number {
  const parsed = parseNonNegativeIntArg(name, fallback);
  return parsed > 0 ? parsed : fallback;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const limitRaw = argv.find((arg) => arg.startsWith('--limit='));
  const parsedLimit = limitRaw
    ? Number.parseInt(limitRaw.slice('--limit='.length), 10)
    : DEFAULT_LIMIT;

  return {
    apply: argv.includes('--apply'),
    allRows: argv.includes('--all-rows'),
    limit: Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : DEFAULT_LIMIT,
    batchSize: parsePositiveIntArg('batch-size', DEFAULT_BATCH_SIZE),
    delayMs: parseNonNegativeIntArg('delay-ms', DEFAULT_DELAY_MS),
    timeoutMs: parsePositiveIntArg('timeout-ms', DEFAULT_TIMEOUT_MS),
    retries: parseNonNegativeIntArg('retries', DEFAULT_RETRIES)
  };
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

function compact(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeIsoCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
        .filter((code) => ISO_RE.test(code))
    )
  ).sort();
}

function stripJsonFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }
  return text;
}

function buildPrompt(row: ScholarshipRow): string {
  return [
    'Extract eligible applicant citizenship/residency/home countries from this scholarship.',
    'Applicant country is not the study destination or provider location unless the text says applicants must be citizens/residents/from that country.',
    'If eligibility is only a U.S. state, school, institution, field, GPA, financial need, or identity group without explicit country/citizenship/residency eligibility, return [].',
    'If it says U.S. citizens, U.S. permanent residents, DACA in the U.S., FAFSA-required, or U.S. residents, return ["US"].',
    'If it says international students globally or open worldwide without country restrictions, return [].',
    'Return only a JSON array of ISO alpha-2 country codes.',
    '',
    `title: ${JSON.stringify(compact(row.title, 500))}`,
    `provider_name: ${JSON.stringify(compact(row.provider_name, 300))}`,
    `summary_short: ${JSON.stringify(compact(row.summary_short, 700))}`,
    `summary_long: ${JSON.stringify(compact(row.summary_long, 900))}`,
    `description: ${JSON.stringify(compact(row.description, 1800))}`,
    `eligibility_text: ${JSON.stringify(compact(row.eligibility_text, 1600))}`,
    `requirements_text: ${JSON.stringify(compact(row.requirements_text, 1200))}`,
    `requirements_text_clean: ${JSON.stringify(compact(row.requirements_text_clean, 1200))}`,
    `who_can_apply: ${JSON.stringify(compact(row.who_can_apply, 900))}`,
    `state_territory_text: ${JSON.stringify(compact(row.state_territory_text, 500))}`,
    `citizenship_statuses: ${JSON.stringify(jsonStringArray(row.citizenship_statuses))}`
  ].join('\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  task: () => Promise<T>,
  retries: number,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      const backoffMs = 750 * 2 ** attempt;
      console.warn(
        `[Retry] ${label} attempt ${attempt + 1}/${retries + 1} failed; waiting ${backoffMs}ms`
      );
      await sleep(backoffMs);
    }
  }
  throw lastError;
}

async function extractApplicantCountries(
  openai: OpenAI,
  row: ScholarshipRow,
  args: Args
): Promise<string[]> {
  const completion = await withRetry(
    () =>
      openai.chat.completions.create(
        {
          model: MODEL,
          temperature: 0,
          max_tokens: 80,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(row) }
          ]
        },
        { timeout: args.timeoutMs }
      ),
    args.retries,
    row.id
  );

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  try {
    return normalizeIsoCodes(JSON.parse(stripJsonFences(raw)) as unknown);
  } catch (error) {
    throw new Error(`Invalid JSON from OpenAI for ${row.id}: ${raw.slice(0, 200)}`);
  }
}

async function fetchBatch(
  supabase: ReturnType<typeof serviceSupabase>,
  args: Args,
  afterId: string | null,
  limit: number
): Promise<ScholarshipRow[]> {
  let query = supabase
    .from('scholarships')
    .select(
      [
        'id',
        'title',
        'provider_name',
        'description',
        'summary_short',
        'summary_long',
        'eligibility_text',
        'requirements_text',
        'requirements_text_clean',
        'who_can_apply',
        'state_territory_text',
        'citizenship_statuses',
        'applicant_country_codes'
      ].join(',')
    )
    .or('applicant_country_codes.is.null,applicant_country_codes.eq.[]')
    .order('id', { ascending: true })
    .limit(limit);

  if (!args.allRows) query = query.eq('is_active', true);
  if (afterId) query = query.gt('id', afterId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ScholarshipRow[];
}

async function main() {
  const args = parseArgs();
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is required');

  const supabase = serviceSupabase();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const maxRows = args.limit === 0 ? Number.POSITIVE_INFINITY : args.limit ?? DEFAULT_LIMIT;

  console.log(
    [
      `Applicant country enrichment started`,
      `mode=${args.apply ? 'apply' : 'dry-run'}`,
      `model=${MODEL}`,
      `limit=${Number.isFinite(maxRows) ? maxRows : 'all'}`,
      `batchSize=${args.batchSize}`,
      `delayMs=${args.delayMs}`
    ].join(' | ')
  );

  let processed = 0;
  let updated = 0;
  let failed = 0;
  let afterId: string | null = null;

  while (processed < maxRows) {
    const remaining = maxRows - processed;
    const pageSize = Math.min(args.batchSize, remaining);
    const rows = await fetchBatch(supabase, args, afterId, pageSize);
    if (rows.length === 0) break;
    afterId = rows[rows.length - 1]?.id ?? afterId;

    for (const row of rows) {
      if (processed >= maxRows) break;
      processed += 1;

      try {
        const codes = await extractApplicantCountries(openai, row, args);
        if (args.apply) {
          const { error } = await supabase
            .from('scholarships')
            .update({ applicant_country_codes: codes })
            .eq('id', row.id);
          if (error) throw new Error(error.message);
          updated += 1;
          console.log(`[Success] ID: ${row.id} - Saved: ${JSON.stringify(codes)}`);
        } else {
          console.log(`[DryRun] ID: ${row.id} - Found: ${JSON.stringify(codes)}`);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Error] ID: ${row.id} - ${message}`);
      }

      if (args.delayMs > 0 && processed < maxRows) {
        await sleep(args.delayMs);
      }
    }

    if (rows.length < pageSize) break;
  }

  console.log(
    `Done. processed=${processed} ${args.apply ? `updated=${updated}` : 'updated=0 dry-run'} failed=${failed}`
  );
  if (!args.apply) console.log('Dry-run only. Re-run with --apply to write applicant_country_codes.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
