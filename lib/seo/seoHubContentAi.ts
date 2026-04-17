import OpenAI from 'openai';

import type { Json } from '@/types_db';

export type SeoHubCostOfLivingJson = {
  average_room_rent_usd_monthly?: number | null;
  typical_lunch_usd?: number | null;
  monthly_transport_usd?: number | null;
  notes?: string | null;
};

export function openAiSeoHubModel(): string {
  return (
    process.env.OPENAI_SEO_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini'
  );
}

export function parseCostJson(raw: Json | null): SeoHubCostOfLivingJson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    average_room_rent_usd_monthly:
      typeof o.average_room_rent_usd_monthly === 'number'
        ? o.average_room_rent_usd_monthly
        : null,
    typical_lunch_usd:
      typeof o.typical_lunch_usd === 'number' ? o.typical_lunch_usd : null,
    monthly_transport_usd:
      typeof o.monthly_transport_usd === 'number'
        ? o.monthly_transport_usd
        : null,
    notes: typeof o.notes === 'string' ? o.notes : null
  };
}

export type SeoHubAiPayload = {
  title: string;
  h1?: string;
  meta_description?: string;
  content_html: string;
  cost_of_living: SeoHubCostOfLivingJson;
};

export function buildSeoHubPrompt(args: {
  stateName: string;
  topicLabel: string | null;
  degreeLabel?: string | null;
  year: number;
}): string {
  const topic = args.topicLabel?.trim();
  const degree = args.degreeLabel?.trim();
  const audience = degree
    ? `${degree} students`
    : 'prospective students';
  const scope = topic
    ? `scholarships and financial aid in ${args.stateName} with emphasis on ${topic} fields, for ${audience}`
    : `studying in ${args.stateName} (${audience})`;

  return [
    'You are an expert education writer. Respond with a single JSON object only (no markdown fences). Keys:',
    '{"title": string, "h1": string, "meta_description": string, "content_html": string, "cost_of_living": {',
    '  "average_room_rent_usd_monthly": number | null,',
    '  "typical_lunch_usd": number | null,',
    '  "monthly_transport_usd": number | null,',
    '  "notes": string',
    '}}',
    '',
    `h1: one line, human-readable page headline (max 90 chars), include ${args.stateName}${topic ? `, ${topic}` : ''}${degree ? `, ${degree}` : ''}.`,
    '',
    `meta_description: 140–160 characters for search results; compelling; mention scholarships + ${args.stateName}${topic ? ` + ${topic}` : ''}.`,
    '',
    `Main article (content_html): Write a ~300-word SEO guide about ${scope} for ${args.year}. Mention climate, overall educational atmosphere, and 3 famous universities in ${args.stateName}. Tone: professional and helpful for international students. Use semantic HTML only: <article><h2>...</h2><p>...</p></article>.`,
    '',
    `Cost of living block: in cost_of_living, give realistic ballpark figures for ${args.stateName} (USD). If uncertain, set numbers to null and explain in notes. Also include a short bullet list inside notes covering average room rent, lunch, and transport.`,
    '',
    `Title: concise SEO title for this page (max 70 chars), include ${args.stateName}${topic ? ` and ${topic}` : ''}.`
  ].join('\n');
}

export async function generateSeoHubWithOpenAi(args: {
  stateName: string;
  topicLabel: string | null;
  degreeLabel?: string | null;
  year: number;
}): Promise<SeoHubAiPayload | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: openAiSeoHubModel(),
    temperature: 0.45,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Return only valid JSON matching the user schema. No prose outside JSON.'
      },
      { role: 'user', content: buildSeoHubPrompt(args) }
    ]
  });
  const raw = res.choices[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SeoHubAiPayload;
    if (!parsed.content_html || typeof parsed.content_html !== 'string')
      return null;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : args.stateName,
      h1: typeof parsed.h1 === 'string' ? parsed.h1 : undefined,
      meta_description:
        typeof parsed.meta_description === 'string'
          ? parsed.meta_description
          : undefined,
      content_html: parsed.content_html,
      cost_of_living: {
        ...parseCostJson(parsed.cost_of_living as unknown as Json)
      }
    };
  } catch {
    return null;
  }
}
