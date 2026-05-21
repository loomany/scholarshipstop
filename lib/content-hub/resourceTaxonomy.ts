import resourceArticleClassification from '@/data/resource-article-classification.json';
import {
  aiResourcePackSubcategoryId,
  isAiResourcePackSlug
} from '@/lib/content-hub/aiResourcePackSlugs';

/** Matches list fields used on `/resources` (avoid importing `server-only` module here). */
export type ResourcePostListFields = {
  slug: string | null;
  title: string | null;
  meta_description: string | null;
};

export type ResourceCategoryId =
  | 'finding-scholarships'
  | 'applications'
  | 'eligibility'
  | 'international-students'
  | 'deadlines-planning'
  | 'essays-writing'
  | 'financial-aid-funding'
  | 'student-types'
  | 'strategy-tips'
  | 'scams-safety'
  | 'success-stories'
  | 'ai';

export type ResourceSubcategory = {
  id: string;
  categoryId: ResourceCategoryId;
  label: string;
};

export type ResourceCategory = {
  id: ResourceCategoryId;
  label: string;
  subcategories: Omit<ResourceSubcategory, 'categoryId'>[];
};

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'finding-scholarships',
    label: 'Finding Scholarships',
    subcategories: [
      { id: 'scholarship-search-basics', label: 'Scholarship search basics' },
      {
        id: 'how-to-find-local-scholarships',
        label: 'How to find local scholarships'
      },
      { id: 'scholarships-by-major', label: 'Scholarships by major' },
      { id: 'scholarships-by-state', label: 'Scholarships by state' },
      {
        id: 'scholarships-by-student-type',
        label: 'Scholarships by student type'
      },
      {
        id: 'scholarships-for-international-students',
        label: 'Scholarships for international students'
      }
    ]
  },
  {
    id: 'applications',
    label: 'Applications',
    subcategories: [
      { id: 'how-to-apply', label: 'How to apply' },
      { id: 'application-checklists', label: 'Application checklists' },
      {
        id: 'common-application-mistakes',
        label: 'Common application mistakes'
      },
      {
        id: 'essays-and-personal-statements',
        label: 'Essays and personal statements'
      },
      { id: 'recommendation-letters', label: 'Recommendation letters' },
      {
        id: 'resume-and-supporting-documents',
        label: 'Resume and supporting documents'
      }
    ]
  },
  {
    id: 'eligibility',
    label: 'Eligibility',
    subcategories: [
      { id: 'gpa-requirements', label: 'GPA requirements' },
      {
        id: 'need-based-vs-merit-based',
        label: 'Need-based vs merit-based'
      },
      {
        id: 'citizenship-and-residency',
        label: 'Citizenship and residency'
      },
      {
        id: 'state-specific-eligibility',
        label: 'State-specific eligibility'
      },
      {
        id: 'major-specific-eligibility',
        label: 'Major-specific eligibility'
      },
      {
        id: 'demographic-eligibility',
        label: 'Demographic eligibility'
      }
    ]
  },
  {
    id: 'international-students',
    label: 'International Students',
    subcategories: [
      {
        id: 'scholarships-for-international-students',
        label: 'Scholarships for international students'
      },
      {
        id: 'f1-visa-and-non-us-citizen-eligibility',
        label: 'F1 visa and non-US citizen eligibility'
      },
      {
        id: 'country-specific-opportunities',
        label: 'Country-specific opportunities'
      },
      {
        id: 'international-application-documents',
        label: 'International application documents'
      }
    ]
  },
  {
    id: 'deadlines-planning',
    label: 'Deadlines & Planning',
    subcategories: [
      { id: 'scholarship-timelines', label: 'Scholarship timelines' },
      { id: 'deadline-planning', label: 'Deadline planning' },
      { id: 'staying-organized', label: 'Staying organized' },
      { id: 'tracking-applications', label: 'Tracking applications' },
      { id: 'when-to-apply', label: 'When to apply' },
      { id: 'last-minute-scholarships', label: 'Last-minute scholarships' }
    ]
  },
  {
    id: 'essays-writing',
    label: 'Essays & Writing',
    subcategories: [
      { id: 'essay-brainstorming', label: 'Essay brainstorming' },
      { id: 'essay-structure', label: 'Essay structure' },
      { id: 'editing-and-proofreading', label: 'Editing and proofreading' },
      { id: 'personal-statement-tips', label: 'Personal statement tips' },
      {
        id: 'writing-strong-responses',
        label: 'Writing strong responses'
      },
      { id: 'avoiding-cliche-answers', label: 'Avoiding cliché answers' }
    ]
  },
  {
    id: 'financial-aid-funding',
    label: 'Financial Aid & Funding',
    subcategories: [
      { id: 'scholarships-vs-grants', label: 'Scholarships vs grants' },
      { id: 'fafsa-and-aid-basics', label: 'FAFSA and aid basics' },
      { id: 'need-based-funding', label: 'Need-based funding' },
      { id: 'merit-funding', label: 'Merit funding' },
      { id: 'stacking-scholarships', label: 'Stacking scholarships' },
      {
        id: 'understanding-award-amounts',
        label: 'Understanding award amounts'
      }
    ]
  },
  {
    id: 'student-types',
    label: 'Student Types',
    subcategories: [
      { id: 'high-school-students', label: 'High school students' },
      { id: 'college-students', label: 'College students' },
      { id: 'graduate-students', label: 'Graduate students' },
      { id: 'transfer-students', label: 'Transfer students' },
      {
        id: 'community-college-students',
        label: 'Community college students'
      },
      { id: 'international-students', label: 'International students' }
    ]
  },
  {
    id: 'strategy-tips',
    label: 'Strategy & Tips',
    subcategories: [
      {
        id: 'how-to-improve-your-chances',
        label: 'How to improve your chances'
      },
      {
        id: 'building-a-scholarship-strategy',
        label: 'Building a scholarship strategy'
      },
      { id: 'time-saving-tips', label: 'Time-saving tips' },
      {
        id: 'avoiding-low-fit-applications',
        label: 'Avoiding low-fit applications'
      },
      { id: 'choosing-where-to-apply', label: 'Choosing where to apply' },
      {
        id: 'scholarship-search-mistakes',
        label: 'Scholarship search mistakes'
      }
    ]
  },
  {
    id: 'scams-safety',
    label: 'Scams & Safety',
    subcategories: [
      {
        id: 'scholarship-scam-warning-signs',
        label: 'Scholarship scam warning signs'
      },
      {
        id: 'safe-application-practices',
        label: 'Safe application practices'
      },
      { id: 'avoiding-fake-offers', label: 'Avoiding fake offers' },
      {
        id: 'protecting-personal-information',
        label: 'Protecting personal information'
      }
    ]
  },
  {
    id: 'success-stories',
    label: 'Success Stories / Examples',
    subcategories: [
      { id: 'real-scholarship-examples', label: 'Real scholarship examples' },
      {
        id: 'strong-application-examples',
        label: 'Strong application examples'
      },
      { id: 'essay-examples', label: 'Essay examples' },
      {
        id: 'what-successful-applicants-do',
        label: 'What successful applicants do'
      }
    ]
  },
  {
    id: 'ai',
    label: 'AI',
    subcategories: [
      {
        id: 'ai-scholarship-discovery',
        label: 'AI & scholarship discovery'
      },
      {
        id: 'scholarship-platform-comparisons',
        label: 'Scholarship platform comparisons'
      },
      {
        id: 'scholarship-search-safety',
        label: 'Trust, safety & search checklists'
      }
    ]
  }
];

