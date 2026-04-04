/**
 * Generate-once: writes data/long-tail-seo/{slug}.json via OpenAI.
 * Run: OPENAI_API_KEY=... npm run generate-long-tail-seo
 * Optional: SCHOLARSHIPS_API_URL=http://localhost:3000/api/scholarships for counts in prompt.
 */

import fs from 'fs';
import path from 'path';

import OpenAI from 'openai';

import {
  LONG_TAIL_SEO_DATA_SLUGS,
  longTailSeoJsonPath,
  type LongTailSeoDataSlug
} from '../lib/scholarships/longTailSeoPaths';
import type { LongTailSeoBundle } from '../lib/scholarships/longTailSeoTypes';
import {
  buildLongTailUserPrompt,
  LONG_TAIL_SEO_SYSTEM_PROMPT
} from '../lib/scholarships/longTailSeoPrompt';

function isValidBundle(x: unknown): x is LongTailSeoBundle {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.seo_title === 'string' &&
    typeof o.seo_description === 'string' &&
    typeof o.intro === 'string'
  );
}

async function fetchApproximateCount(): Promise<number | undefined> {
  const base = process.env.SCHOLARSHIPS_API_URL?.trim();
  const url = base || '';
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? data.length : undefined;
  } catch {
    return undefined;
  }
}

async function generateForSlug(
  client: OpenAI,
  slug: LongTailSeoDataSlug,
  approximateCount?: number
): Promise<LongTailSeoBundle> {
  const userPrompt = buildLongTailUserPrompt(
    slug,
    approximateCount != null ? { approximateCount } : undefined
  );

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_LONG_TAIL_MODEL?.trim() || 'gpt-4o-mini',
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: LONG_TAIL_SEO_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error(`Empty OpenAI response for ${slug}`);

  const parsed = JSON.parse(text) as unknown;
  if (!isValidBundle(parsed)) {
    throw new Error(`Invalid JSON shape for ${slug}`);
  }

  return {
    seo_title: parsed.seo_title.trim(),
    seo_description: parsed.seo_description.trim(),
    intro: parsed.intro.trim()
  };
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), 'data', 'long-tail-seo');
  fs.mkdirSync(outDir, { recursive: true });

  const client = new OpenAI({ apiKey: key });
  const count = await fetchApproximateCount();
  if (count != null) {
    console.log(`Using listing_stats approximate_count=${count}`);
  } else {
    console.log(
      'No SCHOLARSHIPS_API_URL (optional); prompts omit listing counts.'
    );
  }

  for (const slug of LONG_TAIL_SEO_DATA_SLUGS) {
    console.log(`Generating ${slug}…`);
    const bundle = await generateForSlug(client, slug, count);
    const fp = longTailSeoJsonPath(slug);
    fs.writeFileSync(fp, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${fp}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
