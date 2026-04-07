import 'server-only';

import OpenAI from 'openai';

export type ProviderEnrichmentFaqItem = { question: string; answer: string };

export type ProviderEnrichmentResult = {
  description: string | null;
  faq: ProviderEnrichmentFaqItem[];
  sources: string[];
};

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

  return { description, faq: faqOut, sources: sourcesOut };
}

/**
 * Calls OpenAI once with a strict JSON schema prompt. Intended for server-side use only.
 * Without web browsing, the model may return partial or empty results; callers should persist
 * whatever is returned and mark the row enriched to avoid repeat spend.
 */
export async function enrichProviderData(
  providerName: string
): Promise<ProviderEnrichmentResult> {
  const empty: ProviderEnrichmentResult = {
    description: null,
    faq: [],
    sources: []
  };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return empty;

  const model =
    process.env.OPENAI_PROVIDER_ENRICH_MODEL?.trim() || 'gpt-4o-mini';

  const nameInPrompt = JSON.stringify(providerName);

  const userPrompt = `You are a strict data researcher. Find factual information about the organization: ${nameInPrompt}.
Rules:
1. DO NOT invent information. If you cannot find something, return null.
2. Provide a 2-3 paragraph objective description of their mission and history.
3. Generate 3-4 FAQ pairs based ONLY on real data.
4. Return an array of the exact URL sources you used.
5. You MUST respond in valid JSON format matching this schema:
{ "description": "...", "faq": [{"q": "..", "a": ".."}], "sources": ["url1", "url2"] }`;

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
            'You output only one JSON object. Use null for unknown description. Omit speculation. FAQ items must be grounded in the same facts as the description. Sources must be absolute https URLs.'
        },
        { role: 'user', content: userPrompt }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return empty;

    const parsed = parseEnrichmentJson(text);
    return parsed ?? empty;
  } catch {
    return empty;
  }
}
