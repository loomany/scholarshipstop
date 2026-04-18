import OpenAI from 'openai';

import type { Json } from '@/types_db';

import { openAiSeoHubModel } from '@/lib/seo/seoHubContentAi';
import type { CompareSourceLink } from '@/lib/seo/compareSources';

export type UniversityCompareAiPayload = {
  ai_verdict: string;
  meta_title: string;
  meta_description: string;
  content_json: {
    body_html?: string;
    essay_insights?: { inst_a: string; inst_b: string };
    faq?: { q: string; a: string }[];
    sources?: CompareSourceLink[];
  };
};

export type StateCompareAiPayload = {
  ai_verdict: string;
  meta_title: string;
  meta_description: string;
  content_json: {
    body_html?: string;
    climate_summary?: { state_a: string; state_b: string };
    faq?: { q: string; a: string }[];
  };
};

function buildComparePrompt(
  factsJson: string,
  year: number,
  sourceCandidates: CompareSourceLink[]
): string {
  return [
    'You are an expert financial aid analyst for U.S. higher education.',
    'Respond with a single JSON object only (no markdown fences). Keys:',
    '{"ai_verdict": string, "meta_title": string, "meta_description": string, "content_json": {',
    '  "body_html": string (semantic HTML: <article><h2>...</h2><p>...</p></article>, short analytical overview),',
    '  "essay_insights": { "inst_a": string, "inst_b": string } (compare writing effort / themes using only facts),',
    '  "faq": [ { "q": string, "a": string } ] (3–5 practical Q&As),',
    '  "sources": [ { "label": string, "url": string, "type": string } ] (4–6 links selected ONLY from SOURCE_CANDIDATES_JSON)',
    '}}',
    '',
    `Year context for titles: ${year}.`,
    '',
    'Rules:',
    '- Use ONLY facts present in the FACTS_JSON below for numbers, counts, and percentages.',
    '- If a metric is missing or null in FACTS_JSON, write "No data available" for that point — never invent figures.',
    '- Tone: expert, neutral, helpful for applicants comparing aid and essays.',
    '- ai_verdict: 1–2 sentences "Who is it for?" contrasting the two schools (no invented stats).',
    `- meta_title: ≤70 chars; include both university names and "${year}".`,
    '- meta_description: 140–160 chars; compelling; mention scholarship comparison.',
    '- For sources: do not invent URLs, do not output any URL that is not present in SOURCE_CANDIDATES_JSON.',
    '- Prefer official university websites first, then government or high-authority reference sites.',
    '',
    'SOURCE_CANDIDATES_JSON:',
    JSON.stringify(sourceCandidates),
    '',
    'FACTS_JSON:',
    factsJson
  ].join('\n');
}

export async function generateUniversityCompareWithOpenAi(args: {
  factsJson: string;
  year: number;
  sourceCandidates: CompareSourceLink[];
}): Promise<UniversityCompareAiPayload | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: openAiSeoHubModel(),
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Return only valid JSON matching the user schema. No prose outside JSON.'
      },
      {
        role: 'user',
        content: buildComparePrompt(
          args.factsJson,
          args.year,
          args.sourceCandidates
        )
      }
    ]
  });
  const raw = res.choices[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UniversityCompareAiPayload;
    const sourceCandidateMap = new Map(
      args.sourceCandidates.map((item) => [item.url, item] as const)
    );
    if (typeof parsed.ai_verdict !== 'string' || !parsed.ai_verdict.trim())
      return null;
    if (typeof parsed.meta_title !== 'string' || !parsed.meta_title.trim())
      return null;
    if (
      typeof parsed.meta_description !== 'string' ||
      !parsed.meta_description.trim()
    )
      return null;
    if (!parsed.content_json || typeof parsed.content_json !== 'object')
      return null;
    return {
      ai_verdict: parsed.ai_verdict.trim(),
      meta_title: parsed.meta_title.trim(),
      meta_description: parsed.meta_description.trim(),
      content_json: {
        body_html:
          typeof parsed.content_json.body_html === 'string'
            ? parsed.content_json.body_html
            : undefined,
        essay_insights:
          parsed.content_json.essay_insights &&
          typeof parsed.content_json.essay_insights === 'object'
            ? {
                inst_a:
                  typeof parsed.content_json.essay_insights.inst_a === 'string'
                    ? parsed.content_json.essay_insights.inst_a
                    : '',
                inst_b:
                  typeof parsed.content_json.essay_insights.inst_b === 'string'
                    ? parsed.content_json.essay_insights.inst_b
                    : ''
              }
            : undefined,
        faq: Array.isArray(parsed.content_json.faq)
          ? parsed.content_json.faq
              .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const o = item as Record<string, unknown>;
                const q = typeof o.q === 'string' ? o.q.trim() : '';
                const a = typeof o.a === 'string' ? o.a.trim() : '';
                return q && a ? { q, a } : null;
              })
              .filter(Boolean) as { q: string; a: string }[]
          : undefined,
        sources: Array.isArray(parsed.content_json.sources)
          ? parsed.content_json.sources
              .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const row = item as Record<string, unknown>;
                const url = typeof row.url === 'string' ? row.url.trim() : '';
                if (!url) return null;
                return sourceCandidateMap.get(url) ?? null;
              })
              .filter((item): item is CompareSourceLink => item !== null)
          : args.sourceCandidates.slice(0, 5)
      }
    };
  } catch {
    return null;
  }
}

