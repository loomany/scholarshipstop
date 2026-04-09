import OpenAI from 'openai';

import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import { normalizeProviderOfficialUrl } from '@/lib/providers/providerOfficialUrl';

export type ProviderEnrichmentFaqItem = { question: string; answer: string };

export type ProviderEnrichmentResult = {
  description: string | null;
  faq: ProviderEnrichmentFaqItem[];
  sources: string[];
  /** USPS two-letter code when the org is primarily US-state-based; null if unknown / national / non-US. */
  state: string | null;
};

const VALID_US_STATE_CODES = new Set(Object.keys(US_STATE_CODE_TO_NAME));

function normalizeEnrichedState(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toUpperCase();
  if (
    !t ||
    t === 'NATIONAL' ||
    t === 'NONE' ||
    t === 'NULL' ||
    t === 'UNKNOWN' ||
    t === 'N/A'
  ) {
    return null;
  }
  if (t.length === 2 && VALID_US_STATE_CODES.has(t)) return t;
  return null;
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeFaqEntry(raw: unknown): ProviderEnrichmentFaqItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const q =
    (typeof o.q === 'string' && o.q.trim()) ||
    (typeof o.question === 'string' && o.question.trim()) ||
    '';
  const a =
    (typeof o.a === 'string' && o.a.trim()) ||
    (typeof o.answer === 'string' && o.answer.trim()) ||
    '';
  if (!q || !a) return null;
  return { question: q, answer: a };
}

function parseEnrichmentJson(text: string): ProviderEnrichmentResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;

  const descRaw = o.description;
  const description =
    descRaw === null
      ? null
      : typeof descRaw === 'string' && descRaw.trim()
        ? descRaw.trim()
        : null;

  const faqOut: ProviderEnrichmentFaqItem[] = [];
  if (Array.isArray(o.faq)) {
    for (const item of o.faq) {
      const row = normalizeFaqEntry(item);
      if (row) faqOut.push(row);
    }
  }

  const sourcesOut: string[] = [];
  if (Array.isArray(o.sources)) {
    for (const s of o.sources) {
      if (typeof s !== 'string') continue;
      const t = s.trim();
      if (t && isHttpUrl(t)) sourcesOut.push(t);
    }
  }

  const state = normalizeEnrichedState(o.state);

  return { description, faq: faqOut, sources: sourcesOut, state };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractReadableTextFromHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<\/(p|div|section|article|main|header|footer|aside|li|ul|ol|h[1-6]|br)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ ]{2,}/g, ' ')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function fetchOfficialWebsiteSource(
  officialUrl: string | null | undefined
): Promise<{ url: string; text: string } | null> {
  const normalizedUrl = normalizeProviderOfficialUrl(officialUrl);
  if (!normalizedUrl) return null;

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ScholarshipTopProviderBot/1.0; +https://scholarshiptop.com)',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html')) return null;
    const html = await response.text();
    const text = extractReadableTextFromHtml(html).slice(0, 12000).trim();
    if (!text) return null;
    return {
      url: response.url || normalizedUrl,
      text
    };
  } catch {
    return null;
  }
}

/**
 * Calls OpenAI once with a strict JSON schema prompt.
 * Shared by Next.js server code and CLI scripts (no `server-only` here).
 */
export async function enrichProviderData(
  providerName: string,
  options?: {
    officialUrl?: string | null;
  }
): Promise<ProviderEnrichmentResult> {
  const empty: ProviderEnrichmentResult = {
    description: null,
    faq: [],
    sources: [],
    state: null
  };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return empty;

  const model =
    process.env.OPENAI_PROVIDER_ENRICH_MODEL?.trim() || 'gpt-4o-mini';

  const nameInPrompt = JSON.stringify(providerName);
  const source = await fetchOfficialWebsiteSource(options?.officialUrl);

  const userPrompt = source
    ? `You are a strict data researcher. Use ONLY the supplied source material from the organization's official website.
Organization: ${nameInPrompt}
Official URL: ${JSON.stringify(source.url)}

Source material:
"""
${source.text}
"""

Rules:
1. DO NOT invent information. If the source material does not support a fact, return null.
2. Provide a 2-3 paragraph objective description of their mission and history.
3. Generate 3-4 FAQ pairs based ONLY on this source material.
4. Return an array of the exact URL sources you used. Prefer the official URL above.
5. Identify the primary U.S. state (USPS two-letter code, e.g. "CA") where the organization is headquartered or primarily operates in the United States. If unknown, nationwide, or non-US, set "state" to null.
6. You MUST respond in valid JSON format matching this schema:
{ "description": "...", "faq": [{"q": "..", "a": ".."}], "sources": ["url1", "url2"], "state": "CA" | null }`
    : `You are a strict data researcher. Find factual information about the organization: ${nameInPrompt}.
Rules:
1. DO NOT invent information. If you cannot find something, return null.
2. Provide a 2-3 paragraph objective description of their mission and history.
3. Generate 3-4 FAQ pairs based ONLY on real data.
4. Return an array of the exact URL sources you used.
5. Identify the primary U.S. state (USPS two-letter code, e.g. "CA") where the organization is headquartered or primarily operates in the United States. If the organization is nationwide with no clear primary state, is not US-based, or unknown, set "state" to null.
6. You MUST respond in valid JSON format matching this schema:
{ "description": "...", "faq": [{"q": "..", "a": ".."}], "sources": ["url1", "url2"], "state": "CA" | null }`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You output only one JSON object. Use null for unknown description or state. Omit speculation. FAQ items must be grounded in the same facts as the description. Sources must be absolute https URLs. Field "state" must be a valid USPS two-letter US state code or null.'
        },
        { role: 'user', content: userPrompt }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return empty;

    const parsed = parseEnrichmentJson(text);
    if (!parsed) return empty;
    if (parsed.sources.length === 0 && source?.url) {
      parsed.sources = [source.url];
    }
    return parsed;
  } catch {
    return empty;
  }
}
