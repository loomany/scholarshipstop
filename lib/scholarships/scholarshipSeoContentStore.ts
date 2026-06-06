import 'server-only';

import fs from 'fs';
import path from 'path';
import { cache } from 'react';

import type { LongTailSeoBundle } from '@/lib/scholarships/longTailSeoTypes';
import { sanitizeSeoBundleNumericClaims } from '@/lib/scholarships/seoAiNumericSanitizer';
import {
  cleanScholarshipFaqItems,
  cleanScholarshipGeneratedText,
  cleanScholarshipStringArray
} from '@/lib/scholarships/scholarshipSeoSanitizers';

function contentFilePath(canonicalPath: string): string {
  const safe = canonicalPath.replace(/\//g, '__');
  return path.join(
    process.cwd(),
    'data',
    'seo-scholarship-content',
    `${safe}.json`
  );
}

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

function cleanOptionalSeoText(value: unknown): string | undefined {
  return typeof value === 'string'
    ? cleanScholarshipGeneratedText(value) || undefined
    : undefined;
}

function cleanOptionalStringOrBulletField(
  value: string | string[] | undefined
): string | string[] | undefined {
  if (Array.isArray(value)) {
    const cleaned = cleanScholarshipStringArray(value);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  return cleanScholarshipGeneratedText(value) || undefined;
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

function readScholarshipSeoContentImpl(
  canonicalPath: string
): LongTailSeoBundle | null {
  const fp = contentFilePath(canonicalPath);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const j = JSON.parse(raw) as unknown;
    if (!isValidBundle(j)) return null;
    const faqRaw = (j as LongTailSeoBundle).faq;
    const faq =
      Array.isArray(faqRaw) && faqRaw.length > 0
        ? (faqRaw
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
            .filter(Boolean) as { question: string; answer: string }[])
        : undefined;
    const seoTitle = cleanScholarshipGeneratedText(j.seo_title);
    const seoDescription = cleanScholarshipGeneratedText(j.seo_description);
    const intro = cleanScholarshipGeneratedText(j.intro);
    if (!seoTitle || !seoDescription || !intro) return null;

    const rawBundle: LongTailSeoBundle = {
      seo_title: seoTitle,
      seo_description: seoDescription,
      intro,
      h1:
        typeof (j as Record<string, unknown>).h1 === 'string'
          ? cleanOptionalSeoText((j as Record<string, unknown>).h1)
          : undefined,
      supporting: (() => {
        const raw = j as Record<string, unknown>;
        const s =
          typeof raw.supporting === 'string'
            ? raw.supporting
            : typeof raw.supporting_text === 'string'
              ? raw.supporting_text
              : typeof raw.supportingText === 'string'
                ? raw.supportingText
                : '';
        return cleanOptionalSeoText(s);
      })(),
      related_intro:
        typeof (j as Record<string, unknown>).related_intro === 'string'
          ? cleanOptionalSeoText((j as Record<string, unknown>).related_intro)
          : typeof (j as Record<string, unknown>).relatedIntro === 'string'
            ? cleanOptionalSeoText((j as Record<string, unknown>).relatedIntro)
            : undefined,
      how_to_use: cleanOptionalStringOrBulletField(
        readStringOrBulletField(
          j as Record<string, unknown>,
          'how_to_use',
          'howToUse'
        )
      ),
      who_for: cleanOptionalStringOrBulletField(
        readStringOrBulletField(
          j as Record<string, unknown>,
          'who_for',
          'whoFor'
        )
      ),
      faq: cleanScholarshipFaqItems(faq),
      page_data:
        (j as Record<string, unknown>).page_data &&
        typeof (j as Record<string, unknown>).page_data === 'object'
          ? ((j as Record<string, unknown>)
              .page_data as LongTailSeoBundle['page_data'])
          : undefined
    };
    if (rawBundle.faq?.length === 0) {
      rawBundle.faq = undefined;
    }

    const meta = (j as LongTailSeoBundle)._meta;
    return sanitizeSeoBundleNumericClaims({
      ...rawBundle,
      ...(meta ? { _meta: meta } : {})
    });
  } catch {
    return null;
  }
}

/** AI / hand-authored JSON: `data/seo-scholarship-content/{canonicalPath with / → __}.json` */
export const readScholarshipSeoContent = cache(readScholarshipSeoContentImpl);
