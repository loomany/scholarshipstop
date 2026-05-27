/**
 * Post-generation quality checks for manifest SEO AI JSON (script-side).
 */

import { stripNumericTokensFromSeoProse } from '@/lib/scholarships/seoAiNumericSanitizer';

export type SeoQualityContext = {
  scholarshipsCount: number;
  awardMinUsd: number | null;
  awardMaxUsd: number | null;
  awardNumericKnownCount: number;
};

const BANNED_INTRO_PREFIXES = [
  'browse scholarships',
  'this page helps',
  'this page is designed',
  'welcome to',
  'on this page you',
  'majors and applicants can',
  'students and applicants can',
  'whether you are a student',
  'looking for scholarships can',
  'our usa catalog',
  'in our usa catalog',
  'scholarships in our usa',
  'use this page to browse',
  'this filtered view helps'
];

const VAGUE_BULLET_PATTERNS = [
  /students who need scholarships/i,
  /people looking for opportunities/i,
  /anyone interested in scholarships/i,
  /field-aligned/i,
  /filter-friendly/i,
  /strong overlap/i,
  /explore opportunities/i
];

function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function wordCount(s: string): number {
  return norm(s)
    .split(/\s+/)
    .filter(Boolean).length;
}

function introOpeningWords(s: string, n: number): string {
  const w = norm(s)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n);
  return w.join(' ');
}