export const RESOURCE_CATEGORY_ORDER: ResourceCategoryId[] =
  RESOURCE_CATEGORIES.map((c) => c.id);

const RESOURCE_CATEGORY_LABELS: Record<ResourceCategoryId, string> =
  RESOURCE_CATEGORIES.reduce(
    (acc, c) => {
      acc[c.id] = c.label;
      return acc;
    },
    {} as Record<ResourceCategoryId, string>
  );

const SUB_BY_ID = new Map<string, ResourceSubcategory>();
for (const c of RESOURCE_CATEGORIES) {
  for (const s of c.subcategories) {
    SUB_BY_ID.set(s.id, { ...s, categoryId: c.id });
  }
}

const SLUG_OVERRIDES = resourceArticleClassification as Record<
  string,
  { categoryId: string; subcategoryId: string }
>;

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(s: string): Set<string> {
  const n = normalizeForMatch(s);
  const parts = n.split(/\s+/).filter((w) => w.length > 2);
  return new Set(parts);
}

const SUB_KEYWORD_ROWS: { subId: string; tokens: Set<string> }[] = [];

function addKeywordRow(subId: string, extra: string[] = []) {
  const sub = SUB_BY_ID.get(subId);
  if (!sub) return;
  const tokens = tokenize(sub.label);
  for (const e of extra) {
    for (const t of tokenize(e)) {
      tokens.add(t);
    }
  }
  SUB_KEYWORD_ROWS.push({ subId, tokens });
}

for (const c of RESOURCE_CATEGORIES) {
  for (const s of c.subcategories) {
    addKeywordRow(s.id, [c.label, s.label]);
  }
}

