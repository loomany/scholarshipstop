/**
 * SEO long-tail listing presets: /scholarships/[slug]
 * Slugs are reserved; same segment as scholarship detail (UUID always → detail).
 *
 * - LONG_TAIL_SLUGS — маршрутизация и пресеты ([[...slugPath]]/page, перелинковка).
 * - LONG_TAIL_SITEMAP_SLUGS — только sitemap; пустой массив → fallback на LONG_TAIL_SLUGS.
 */

import type { Scholarship } from './scholarshipsData';
import {
  daysUntilDeadline,
  defaultMoreFiltersFromBounds,
  matchesDeadlinePreset,
  type MoreFiltersState
} from './moreFilters';

export const LONG_TAIL_SLUGS = [
  'no-essay',
  'closing-soon',
  'undergraduate',
  'under-5000',
  'international-students',
  'high-school',
  'engineering',
  'computer-science',
  'under-10000',
  'nursing',
  'arts'
] as const;

export type LongTailSlug = (typeof LONG_TAIL_SLUGS)[number];

/**
 * Какие long-tail страницы попадают в sitemap.xml.
 * Оставьте пустым — в индекс пойдут все LONG_TAIL_SLUGS.
 */
export const LONG_TAIL_SITEMAP_SLUGS: readonly LongTailSlug[] = [
  'closing-soon',
  'engineering',
  'computer-science',
  'international-students'
];

/** Эффективный список URL для sitemap (и поле manifest is_in_sitemap). */
export function getLongTailSitemapSlugs(): readonly LongTailSlug[] {
  return LONG_TAIL_SITEMAP_SLUGS.length > 0
    ? LONG_TAIL_SITEMAP_SLUGS
    : LONG_TAIL_SLUGS;
}

/** Быстрая проверка по единому allowlist (middleware, клиент, тесты). */
export const LONG_TAIL_SLUG_SET: ReadonlySet<string> = new Set(LONG_TAIL_SLUGS);

/**
 * Нормализация сегмента URL /scholarships/...: trim, lower case, en/em/minus → ASCII hyphen.
 * Снимает рассинхрон, если в URL попали Unicode-дефисы (например из документа).
 */
export function normalizeScholarshipDynamicParam(raw: string): string {
  return raw
    .trim()
    .replace(/\u2013|\u2014|\u2212/g, '-')
    .toLowerCase();
}

export function isLongTailSlug(param: string): param is LongTailSlug {
  return LONG_TAIL_SLUG_SET.has(normalizeScholarshipDynamicParam(param));
}

/** Подписи для внутренней перелинковки long-tail страниц. */
export const LONG_TAIL_LINK_LABELS: Record<LongTailSlug, string> = {
  'no-essay': 'No essay scholarships',
  'closing-soon': 'Scholarships closing soon',
  undergraduate: 'Undergraduate scholarships',
  'under-5000': 'Scholarships under $5,000',
  'international-students': 'Scholarships for international students',
  'high-school': 'High school scholarships',
  engineering: 'Engineering scholarships',
  'computer-science': 'Computer science scholarships',
  'under-10000': 'Scholarships under $10,000',
  nursing: 'Nursing scholarships',
  arts: 'Arts scholarships'
};

export type LongTailPreset = {
  slug: LongTailSlug;
  h1: string;
  metaTitle: string;
  metaDescription: string;
};

