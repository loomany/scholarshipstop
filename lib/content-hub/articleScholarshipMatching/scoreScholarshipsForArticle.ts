import type { Json } from '@/types_db';

import type {
  ArticleSignals,
  ScoredScholarshipMatch,
  ScholarshipMatchDbRow
} from './types';

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
}

export function buildScholarshipHaystack(row: ScholarshipMatchDbRow): string {
  const tags = jsonStringArray(row.tags).join(' ');
  const levels = jsonStringArray(row.study_levels).join(' ');
  const fields = jsonStringArray(row.field_of_study).join(' ');
  return [
    row.title,
    row.description,
    row.summary_short,
    row.eligibility_text,
    row.category,
    row.category_slug,
    tags,
    levels,
    fields,
    row.location_scope,
    row.award_amount_text
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const AUDIENCE_PATTERNS: Record<string, RegExp> = {
  women: /women|female|\bwoman\b/i,
  minority: /minority|underrepresented|diverse/i,
  'low-income': /low[- ]income|financial need|need[- ]based|economic/i,
  'first-generation': /first[- ]generation|first gen/i,
  'stem students': /stem|science|technology|engineering|mathematics/i,
  'graduate students': /graduate|master/i,
  'undergraduate students': /undergraduate|bachelor|college freshman/i,
  phd: /ph\.?d|doctoral|doctorate/i
};

const FIELD_ALIASES: Record<string, RegExp> = {
  STEM: /stem|science|math|technology/i,
  engineering: /engineer/i,
  'computer science': /computer science|\bcs\b|software|informatics/i,
  business: /business|commerce|finance|accounting|mba/i,
  law: /law|legal|juris|pre[- ]law/i,
  medicine: /medicine|medical|pre[- ]med|physician/i,
  nursing: /nursing|nurse/i,
  education: /education|teaching|teacher|k[- ]12/i
};

const FUNDING_PATTERNS: Record<string, RegExp> = {
  'fully funded': /fully funded|full tuition|full ride|full award/i,
  'need-based': /need[- ]based|financial need/i,
  'merit-based': /merit[- ]based|academic excellence/i
};

const COUNTRY_PATTERNS: Record<string, RegExp> = {
  usa: /united states|\bu\.s\.|\busa\b|u\.s\. citizen|domestic student|\b50 states\b/i,
  canada: /\bcanada\b|canadian/i,
  uk: /united kingdom|\bu\.k\.|british|england|scotland|wales/i,
  australia: /australia|australian/i,
  international: /international|foreign student|study abroad|global/i
};

function scholarshipCountryHits(hay: string): string[] {
  const out: string[] = [];
  for (const [id, re] of Object.entries(COUNTRY_PATTERNS)) {
    if (re.test(hay)) out.push(id);
  }
  return out;
}

function titleTokenBonus(articleTitle: string, scholarshipTitle: string): number {
  const a = new Set(
    articleTitle
      .toLowerCase()
      .match(/\b[a-z][a-z'-]{2,}\b/g)
      ?.filter((w) => !STOP_TITLE.has(w)) ?? []
  );
  const b = new Set(
    scholarshipTitle
      .toLowerCase()
      .match(/\b[a-z][a-z'-]{2,}\b/g) ?? []
  );
  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter += 1;
  }
  return Math.min(15, inter * 3);
}

const STOP_TITLE = new Set([
  'the',
  'and',
  'for',
  'scholarship',
  'scholarships',
  'student',
  'students',
  'guide',
  'how',
  'your',
  'with',
  'from',
  'that',
  'this',
  'are',
  'can',
  'top',
  'best',
  'new',
  'year'
]);

function scoreScholarship(
  signals: ArticleSignals,
  articleTitleNorm: string,
  row: ScholarshipMatchDbRow,
  haystack: string
): number {
  let score = 0;

  const schCountries = scholarshipCountryHits(haystack);
  if (
    signals.countries.some((c) => schCountries.includes(c)) ||
    (signals.countries.includes('usa') && /united states|\bu\.s\./i.test(haystack))
  ) {
    score += 10;
  }

  let audiencePts = 0;
  for (const aud of signals.audiences) {
    const re = AUDIENCE_PATTERNS[aud];
    if (re && re.test(haystack)) audiencePts = 10;
  }
  score += audiencePts;

  const levels = jsonStringArray(row.study_levels).map((s) => s.toLowerCase());
  let degreePts = 0;
  for (const d of signals.degrees) {
    const dl = d.toLowerCase();
    if (
      levels.some(
        (l) => l.includes(dl) || dl.includes(l) || l.replace(/\s+/g, '') === dl.replace(/\s+/g, '')
      )
    ) {
      degreePts = 8;
      break;
    }
  }
  if (!degreePts) {
    for (const d of signals.degrees) {
      if (d === 'PhD' && /ph\.?d|doctoral/i.test(haystack)) degreePts = 8;
      if (d === "master's" && /master/i.test(haystack)) degreePts = 8;
      if (d === 'undergraduate' && /undergraduate|bachelor/i.test(haystack))
        degreePts = 8;
      if (degreePts) break;
    }
  }
  score += degreePts;

  let fieldPts = 0;
  for (const f of signals.fields) {
    const re = FIELD_ALIASES[f];
    if (re && re.test(haystack)) fieldPts = Math.max(fieldPts, 8);
    const slug = row.category_slug?.toLowerCase() ?? '';
    const fNorm = f.toLowerCase().replace(/\s+/g, '');
    if (slug && fNorm && slug.replace(/_/g, '').includes(fNorm.slice(0, 4)))
      fieldPts = Math.max(fieldPts, 6);
  }
  score += Math.min(8, fieldPts);

  let fundPts = 0;
  for (const ft of signals.fundingTypes) {
    const re = FUNDING_PATTERNS[ft];
    if (re && re.test(haystack)) fundPts = 6;
  }
  score += fundPts;

  let kw = 0;
  for (const k of signals.keywords) {
    if (haystack.includes(k)) {
      kw += 2;
      if (kw >= 10) break;
    }
  }
  score += kw;

  const st = row.title?.trim() ?? '';
  if (st) score += titleTokenBonus(articleTitleNorm, st);

  return score;
}

export function findScholarshipsForArticle(
  signals: ArticleSignals,
  articleTitle: string,
  rows: ScholarshipMatchDbRow[]
): ScoredScholarshipMatch[] {
  const articleTitleNorm = articleTitle.trim();
  const bySlug = new Map<string, ScoredScholarshipMatch>();

  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug) continue;
    const haystack = buildScholarshipHaystack(row);
    const score = scoreScholarship(signals, articleTitleNorm, row, haystack);
    if (score <= 0) continue;
    const prev = bySlug.get(slug);
    if (!prev || score > prev.score) {
      bySlug.set(slug, { row, score, haystack });
    }
  }

  return [...bySlug.values()].sort((a, b) => b.score - a.score);
}
