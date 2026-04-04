import type { ArticleSignals } from './types';
import { htmlToPlainText } from './articlePlainText';

const STOP = new Set([
  'the',
  'and',
  'for',
  'that',
  'this',
  'with',
  'from',
  'your',
  'you',
  'are',
  'can',
  'how',
  'what',
  'when',
  'where',
  'which',
  'who',
  'will',
  'into',
  'about',
  'more',
  'than',
  'then',
  'them',
  'their',
  'have',
  'has',
  'had',
  'not',
  'but',
  'may',
  'also',
  'such',
  'other',
  'some',
  'any',
  'our',
  'all',
  'get',
  'use',
  'using',
  'used',
  'out',
  'one',
  'two',
  'new',
  'way',
  'make',
  'just',
  'like',
  'here',
  'there',
  'each',
  'most',
  'many',
  'very',
  'well',
  'help',
  'tips',
  'guide',
  'article',
  'students',
  'student',
  'school',
  'college',
  'university'
]);

type Labeled = { id: string; patterns: RegExp[] };

const COUNTRIES: Labeled[] = [
  {
    id: 'usa',
    patterns: [
      /\bunited states\b/i,
      /\bu\.s\.a?\b/i,
      /\busa\b/i,
      /\bin the u\.s\.\b/i,
      /\bamerican students\b/i,
      /\bdomestic students\b/i
    ]
  },
  {
    id: 'canada',
    patterns: [/\bcanada\b/i, /\bcanadian\b/i]
  },
  { id: 'uk', patterns: [/\bunited kingdom\b/i, /\bu\.k\.\b/i, /\bbritish\b/i] },
  {
    id: 'australia',
    patterns: [/\baustralia\b/i, /\baustralian\b/i]
  },
  {
    id: 'international',
    patterns: [
      /\binternational students?\b/i,
      /\bforeign students?\b/i,
      /\bstudy abroad\b/i
    ]
  }
];

const AUDIENCES: Labeled[] = [
  { id: 'women', patterns: [/\bwomen\b/i, /\bfemale students?\b/i] },
  { id: 'minority', patterns: [/\bminority\b/i, /\bunderrepresented\b/i] },
  {
    id: 'low-income',
    patterns: [/\blow[- ]income\b/i, /\bfinancial need\b/i, /\bneed[- ]based\b/i]
  },
  {
    id: 'first-generation',
    patterns: [/\bfirst[- ]generation\b/i, /\bfirst gen\b/i]
  },
  {
    id: 'stem students',
    patterns: [/\bstem students?\b/i, /\bstem majors?\b/i]
  },
  {
    id: 'graduate students',
    patterns: [/\bgraduate students?\b/i, /\bmaster'?s students?\b/i]
  },
  {
    id: 'undergraduate students',
    patterns: [/\bundergraduate students?\b/i, /\bundergraduates?\b/i]
  },
  {
    id: 'phd',
    patterns: [/\bph\.?d\.?\b/i, /\bdoctoral\b/i, /\bdoctorate\b/i]
  }
];

const DEGREES: Labeled[] = [
  { id: 'undergraduate', patterns: [/\bundergraduate\b/i, /\bbachelor'?s\b/i] },
  { id: "master's", patterns: [/\bmaster'?s\b/i, /\bmba\b/i] },
  { id: 'PhD', patterns: [/\bph\.?d\.?\b/i, /\bdoctoral degree\b/i] },
  { id: 'graduate', patterns: [/\bgraduate school\b/i, /\bgrad school\b/i] }
];

const FIELDS: Labeled[] = [
  { id: 'STEM', patterns: [/\bstem\b/i] },
  { id: 'engineering', patterns: [/\bengineering\b/i] },
  { id: 'computer science', patterns: [/\bcomputer science\b/i, /\bcs majors?\b/i] },
  { id: 'business', patterns: [/\bbusiness\b/i, /\bmba\b/i] },
  { id: 'law', patterns: [/\blaw school\b/i, /\bpre[- ]law\b/i, /\blegal studies\b/i] },
  {
    id: 'medicine',
    patterns: [/\bmedicine\b/i, /\bmedical school\b/i, /\bpre[- ]med\b/i]
  },
  { id: 'nursing', patterns: [/\bnursing\b/i] },
  { id: 'education', patterns: [/\beducation majors?\b/i, /\bteachers?\b/i] }
];

const FUNDING: Labeled[] = [
  { id: 'fully funded', patterns: [/\bfully funded\b/i, /\bfull ride\b/i] },
  { id: 'need-based', patterns: [/\bneed[- ]based\b/i] },
  { id: 'merit-based', patterns: [/\bmerit[- ]based\b/i] }
];

function collectLabels(text: string, defs: Labeled[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { id, patterns } of defs) {
    if (seen.has(id)) continue;
    if (patterns.some((re) => re.test(text))) {
      out.push(id);
      seen.add(id);
    }
  }
  return out;
}

function extractKeywords(text: string, max = 24): string[] {
  const raw = text.toLowerCase().match(/\b[a-z][a-z'-]{2,}\b/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of raw) {
    if (STOP.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

export function extractArticleSignals(input: {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  bodyHtml: string;
}): ArticleSignals {
  const bodyPlain = htmlToPlainText(input.bodyHtml);
  const blob = [
    input.title,
    input.metaTitle ?? '',
    input.metaDescription ?? '',
    bodyPlain
  ]
    .join(' ')
    .trim();

  const lower = blob.toLowerCase();

  return {
    countries: collectLabels(lower, COUNTRIES),
    audiences: collectLabels(lower, AUDIENCES),
    degrees: collectLabels(lower, DEGREES),
    fields: collectLabels(lower, FIELDS),
    fundingTypes: collectLabels(lower, FUNDING),
    keywords: extractKeywords(lower)
  };
}
