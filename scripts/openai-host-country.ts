/**
 * Optional OpenAI step for scholarship host-country inference (ISO2 only).
 *
 * Env:
 *   OPENAI_HOST_CLASSIFY_ENABLED — 1/true: run after HIPO + Wikidata in classify_hosts.ts
 *   OPENAI_HOST_CLASSIFY_MODEL — default gpt-4o-mini
 *   OPENAI_HOST_GAP_MS — pause between OpenAI calls (default 250)
 *   OPENAI_API_KEY — required for calls
 */

import OpenAI from 'openai';

const ISO_RE = /^[A-Z]{2}$/;

export function openaiHostClassifyEnabled(): boolean {
  const v = process.env.OPENAI_HOST_CLASSIFY_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function openaiHostClassifyModel(): string {
  return process.env.OPENAI_HOST_CLASSIFY_MODEL?.trim() || 'gpt-4o-mini';
}

export function openaiHostGapMs(): number {
  const n = Number.parseInt(process.env.OPENAI_HOST_GAP_MS?.trim() || '250', 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(10_000, n) : 250;
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

  const client = new OpenAI({ apiKey: key, maxRetries: 1, timeout: 60_000 });
  const model = openaiHostClassifyModel();
  const name = row.provider_name?.trim() || '';
  const official = row.official_source_name?.trim() || '';
  const url = row.provider_url?.trim() || '';
  const user = [
    'Infer the host country for this scholarship or grant (where the program is run / the awarding body is based).',
    'Respond with JSON only: {"iso":"XX"} where XX is ISO 3166-1 alpha-2 uppercase, or {"iso":null} if truly unknown.',
    'Do not guess from vague names; null is better than a wrong country.',
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
          'You only output a single JSON object with key "iso": either a two-letter country code or null. No prose.'
      },
      { role: 'user', content: user }
    ]
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const isoRaw = (parsed as { iso?: unknown }).iso;
  if (isoRaw === null || isoRaw === undefined) return null;
  if (typeof isoRaw !== 'string') return null;
  const u = isoRaw.trim().toUpperCase();
  return ISO_RE.test(u) ? u : null;
}