function buildStateComparePrompt(factsJson: string, year: number): string {
  return [
    'You are an expert scholarship market analyst for U.S. higher education.',
    'Respond with a single JSON object only (no markdown fences). Keys:',
    '{"ai_verdict": string, "meta_title": string, "meta_description": string, "content_json": {',
    '  "body_html": string (semantic HTML: <article><h2>...</h2><p>...</p></article>, short analytical overview),',
    '  "climate_summary": { "state_a": string, "state_b": string } (what each scholarship climate feels like for applicants),',
    '  "faq": [ { "q": string, "a": string } ] (3–5 practical Q&As)',
    '}}',
    '',
    `Year context for titles: ${year}.`,
    '',
    'Rules:',
    '- Use ONLY facts present in the FACTS_JSON below for numbers, counts, and percentages.',
    '- Focus on the scholarship climate: total opportunity volume, average award size, and strongest universities in each state.',
    '- If a metric is missing or null in FACTS_JSON, write "No data available" for that point — never invent figures.',
    '- Tone: expert, neutral, helpful for applicants comparing states.',
    '- ai_verdict: 1–2 sentences "Which state climate suits which applicant?" with no invented stats.',
    `- meta_title: ≤70 chars; include both state names and "${year}".`,
    '- meta_description: 140–160 chars; compelling; mention scholarship comparison.',
    '',
    'FACTS_JSON:',
    factsJson
  ].join('\n');
}

export async function generateStateCompareWithOpenAi(args: {
  factsJson: string;
  year: number;
}): Promise<StateCompareAiPayload | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: openAiSeoHubModel(),
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Return only valid JSON matching the user schema. No prose outside JSON.'
      },
      { role: 'user', content: buildStateComparePrompt(args.factsJson, args.year) }
    ]
  });
  const raw = res.choices[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StateCompareAiPayload;
    if (typeof parsed.ai_verdict !== 'string' || !parsed.ai_verdict.trim()) {
      return null;
    }
    if (typeof parsed.meta_title !== 'string' || !parsed.meta_title.trim()) {
      return null;
    }
    if (
      typeof parsed.meta_description !== 'string' ||
      !parsed.meta_description.trim()
    ) {
      return null;
    }
    if (!parsed.content_json || typeof parsed.content_json !== 'object') {
      return null;
    }
    return {
      ai_verdict: parsed.ai_verdict.trim(),
      meta_title: parsed.meta_title.trim(),
      meta_description: parsed.meta_description.trim(),
      content_json: {
        body_html:
          typeof parsed.content_json.body_html === 'string'
            ? parsed.content_json.body_html
            : undefined,
        climate_summary:
          parsed.content_json.climate_summary &&
          typeof parsed.content_json.climate_summary === 'object'
            ? {
                state_a:
                  typeof parsed.content_json.climate_summary.state_a === 'string'
                    ? parsed.content_json.climate_summary.state_a
                    : '',
                state_b:
                  typeof parsed.content_json.climate_summary.state_b === 'string'
                    ? parsed.content_json.climate_summary.state_b
                    : ''
              }
            : undefined,
        faq: Array.isArray(parsed.content_json.faq)
          ? parsed.content_json.faq
              .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const o = item as Record<string, unknown>;
                const q = typeof o.q === 'string' ? o.q.trim() : '';
                const a = typeof o.a === 'string' ? o.a.trim() : '';
                return q && a ? { q, a } : null;
              })
              .filter(Boolean) as { q: string; a: string }[]
          : undefined
      }
    };
  } catch {
    return null;
  }
}

export function compareAiPayloadToJson(
  payload: UniversityCompareAiPayload
): Json {
  return {
    body_html: payload.content_json.body_html ?? null,
    essay_insights: payload.content_json.essay_insights ?? null,
    faq: payload.content_json.faq ?? null,
    sources: payload.content_json.sources ?? null
  } as unknown as Json;
}

export function stateCompareAiPayloadToJson(payload: StateCompareAiPayload): Json {
  return {
    body_html: payload.content_json.body_html ?? null,
    climate_summary: payload.content_json.climate_summary ?? null,
    faq: payload.content_json.faq ?? null
  } as unknown as Json;
}