/** Dollar amounts like $1,234 or $500 */
function extractUsdMentions(text: string): number[] {
  const out: number[] = [];
  const re = /\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const v = parseFloat(m[1]!.replace(/,/g, ''));
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

function normalizeBulletField(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x).trim())
      .filter(Boolean)
      .map((x) => x.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

export type BodyFields = {
  intro: string;
  supporting: string;
  related_intro?: string | null;
  who_for: string[];
  how_to_use: string[];
};

export function parseModelBodyFields(body: Record<string, unknown>): BodyFields | null {
  const intro = typeof body.intro === 'string' ? body.intro.trim() : '';
  const supporting = typeof body.supporting === 'string' ? body.supporting.trim() : '';
  if (!intro || !supporting) return null;
  const who_for = normalizeBulletField(body.who_for);
  const how_to_use = normalizeBulletField(body.how_to_use);
  const related_raw = body.related_intro;
  const related_intro =
    related_raw === null || related_raw === undefined
      ? undefined
      : typeof related_raw === 'string'
        ? related_raw.trim() || null
        : undefined;
  return {
    intro,
    supporting,
    related_intro,
    who_for,
    how_to_use
  };
}

/** Intro/supporting/bullets: soft thresholds (models often land slightly under “ideal”). */
export const SEO_AI_INTRO_WORDS_MIN = 58;
export const SEO_AI_INTRO_WORDS_MAX = 220;
export const SEO_AI_SUPPORTING_WORDS_MIN = 36;
export const SEO_AI_SUPPORTING_WORDS_MAX = 170;
export const SEO_AI_WHO_BULLET_WORDS_MIN = 3;
export const SEO_AI_HOW_BULLET_WORDS_MIN = 4;

const INTRO_WORDS_MIN = SEO_AI_INTRO_WORDS_MIN;
const INTRO_WORDS_MAX = SEO_AI_INTRO_WORDS_MAX;
const SUPPORTING_WORDS_MIN = SEO_AI_SUPPORTING_WORDS_MIN;
const SUPPORTING_WORDS_MAX = SEO_AI_SUPPORTING_WORDS_MAX;
const WHO_BULLET_WORDS_MIN = SEO_AI_WHO_BULLET_WORDS_MIN;
const HOW_BULLET_WORDS_MIN = SEO_AI_HOW_BULLET_WORDS_MIN;

/** Count > 0: qualitative scale cue (no digits — counts render in the page shell). */
const SCALE_HINT =
  /\b(dozens|hundreds|many|numerous|several|wide range|broad mix|listing|listings|programs?|options?|matches|catalog|scholarships?|rows?|results|filter(?:ed)?\s+view|this\s+view|these\s+rows|curated slice|this\s+set)\b/i;

export function validateSeoAiBody(
  body: BodyFields,
  q: SeoQualityContext
): { ok: boolean; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const introW = wordCount(body.intro);
  if (introW < INTRO_WORDS_MIN) {
    reasons.push(
      `intro too short (${introW} words, min ${INTRO_WORDS_MIN})`
    );
  }
  if (introW > INTRO_WORDS_MAX) {
    reasons.push(`intro too long (${introW} words, max ${INTRO_WORDS_MAX})`);
  }

  const supW = wordCount(body.supporting || '');
  if (supW < SUPPORTING_WORDS_MIN) {
    reasons.push(
      `supporting too short (${supW} words, min ${SUPPORTING_WORDS_MIN})`
    );
  }
  if (supW > SUPPORTING_WORDS_MAX) {
    reasons.push(
      `supporting long (${supW} words, max ${SUPPORTING_WORDS_MAX})`
    );
  }

  const introLower = norm(body.intro);
  for (const banned of BANNED_INTRO_PREFIXES) {
    if (introLower.startsWith(banned) || introLower.startsWith(banned + ' ')) {
      reasons.push(`intro opens with banned generic phrase (“${banned}…”)`);
      break;
    }
  }

  const dollars = extractUsdMentions(
    `${body.intro}\n${body.supporting}\n${(body.related_intro as string) || ''}`
  );
  if (dollars.length > 0) {
    const thin =
      q.awardMinUsd == null ||
      q.awardMaxUsd == null ||
      q.awardNumericKnownCount < 5;
    if (thin) {
      warnings.push(
        'dollar amounts present with thin/missing numeric aggregate in context (prefer paraphrasing “award sizes vary”)'
      );
    } else {
      const awardMinUsd = q.awardMinUsd!;
      const awardMaxUsd = q.awardMaxUsd!;
      const pad = (awardMaxUsd - awardMinUsd) * 0.15 + 500;
      const lo = awardMinUsd - pad;
      const hi = awardMaxUsd + pad;
      let bad = false;
      for (const d of dollars) {
        if (d < lo || d > hi) {
          reasons.push(
            `dollar figure ${d} outside allowed aggregate sample range (~${q.awardMinUsd}–${q.awardMaxUsd})`
          );
          bad = true;
          break;
        }
      }
      if (!bad && dollars.length > 3) {
        warnings.push('many specific dollar figures—ensure each aligns with context');
      }
    }
  }

  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(body.intro + body.supporting)) {
    reasons.push(
      'avoid specific calendar dates in intro/supporting unless provided in context'
    );
  }

  if (body.who_for.length < 3 || body.who_for.length > 5) {
    reasons.push(`who_for should have 3–5 bullets (got ${body.who_for.length})`);
  }
  if (body.how_to_use.length < 3 || body.how_to_use.length > 5) {
    reasons.push(
      `how_to_use should have 3–5 bullets (got ${body.how_to_use.length})`
    );
  }

  for (const b of body.who_for) {
    const wc = wordCount(b);
    if (wc < WHO_BULLET_WORDS_MIN) {
      reasons.push(
        `who_for bullet too short (${wc} words, min ${WHO_BULLET_WORDS_MIN})`
      );
    }
    for (const p of VAGUE_BULLET_PATTERNS) {
      if (p.test(b)) {
        reasons.push(`vague who_for bullet: ${b.slice(0, 60)}`);
        break;
      }
    }
  }

  for (const b of body.how_to_use) {
    const wc = wordCount(b);
    if (wc < HOW_BULLET_WORDS_MIN) {
      reasons.push(
        `how_to_use bullet too short (${wc} words, min ${HOW_BULLET_WORDS_MIN})`
      );
    }
  }

  if (q.scholarshipsCount > 0) {
    const combined = `${body.intro}\n${body.supporting}`;
    if (!SCALE_HINT.test(combined)) {
      reasons.push(
        'when listings exist, signal scale without numbers (e.g. listings, programs, this view, catalog slice)'
      );
    }
  }

  const proseBundle = [
    body.intro,
    body.supporting,
    body.related_intro ?? ''
  ].join('\n');
  if (/\d/.test(proseBundle)) {
    reasons.push(
      'intro/supporting/related_intro must not contain digits; scholarship counts and amounts are shown from live data'
    );
  }
  for (const b of body.who_for.concat(body.how_to_use)) {
    if (/\d/.test(b)) {
      reasons.push(
        'who_for/how_to_use bullets must not contain digits'
      );
      break;
    }
  }

  return { ok: reasons.length === 0, reasons, warnings };
}

