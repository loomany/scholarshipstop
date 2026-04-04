import 'server-only';

import fs from 'fs';
import { cache } from 'react';

import {
  LONG_TAIL_SEO_DATA_SLUGS,
  longTailSeoJsonPath
} from '@/lib/scholarships/longTailSeoPaths';
import type { LongTailSeoBundle } from '@/lib/scholarships/longTailSeoTypes';
import { sanitizeSeoBundleNumericClaims } from '@/lib/scholarships/seoAiNumericSanitizer';

function readStringOrBulletField(
  raw: Record<string, unknown>,
  snake: string,
  camel: string
): string | string[] | undefined {
  const v = raw[snake] ?? raw[camel];
  if (Array.isArray(v)) {
    const arr = v
      .map((x) => String(x).trim())
      .map((x) => x.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function isValidBundle(x: unknown): x is LongTailSeoBundle {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.seo_title === 'string' &&
    typeof o.seo_description === 'string' &&
    typeof o.intro === 'string' &&
    o.seo_title.trim().length > 0 &&
    o.seo_description.trim().length > 0 &&
    o.intro.trim().length > 0
  );
}

function readLongTailSeoBundleImpl(slug: string): LongTailSeoBundle | null {
  if (!(LONG_TAIL_SEO_DATA_SLUGS as readonly string[]).includes(slug)) {
    return null;
  }
  const fp = longTailSeoJsonPath(slug);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const j = JSON.parse(raw) as unknown;
    if (!isValidBundle(j)) return null;
    const faqRaw = j.faq;
    const faq =
      Array.isArray(faqRaw) && faqRaw.length > 0
        ? faqRaw
            .map((item) => {
              if (!item || typeof item !== 'object') return null;
              const q = (item as Record<string, unknown>).question;
              const a = (item as Record<string, unknown>).answer;
              if (typeof q !== 'string' || typeof a !== 'string') return null;
              const qq = q.trim();
              const aa = a.trim();
              if (!qq || !aa) return null;
              return { question: qq, answer: aa };
            })
            .filter(Boolean) as { question: string; answer: string }[]
        : undefined;
    const parsedBundle: LongTailSeoBundle = {
      seo_title: j.seo_title.trim(),
      seo_description: j.seo_description.trim(),
      intro: j.intro.trim(),
      h1: typeof j.h1 === 'string' ? j.h1.trim() || undefined : undefined,
      supporting:
        typeof j.supporting === 'string'
          ? j.supporting.trim() || undefined
          : undefined,
      how_to_use: readStringOrBulletField(j as Record<string, unknown>, 'how_to_use', 'howToUse'),
      who_for: readStringOrBulletField(j as Record<string, unknown>, 'who_for', 'whoFor'),
      faq: faq && faq.length > 0 ? faq : undefined
    };
    const meta = (j as LongTailSeoBundle)._meta;
    return sanitizeSeoBundleNumericClaims({
      ...parsedBundle,
      ...(meta ? { _meta: meta } : {})
    });
  } catch {
    return null;
  }
}

/**
 * Generate-once JSON на диске; рендер только читает файл (без OpenAI).
 * `cache` — один раз за запрос layout + page.
 */
export const readLongTailSeoBundle = cache(readLongTailSeoBundleImpl);