/** Extra hints so common slugs/titles match without JSON overrides. */
const SLUG_HINTS: { test: RegExp; subId: string }[] = [
  { test: /deadline|timeline|due date/i, subId: 'scholarship-timelines' },
  { test: /apply|application|how to apply/i, subId: 'how-to-apply' },
  {
    test: /combine|stack|multiple scholarship/i,
    subId: 'stacking-scholarships'
  },
  { test: /essay|personal statement|writing/i, subId: 'essay-structure' },
  { test: /fafsa|financial aid|grant/i, subId: 'fafsa-and-aid-basics' },
  { test: /scam|fraud|fake scholarship/i, subId: 'scholarship-scam-warning-signs' },
  { test: /gpa/i, subId: 'gpa-requirements' },
  {
    test: /\b(chatgpt|gpt|ai tools?|ai scholarship|using-ai|verify-ai|ai-generated)\b/i,
    subId: 'ai-scholarship-discovery'
  },
  {
    test: /international|f1|visa|non[-\s]?us citizen|overseas/i,
    subId: 'scholarships-for-international-students'
  },
  {
    test: /scholarshiptop vs|vs fastweb|vs scholarships\.com|compare scholarship (websites|platforms)/i,
    subId: 'scholarship-platform-comparisons'
  },
  {
    test: /red flags|fake scholarship|trustworthy|legit scholarship|search checklist/i,
    subId: 'scholarship-search-safety'
  },
  {
    test: /best scholarship (websites|platforms|sites|search engines|resources)/i,
    subId: 'ai-scholarship-discovery'
  }
];

export type ResourceArticleClassification = {
  categoryId: ResourceCategoryId;
  subcategoryId: string;
};

export function isResourceCategoryId(
  id: string | null | undefined
): id is ResourceCategoryId {
  return !!id && RESOURCE_CATEGORY_ORDER.includes(id as ResourceCategoryId);
}

export function getResourceCategory(
  id: ResourceCategoryId
): ResourceCategory | undefined {
  return RESOURCE_CATEGORIES.find((c) => c.id === id);
}

export function classifyResourceArticle(
  post: ResourcePostListFields
): ResourceArticleClassification | null {
  const slug = post.slug?.trim() ?? '';
  if (!slug) return null;

  if (isAiResourcePackSlug(slug)) {
    return {
      categoryId: 'ai',
      subcategoryId: aiResourcePackSubcategoryId(slug)
    };
  }

  const ov = SLUG_OVERRIDES[slug];
  if (ov && isResourceCategoryId(ov.categoryId)) {
    const sub = SUB_BY_ID.get(ov.subcategoryId);
    if (sub && sub.categoryId === ov.categoryId) {
      return { categoryId: ov.categoryId, subcategoryId: ov.subcategoryId };
    }
  }

  const bundle = `${slug} ${post.title ?? ''} ${post.meta_description ?? ''}`;
  for (const { test, subId } of SLUG_HINTS) {
    if (test.test(bundle)) {
      const sub = SUB_BY_ID.get(subId);
      if (sub) {
        return { categoryId: sub.categoryId, subcategoryId: sub.id };
      }
    }
  }

  const hayTokens = tokenize(bundle);
  const hay = normalizeForMatch(bundle);
  if (hay.length === 0) return null;

  let best: { subId: string; score: number } | null = null;
  for (const row of SUB_KEYWORD_ROWS) {
    let score = 0;
    for (const t of row.tokens) {
      if (hayTokens.has(t)) score += 2;
      else if (t.length >= 4 && hay.includes(t)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { subId: row.subId, score };
    }
  }

  if (!best || best.score < 2) return null;
  const sub = SUB_BY_ID.get(best.subId);
  if (!sub) return null;
  return { categoryId: sub.categoryId, subcategoryId: sub.id };
}

export function resourceCategoryLabel(id: ResourceCategoryId): string {
  return RESOURCE_CATEGORY_LABELS[id] ?? id;
}

export function resourceSubcategoryLabel(
  categoryId: ResourceCategoryId,
  subcategoryId: string
): string | undefined {
  const c = getResourceCategory(categoryId);
  return c?.subcategories.find((s) => s.id === subcategoryId)?.label;
}

export function parseResourceSubIdsParam(
  raw: string | null | undefined,
  categoryId: ResourceCategoryId | null
): Set<string> {
  const out = new Set<string>();
  if (!categoryId || !raw?.trim()) return out;
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id) continue;
    const sub = SUB_BY_ID.get(id);
    if (sub?.categoryId === categoryId) out.add(id);
  }
  return out;
}

export function postMatchesResourceQuery(
  post: ResourcePostListFields,
  q: string,
  classification: ResourceArticleClassification | null
): boolean {
  const needle = normalizeForMatch(q);
  if (!needle) return true;

  const slug = post.slug?.trim() ?? '';
  const title = post.title?.trim() ?? '';
  const desc = post.meta_description?.trim() ?? '';
  const blob = normalizeForMatch(`${slug} ${title} ${desc}`);
  if (blob.includes(needle)) return true;

  if (classification) {
    const catLabel = normalizeForMatch(
      resourceCategoryLabel(classification.categoryId)
    );
    const subLabel = normalizeForMatch(
      resourceSubcategoryLabel(
        classification.categoryId,
        classification.subcategoryId
      ) ?? ''
    );
    if (catLabel.includes(needle) || subLabel.includes(needle)) return true;
    if (needle.length >= 3) {
      if (
        classification.categoryId.includes(needle) ||
        classification.subcategoryId.includes(needle)
      ) {
        return true;
      }
    }
  }

  return false;
}