/** @deprecated use buildBodyQaRetryPrompt in seoScholarshipPrompts for retries */
export function buildStrictRetryAddon(failedReasons: string[]): string {
  return `

STRICT FIX (retry):
The previous JSON failed editorial checks:
${failedReasons.map((r) => `- ${r}`).join('\n')}

Rewrite intro, supporting, who_for (3–5 bullets), how_to_use (3–5 bullets), related_intro only. Keep JSON shape. Obey all rules from the main instructions. Do not repeat the same opening clause.`;
}

/**
 * Safe template when model output fails validation twice. Still uses only aggregate count / path theme.
 */
export function buildDeterministicSeoBody(
  h1Fallback: string,
  _canonicalPath: string,
  q: SeoQualityContext
): BodyFields {
  const hasRows = q.scholarshipsCount > 0;
  const countSentence = hasRows
    ? 'The list below is filtered to this topic so you can scan a focused set instead of the full open catalog.'
    : 'Matches in this view change as listings are added or updated.';

  const awardSentence =
    ' Award sizes and payout wording vary by row; use each card to compare available award context, eligibility signals, and application effort.';

  const topicLabel =
    stripNumericTokensFromSeoProse(h1Fallback).trim() || h1Fallback;
  const intro = `If you’re hunting awards that fit “${topicLabel},” this view keeps the signal high. ${countSentence}${awardSentence} Deadlines and requirement lines differ row to row—use them to shortlist, prepare materials, and continue toward the provider application path when ready.`;

  const supporting = `Start with sort (deadline or amount) to surface what matters today, then read the requirement snippet under each title before you decide what to save. When two listings look alike, compare their deadline, award, eligibility, and effort rows side by side. Use this list to narrow your shortlist, plan documents, and move toward the application path with more context.`;

  const who_for = [
    `Anyone who wants a tighter set of options for ${h1Fallback} than the full open catalog`,
    `Students stacking several applications and needing a fast way to compare effort versus payoff`,
    `Applicants who like scanning structured rows before planning provider submissions`
  ];

  const how_to_use = [
    `Pick a sort order so urgent deadlines or larger award text float to the top`,
    `Skim the requirement line on each card for a quick fit check`,
    `Use the provider application path when the listing fits your plan`,
    `Keep a short shortlist instead of spreading thin across weak matches`,
    `Use ScholarshipTop signals to plan documents, essays, and next steps`
  ];

  const related_intro =
    'Below are related filter pages—different state, topic, or requirement angle—if you want to widen your shortlist while keeping the same structured comparison workflow.';

  return {
    intro,
    supporting,
    related_intro,
    who_for,
    how_to_use
  };
}

export function validateSeoMeta(meta: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const h1 = typeof meta.h1 === 'string' ? meta.h1.trim() : '';
  const title = typeof meta.seo_title === 'string' ? meta.seo_title.trim() : '';
  if (h1.length < 10) reasons.push('h1 too short or missing');
  if (h1.length > 78) reasons.push('h1 too long');
  if (title.length < 18) reasons.push('seo_title too short');
  if (title.length > 72) reasons.push('seo_title too long');
  const desc =
    typeof meta.seo_description === 'string' ? meta.seo_description.trim() : '';
  if (desc.length < 55) reasons.push('seo_description too short');
  if (desc.length > 168) reasons.push('seo_description too long');
  const combined = `${h1}\n${title}\n${desc}`;
  if (/\d/.test(combined)) {
    reasons.push(
      'h1/seo_title/seo_description must not contain digits (counts belong in the live UI)'
    );
  }
  return reasons;
}

export { introOpeningWords, BANNED_INTRO_PREFIXES, VAGUE_BULLET_PATTERNS, wordCount };