function scholarshipTextBlob(s: Scholarship): string {
  return [
    s.title,
    s.description,
    s.summaryShort,
    s.whoCanApplyText,
    s.eligibilityText,
    ...(s.eligibility ?? []),
    ...(s.whoCanApply ?? []),
    s.institutionsText
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function studyLevelsUndergraduate(s: Scholarship): boolean {
  const levels = (s.studyLevels ?? []).map((x) => String(x).toLowerCase());
  if (levels.length === 0) return false;
  return levels.some(
    (l) =>
      l.includes('undergraduate') ||
      l.includes('undergrad') ||
      l.includes('bachelor') ||
      l.includes('associate') ||
      l === 'college' ||
      l.includes('college student')
  );
}

function closingSoonBaseFilter(s: Scholarship): boolean {
  if (daysUntilDeadline(s) === null) return false;
  return (
    matchesDeadlinePreset(s, 'lt1d') || matchesDeadlinePreset(s, 'd1_7')
  );
}

function internationalStudentRelevant(s: Scholarship): boolean {
  const cit = (s.citizenshipStatuses ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (
    /international|f-1|f1|foreign|non.u\.s|non-us|global student|visa holder|outside the u\.s/i.test(
      cit
    )
  ) {
    return true;
  }
  const b = scholarshipTextBlob(s);
  return /international student|f-1|f1 visa|foreign national|students outside|non-u\.s\. citizen|non us citizen|eligible.*international/i.test(
    b
  );
}

function highSchoolRelevant(s: Scholarship): boolean {
  const levels = (s.studyLevels ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (
    levels.length > 0 &&
    /high school|secondary school|grades?\s*9|grade\s*10|grade\s*11|grade\s*12|k-12|k12|pre-college|senior year/i.test(
      levels
    )
  ) {
    return true;
  }
  const b = scholarshipTextBlob(s);
  return /high school student|secondary school|grades 9-12|\bgrade 12\b/i.test(
    b
  );
}

function engineeringFieldRelevant(s: Scholarship): boolean {
  const fields = (s.fieldOfStudy ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (
    /engineering|mechanical|civil eng|electrical eng|chemical eng|aerospace/i.test(
      fields
    )
  ) {
    return true;
  }
  const b = scholarshipTextBlob(s);
  return /\bengineering\b|mechanical engineering|civil engineering|electrical engineering/i.test(
    b
  );
}

function computerScienceRelevant(s: Scholarship): boolean {
  const fields = (s.fieldOfStudy ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (
    /computer science|software eng|informatics|computing|information technology|\bcs\b|data science|cybersecurity/i.test(
      fields
    )
  ) {
    return true;
  }
  const b = scholarshipTextBlob(s);
  return /\bcomputer science\b|software development|\bprogramming\b|informatics|\bit degree\b/i.test(
    b
  );
}

function nursingFieldRelevant(s: Scholarship): boolean {
  const fields = (s.fieldOfStudy ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (
    /\bnursing\b|\brn\b|\bbsn\b|\bmsn\b|nurse practitioner|pre-nursing/i.test(fields)
  ) {
    return true;
  }
  const b = scholarshipTextBlob(s);
  return /\bnursing school\b|\bnursing student\b|\bregistered nurse\b/i.test(b);
}

function artsFieldRelevant(s: Scholarship): boolean {
  const fields = (s.fieldOfStudy ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (
    /\barts\b|fine arts|visual arts|performing arts|music education|theatre|theater|dance|creative writing|humanities art/i.test(
      fields
    )
  ) {
    return true;
  }
  const b = scholarshipTextBlob(s);
  return /\bart school\b|\barts major\b|\bfine arts\b/i.test(b);
}

/** Узкий base (Matches USA) до pipeline: deadline «скоро» задаётся здесь, не в MoreFilters. */
export function longTailBaseFilter(
  slug: LongTailSlug
): ((s: Scholarship) => boolean) | undefined {
  if (slug === 'undergraduate') return studyLevelsUndergraduate;
  if (slug === 'closing-soon') return closingSoonBaseFilter;
  if (slug === 'international-students') return internationalStudentRelevant;
  if (slug === 'high-school') return highSchoolRelevant;
  if (slug === 'engineering') return engineeringFieldRelevant;
  if (slug === 'computer-science') return computerScienceRelevant;
  if (slug === 'nursing') return nursingFieldRelevant;
  if (slug === 'arts') return artsFieldRelevant;
  return undefined;
}

type Bounds = {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
};

/**
 * Предустановка More filters поверх defaultMoreFiltersFromBounds(bounds).
 * closing-soon использует только baseFilter; здесь deadline остаётся any.
 */
export function buildLongTailMoreFiltersState(
  bounds: Bounds,
  slug: LongTailSlug
): MoreFiltersState {
  const d = defaultMoreFiltersFromBounds(bounds);
  switch (slug) {
    case 'no-essay':
      return {
        ...d,
        includeEasyApply: new Set<string>(['no_essay'])
      };
    case 'closing-soon':
    case 'undergraduate':
    case 'high-school':
    case 'engineering':
    case 'computer-science':
    case 'nursing':
    case 'arts':
      return d;
    case 'international-students':
      return {
        ...d,
        citizenshipAudience: 'international_friendly'
      };
    case 'under-5000':
      return {
        ...d,
        amountMin: bounds.amountMin,
        amountMax: Math.min(5000, bounds.amountMax)
      };
    case 'under-10000':
      return {
        ...d,
        amountMin: bounds.amountMin,
        amountMax: Math.min(10000, bounds.amountMax)
      };
    default:
      return d;
  }
}

const PRESET_COPY: Record<LongTailSlug, Omit<LongTailPreset, 'slug'>> = {
  'no-essay': {
    h1: 'No Essay Scholarships 2026',
    metaTitle: 'No Essay Scholarships 2026 | Apply Without an Essay',
    metaDescription:
      'Browse USA scholarships that do not require an essay. Search, sort by deadline or amount, and open official listings.'
  },
  'closing-soon': {
    h1: 'Scholarships Closing Soon 2026',
    metaTitle: 'Scholarships Closing Soon 2026 | Deadlines Within 7 Days',
    metaDescription:
      'Scholarships with deadlines in the next week or less. Confirm dates on each official program page before applying.'
  },
  undergraduate: {
    h1: 'Undergraduate Scholarships 2026',
    metaTitle: 'Undergraduate Scholarships 2026 | College & Bachelor Students',
    metaDescription:
      'Scholarships aimed at undergraduate and college students. Filter, search, and compare deadlines and award amounts.'
  },
  'under-5000': {
    h1: 'Scholarships Under $5,000 2026',
    metaTitle: 'Scholarships Under $5,000 2026 | Awards Up to Five Thousand',
    metaDescription:
      'USA scholarships with awards up to $5,000. Browse the catalog and verify amounts on official sites.'
  },
  'international-students': {
    h1: 'Scholarships for International Students 2026',
    metaTitle:
      'International Student Scholarships 2026 | Study in the USA',
    metaDescription:
      'Explore USA scholarship listings that mention international students or related eligibility in our catalog data.'
  },
  'high-school': {
    h1: 'High School Scholarships 2026',
    metaTitle: 'High School Scholarships 2026 | Grades 9–12 USA',
    metaDescription:
      'Find scholarships for high school and secondary students in the USA. Browse, filter, and apply through official links.'
  },
  engineering: {
    h1: 'Engineering Scholarships 2026',
    metaTitle: 'Engineering Scholarships 2026 | STEM Awards USA',
    metaDescription:
      'Discover engineering-focused scholarships in the USA for 2026. Explore deadlines, amounts, and official application pages.'
  },
  'computer-science': {
    h1: 'Computer Science Scholarships 2026',
    metaTitle: 'Computer Science Scholarships 2026 | CS & Software USA',
    metaDescription:
      'Browse computer science and software-related scholarships in the USA. Search the list and open each program’s official site.'
  },
  'under-10000': {
    h1: 'Scholarships Under $10,000 2026',
    metaTitle: 'Scholarships Under $10,000 2026 | Awards Up to Ten Thousand',
    metaDescription:
      'USA scholarships with awards up to $10,000 in our amount filter. Compare options and confirm details on official listings.'
  },
  nursing: {
    h1: 'Nursing Scholarships 2026',
    metaTitle: 'Nursing Scholarships 2026 | RN, BSN & Pre-Nursing USA',
    metaDescription:
      'Browse nursing and health-care focused scholarships in the USA. Compare deadlines, award amounts, and requirements.'
  },
  arts: {
    h1: 'Arts Scholarships 2026',
    metaTitle: 'Arts Scholarships 2026 | Fine Arts, Music & Creative Fields',
    metaDescription:
      'Find arts, fine arts, and creative-field scholarships in the USA. Filter by deadline and amount, then verify on official sites.'
  }
};

export function getLongTailPreset(param: string): LongTailPreset | null {
  const k = normalizeScholarshipDynamicParam(param);
  if (!LONG_TAIL_SLUG_SET.has(k)) return null;
  const slug = k as LongTailSlug;
  const copy = PRESET_COPY[slug];
  return { slug, ...copy };
}

export function isScholarshipDetailUuidParam(param: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    param.trim()
  );
}
