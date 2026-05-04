/**
 * Optional OpenAI step for scholarship host-country inference (ISO2 only).
 *
 * Env:
 *   OPENAI_HOST_CLASSIFY_ENABLED — 1/true: run after HIPO + Wikidata in classify_hosts.ts
 *   OPENAI_HOST_CLASSIFY_MODEL — default gpt-4o-mini
 *   OPENAI_HOST_GAP_MS — optional pause before each parallel backfill batch / between sequential calls (default 0)
 *   OPENAI_HOST_CONCURRENCY — parallel in-flight requests for --openai-backfill batches (default 8, max 32)
 *   OPENAI_API_KEY — required for calls
 */

import OpenAI from 'openai';

let openAiHostClient: OpenAI | null = null;

function getOpenAiHostClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY is required for OpenAI host classification');
  }
  if (!openAiHostClient) {
    openAiHostClient = new OpenAI({ apiKey: key, maxRetries: 1, timeout: 60_000 });
  }
  return openAiHostClient;
}

const ISO_RE = /^[A-Z]{2}$/;

/** Model sometimes emits alpha-3; normalize a few common ones to ISO2. */
const ALPHA3_TO_ISO2: Record<string, string> = {
  USA: 'US',
  GBR: 'GB',
  CAN: 'CA',
  AUS: 'AU',
  DEU: 'DE',
  FRA: 'FR',
  ITA: 'IT',
  ESP: 'ES',
  NLD: 'NL',
  BEL: 'BE',
  CHE: 'CH',
  AUT: 'AT',
  SWE: 'SE',
  NOR: 'NO',
  DNK: 'DK',
  FIN: 'FI',
  IRL: 'IE',
  NZL: 'NZ',
  IND: 'IN',
  CHN: 'CN',
  JPN: 'JP',
  KOR: 'KR',
  MEX: 'MX',
  BRA: 'BR',
  ZAF: 'ZA',
  PHL: 'PH',
  SGP: 'SG',
  ARE: 'AE',
  ISR: 'IL',
  POL: 'PL',
  CZE: 'CZ',
  UKR: 'UA',
  RUS: 'RU'
};

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }
  return t;
}

function coerceIsoString(raw: string): string | null {
  const u = raw.trim().toUpperCase();
  if (ISO_RE.test(u)) return u;
  if (u.length === 3 && ALPHA3_TO_ISO2[u]) return ALPHA3_TO_ISO2[u];
  return null;
}

export function openaiHostClassifyEnabled(): boolean {
  const v = process.env.OPENAI_HOST_CLASSIFY_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function openaiHostClassifyModel(): string {
  return process.env.OPENAI_HOST_CLASSIFY_MODEL?.trim() || 'gpt-4o-mini';
}

export function openaiHostGapMs(): number {
  const n = Number.parseInt(process.env.OPENAI_HOST_GAP_MS?.trim() || '0', 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(10_000, n) : 0;
}

/** Parallel OpenAI requests inside one contiguous --openai-backfill batch. */
export function openaiHostConcurrency(): number {
  const n = Number.parseInt(process.env.OPENAI_HOST_CONCURRENCY?.trim() || '8', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(32, Math.floor(n));
}

export type OpenAiHostClassifyRowInput = {
  provider_name: string | null;
  official_source_name: string | null;
  provider_url: string | null;
};

/**
 * Returns ISO 3166-1 alpha-2 or null. Uses JSON mode; invalid / unknown → null.
 */
export async function resolveHostCountryViaOpenAi(
  row: OpenAiHostClassifyRowInput
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const client = getOpenAiHostClient();
  const model = openaiHostClassifyModel();
  const name = row.provider_name?.trim() || '';
  const official = row.official_source_name?.trim() || '';
  const url = row.provider_url?.trim() || '';
  const user = [
    'Infer the host country for this scholarship or grant (where the program is run / the awarding body is based).',
    'You must respond with a single json object only (no markdown, no code fences).',
    'Shape: {"iso":"US"} or {"iso":null}. Key must be exactly "iso".',
    'Value "iso" must be ISO 3166-1 alpha-2: exactly two letters A–Z (e.g. US). Never use alpha-3 like USA.',
    'If the country is genuinely unknown from the text and URL, use null.',
    `provider_name: ${JSON.stringify(name.slice(0, 400))}`,
    `official_source_name: ${JSON.stringify(official.slice(0, 400))}`,
    `provider_url: ${JSON.stringify(url.slice(0, 600))}`
  ].join('\n');

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 64,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You only output one json object with key "iso": either a two-letter country code or null. No prose, no markdown.'
      },
      { role: 'user', content: user }
    ]
  });

  const msg = completion.choices[0]?.message;
  const textRaw = msg?.content?.trim();
  if (!textRaw) return null;

  const text = stripJsonFences(textRaw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const isoRaw = (parsed as { iso?: unknown }).iso;
  if (isoRaw === null || isoRaw === undefined) return null;
  if (typeof isoRaw !== 'string') return null;
  return coerceIsoString(isoRaw);
}
