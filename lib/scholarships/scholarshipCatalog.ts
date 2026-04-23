import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  normalizeCategoryId,
  SCHOLARSHIP_CATEGORY_LABELS
} from '@/app/scholarships/scholarshipCategories';
import type { Json } from '@/types_db';
import type {
  ScholarshipCatalogView,
  ScholarshipDbCatalogFields
} from '@/lib/scholarships/scholarshipCatalogTypes';
import { hasExplicitNoEssaySignal } from '@/lib/scholarships/noEssay';

export type { ScholarshipCatalogView, ScholarshipDbCatalogFields };

/** Normalized requirement slugs for exclude filter (no special_eligibility; goal → personal_statement). */
export const REQUIREMENT_FILTER_IDS = [
  'essay',
  'document',
  'photo',
  'video',
  'personal_statement',
  'link',
  'survey',
  'question',
  'recommendation',
  'transcript',
  'resume'
] as const;

export type RequirementFilterId = (typeof REQUIREMENT_FILTER_IDS)[number];

export const ELIGIBILITY_OPTIONS = [
  { id: 'women', label: 'Women' },
  { id: 'international_students', label: 'International Students' },
  { id: 'minority', label: 'Minority' },
  { id: 'hispanic', label: 'Hispanic' },
  { id: 'african_american', label: 'African American' },
  { id: 'first_generation', label: 'First-Generation' },
  { id: 'disability', label: 'Disability' },
  { id: 'veterans', label: 'Veterans' },
  { id: 'lgbtq', label: 'LGBTQ+' },
  { id: 'single_parent', label: 'Single Parent' },
  { id: 'foster_youth', label: 'Foster Youth' },
  { id: 'native_american', label: 'Native American' },
  { id: 'low_income', label: 'Low Income' },
  { id: 'financial_need', label: 'Financial Need' }
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  { id: 'high_school', label: 'High School' },
  { id: 'high_school_senior', label: 'High School Senior' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'graduate', label: 'Graduate' },
  { id: 'phd', label: 'PhD' },
  { id: 'community_college', label: 'Community College' },
  { id: 'trade_school', label: 'Trade School' }
] as const;

export const GPA_BUCKET_OPTIONS = [
  { id: 'no_gpa_requirement', label: 'No GPA Requirement' },
  { id: 'gpa_2_0_plus', label: 'GPA 2.0+' },
  { id: 'gpa_2_5_plus', label: 'GPA 2.5+' },
  { id: 'gpa_3_0_plus', label: 'GPA 3.0+' },
  { id: 'gpa_3_5_plus', label: 'GPA 3.5+' }
] as const;

export const EASY_APPLY_OPTIONS = [
  { id: 'no_essay', label: 'No Essay' },
  { id: 'easy_apply', label: 'Easy Apply' },
  { id: 'quick_apply', label: 'Quick Apply' },
  { id: 'few_requirements', label: 'Few Requirements' }
] as const;

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
};

export const NATIONWIDE_LOCATION = 'Nationwide';

/**
 * Map catalog sidebar location labels (e.g. "California") to `scholarships.state_codes`
 * postal codes. Used when SQL should narrow by structured state, not `location_tags`.
 */
export function catalogLocationLabelsToStateCodes(
  labels: ReadonlySet<string>
): string[] {
  if (labels.size === 0) return [];
  const nameToCode = new Map<string, string>();
  for (const [code, name] of Object.entries(US_STATE_NAMES)) {
    nameToCode.set(name, code);
  }
  const out: string[] = [];
  for (const lab of Array.from(labels)) {
    if (lab === NATIONWIDE_LOCATION) continue;
    const c = nameToCode.get(lab);
    if (c) out.push(c);
  }
  return Array.from(new Set(out));
}

function jsonToStrArr(v: Json | null | undefined): string[] {
  if (!v || !Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function uniq<T>(a: T[]): T[] {
  return Array.from(new Set(a));
}

function textBlob(s: Scholarship): string {
  return [
    s.title,
    s.description,
    s.summaryShort,
    s.summaryLong,
    s.eligibilityText,
    s.whoCanApplyText,
    ...(s.eligibility ?? []),
    s.requirementsTextClean,
    s.paymentDetails,
    s.winnerPayment,
    s.stateTerritoryText,
    ...(s.aiEligibilitySummary ?? []),
    ...(s.aiBestFor ?? []),
    ...(s.fieldOfStudy ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const ELIGIBILITY_RULES: { id: string; re: RegExp }[] = [
  { id: 'women', re: /\b(women|female|woman)\b|\bladies\b/i },
  {
    id: 'international_students',
    re: /\binternational\s+students?\b|\bforeign\s+students?\b|\bforeign\s+nationals?\b|\bnon[-\s]?u\.?s\.?\s+citizens?\b/i
  },
  { id: 'minority', re: /\bminorit(y|ies)\b|\bunderrepresented\b/i },
  { id: 'hispanic', re: /\bhispanic\b|\blatin[oa]\b|\bchican[oa]\b/i },
  {
    id: 'african_american',
    re: /\bafrican\s+american\b|\bblack\s+students?\b|\bnaacp\b/i
  },
  {
    id: 'first_generation',
    re: /\bfirst[-\s]?generation\b|\bfirst\s+gen\b|\bfirst\s+in\s+family\b/i
  },
  { id: 'disability', re: /\bdisabilit(y|ies)\b|\bdisabled\b|\bada\b/i },
  { id: 'veterans', re: /\bveterans?\b|\bmilitary\b|\bgi\s+bill\b/i },
  { id: 'lgbtq', re: /\blgbtq?\+?\b|\blesbian\b|\bgay\b|\btransgender\b/i },
  { id: 'single_parent', re: /\bsingle\s+parent\b/i },
  { id: 'foster_youth', re: /\bfoster\s+(youth|care)\b/i },
  {
    id: 'native_american',
    re: /\bnative\s+american\b|\bamerican\s+indian\b|\btribal\b|\balaska\s+native\b/i
  },
  { id: 'low_income', re: /\blow\s+income\b|\beconomically\s+disadvantaged\b/i },
  { id: 'financial_need', re: /\bfinancial\s+need\b|\bneed[-\s]?based\b/i }
];

const EDUCATION_FROM_STUDY_LEVEL: Record<string, string> = {
  'high school': 'high_school',
  'high school senior': 'high_school_senior',
  undergraduate: 'undergraduate',
  'college student': 'undergraduate',
  graduate: 'graduate',
  masters: 'graduate',
  'master\'s': 'graduate',
  phd: 'phd',
  doctorate: 'phd',
  'community college': 'community_college',
  'trade school': 'trade_school',
  vocational: 'trade_school'
};

function deriveEligibilityIds(blob: string, seed: string[]): string[] {
  const out = new Set(seed);
  for (const { id, re } of ELIGIBILITY_RULES) {
    if (re.test(blob)) out.add(id);
  }
  return [...out];
}

function deriveEducationIds(
  studyLevels: string[] | undefined,
  blob: string,
  seed: string[]
): string[] {
  const out = new Set(seed);
  for (const sl of studyLevels ?? []) {
    const k = sl.trim().toLowerCase();
    const id = EDUCATION_FROM_STUDY_LEVEL[k];
    if (id) out.add(id);
    if (k.includes('high school')) {
      if (k.includes('senior')) out.add('high_school_senior');
      else out.add('high_school');
    }
    if (k.includes('undergrad') || k.includes('bachelor')) out.add('undergraduate');
    if (k.includes('graduate') || k.includes('master')) out.add('graduate');
    if (k.includes('phd') || k.includes('doctoral')) out.add('phd');
    if (k.includes('community college')) out.add('community_college');
    if (k.includes('trade') || k.includes('vocational')) out.add('trade_school');
  }
  if (/\bhigh\s+school\s+senior\b/i.test(blob)) out.add('high_school_senior');
  if (/\bhigh\s+school\b/i.test(blob)) out.add('high_school');
  if (/\bundergraduate\b|\bcollege\s+student\b/i.test(blob)) out.add('undergraduate');
  if (/\bgraduate\s+student\b|\bmasters\b/i.test(blob)) out.add('graduate');
  if (/\bphd\b|\bdoctoral\b/i.test(blob)) out.add('phd');
  return [...out];
}

function parseGpaFromBlob(blob: string): number | null {
  const m = blob.match(/\bgpa\b[^0-9]{0,12}([23](?:\.\d)?)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

function gpaMinToBucketId(min: number | null): string | null {
  if (min == null || Number.isNaN(min)) return 'no_gpa_requirement';
  if (min >= 3.5) return 'gpa_3_5_plus';
  if (min >= 3.0) return 'gpa_3_0_plus';
  if (min >= 2.5) return 'gpa_2_5_plus';
  if (min >= 2.0) return 'gpa_2_0_plus';
  return 'no_gpa_requirement';
}

function deriveGpa(
  s: Scholarship,
  blob: string,
  seedMin: number | null,
  seedBucket: string | null
): { min: number | null; bucketId: string | null } {
  let min = seedMin;
  if (min == null) min = parseGpaFromBlob(blob);
  let bucketId = seedBucket;
  if (!bucketId) bucketId = gpaMinToBucketId(min);
  if (!s.essayRequired && !blob.includes('essay') && min == null) {
    /* keep bucket; no essay does not imply GPA */
  }
  return { min, bucketId };
}

function deriveEasyApply(s: Scholarship, blob: string, seed: string[]): string[] {
  const out = new Set(seed.filter((id) => id !== 'no_essay'));
  const reqN =
    s.requirementSignalsCount ??
    (s.requirementsCount != null ? s.requirementsCount : (s.eligibility?.length ?? 0));
  if (hasExplicitNoEssaySignal(blob)) out.add('no_essay');
  if (/\beasy\s+apply\b|\bquick\s+apply\b|\bsimple\s+application\b/i.test(blob)) {
    out.add('easy_apply');
    out.add('quick_apply');
  }
  if (typeof reqN === 'number' && reqN <= 2) out.add('few_requirements');
  return [...out];
}

function stateCodesToLabels(codes: string[] | undefined): string[] {
  if (!codes?.length) return [];
  const labels: string[] = [];
  for (const c of codes) {
    const u = c.trim().toUpperCase();
    const name = US_STATE_NAMES[u];
    if (name) labels.push(name);
  }
  return uniq(labels);
}

function deriveLocationLabels(
  s: Scholarship,
  blob: string,
  seed: string[]
): string[] {
  const out = new Set(seed.map((x) => x.trim()).filter(Boolean));
  for (const [code, name] of Object.entries(US_STATE_NAMES)) {
    const re = new RegExp(`\\b${name}\\b`, 'i');
    if (re.test(blob)) out.add(name);
    if (new RegExp(`\\b${code}\\b`).test(blob)) out.add(name);
  }
  for (const x of stateCodesToLabels(s.stateCodes)) out.add(x);
  const scope = s.locationScope?.toLowerCase() ?? '';
  if (scope.includes('national') || /\bnationwide\b|\bunited\s+states\b|\bany\s+state\b/i.test(blob)) {
    out.add(NATIONWIDE_LOCATION);
  }
  if (s.stateTerritoryText?.trim()) {
    const t = s.stateTerritoryText.trim();
    if (!Array.from(out).some((l) => t.includes(l))) {
      for (const name of Object.values(US_STATE_NAMES)) {
        if (t.includes(name)) out.add(name);
      }
    }
  }
  return Array.from(out);
}

function scoreCompleteness(s: Scholarship): { score: number; bucket: 'basic' | 'standard' | 'detailed' } {
  let score = 0;
  if (s.deadlineAt || (s.deadline && s.deadline.trim())) score += 20;
  if (s.applyLink?.trim()) score += 20;
  const reqLen = (s.requirementsTextClean ?? s.description ?? '').length;
  if (reqLen > 50) score += 15;
  if ((s.description ?? '').length > 100) score += 15;
  if (s.provider?.trim()) score += 10;
  if ((s.eligibility?.length ?? 0) > 0 || (s.eligibilityText?.trim() ?? '').length > 40) {
    score += 10;
  }
  if (s.summaryShort?.trim()) score += 5;
  if (s.amount || s.awardAmount) score += 5;
  score = Math.min(100, score);
  const bucket =
    score >= 70 ? 'detailed' : score >= 40 ? 'standard' : 'basic';
  return { score, bucket };
}

function inferTopicCategorySlugs(s: Scholarship): string[] {
  const blob = textBlob(s);
  const out: string[] = [];
  if (/\bmedicine\b|\bmedical\b|\bnursing\b|\bhealthcare\b|\bpre[-\s]?med\b/i.test(blob)) {
    out.push('medical');
  }
  if (/\bbiolog(y|ist)\b|\bgenetics\b/i.test(blob)) out.push('biology');
  if (
    /\bengineering\b|\bcomputer\s+science\b|\bsoftware\b|\bSTEM\b|\bmath\b|\bphysics\b|\bchemistry\b/i.test(
      blob
    ) &&
    !/\bmedic|\bmedical\b|\bnursing\b|\bhealthcare\b|\bpre[-\s]?med\b/i.test(blob)
  ) {
    out.push('stem');
  }
  if (/\blaw\b|\bjd\b|\blegal\b/i.test(blob)) out.push('law');
  if (/\bmusic\b|\bperforming\s+arts\b/i.test(blob)) out.push('music');
  if (/\bart\b|\bfine\s+arts\b|\bdesign\b/i.test(blob)) out.push('arts');
  if (/\beducation\b|\bteacher\b|\bteaching\b/i.test(blob)) out.push('education');
  if (/\bhumanities\b|\bhistory\b|\bliterature\b|\bphilosophy\b/i.test(blob)) {
    out.push('humanities');
  }
  if (/\bcommunity\s+service\b|\bvolunteer\b/i.test(blob)) out.push('community');
  return uniq(out);
}

/** Widen categories when the only signal is miscellaneous but text suggests a topic. */
export function mergeCategoriesWithInference(
  baseSlugs: string[] | undefined,
  s: Scholarship
): string[] {
  const fromBase = (baseSlugs ?? [])
    .map((x) => normalizeCategoryId(x))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const uniqBase = uniq(fromBase);
  const onlyMisc =
    uniqBase.length === 0 ||
    (uniqBase.length === 1 && uniqBase[0] === 'miscellaneous');
  if (!onlyMisc) {
    return uniqBase.map(String);
  }
  const inferred = inferTopicCategorySlugs(s);
  if (inferred.length === 0) {
    return uniqBase.length ? uniqBase.map(String) : ['miscellaneous'];
  }
  return uniq([...inferred, ...uniqBase.filter((id) => id !== 'miscellaneous')]);
}

export function normalizeRequirementTypesForFilter(raw: string[]): string[] {
  const out = new Set<string>();
  for (const t of raw) {
    const k = t.trim().toLowerCase().replace(/\s+/g, '_');
    if (k === 'special_eligibility') continue;
    if (k === 'goal' || k === 'goal_required' || k === 'career_goal') {
      out.add('personal_statement');
      continue;
    }
    let id = k;
    if (id === 'personal' || id === 'statement_of_purpose') id = 'personal_statement';
    if (REQUIREMENT_FILTER_IDS.includes(id as RequirementFilterId)) out.add(id);
  }
  return [...out];
}

function requirementTypesFromFlags(s: Scholarship): string[] {
  const t: string[] = [];
  if (s.essayRequired) t.push('essay');
  if (s.documentRequired) t.push('document');
  if (s.photoRequired) t.push('photo');
  if (s.videoRequired) t.push('video');
  if (s.goalRequired) t.push('personal_statement');
  if (s.linkRequired) t.push('link');
  if (s.surveyRequired) t.push('survey');
  if (s.questionRequired) t.push('question');
  if (s.transcriptRequired) t.push('transcript');
  if (s.recommendationRequired) t.push('recommendation');
  const blob = textBlob(s);
  if (/\bresume\b|\bcurriculum\s+vitae\b|\bcv\b/i.test(blob)) t.push('resume');
  return t;
}

export function mergeRequirementTypesNormalized(
  fromJson: string[],
  s: Scholarship
): string[] {
  const fromFlags = requirementTypesFromFlags(s);
  const cleaned = normalizeRequirementTypesForFilter(fromJson);
  const merged = uniq([...cleaned, ...fromFlags]);
  return merged.filter((id) => id !== 'special_eligibility');
}

/**
 * Collect unique location labels from a list (for filter dropdown). Excludes unknown free text.
 */
export function collectLocationOptionsFromScholarships(
  list: Scholarship[]
): string[] {
  const set = new Set<string>();
  for (const s of list) {
    const c = s.scholarshipCatalog?.locationLabels ?? [];
    for (const x of c) {
      if (x && x !== NATIONWIDE_LOCATION) set.add(x);
    }
  }
  const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
  if (list.some((s) => s.scholarshipCatalog?.locationLabels?.includes(NATIONWIDE_LOCATION))) {
    return [NATIONWIDE_LOCATION, ...arr.filter((x) => x !== NATIONWIDE_LOCATION)];
  }
  return arr;
}

function normalizeSeedIds(raw: string[]): string[] {
  return raw
    .map((x) => x.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

export function buildScholarshipCatalog(
  s: Scholarship,
  db?: ScholarshipDbCatalogFields | null
): ScholarshipCatalogView {
  const blob = textBlob(s);

  const eligibilitySeed = normalizeSeedIds(jsonToStrArr(db?.eligibility_tags ?? null));

  const educationSeed = normalizeSeedIds(
    jsonToStrArr(db?.catalog_education_levels ?? null)
  );

  const easySeed = normalizeSeedIds(jsonToStrArr(db?.easy_apply_flags ?? null));

  const locSeed = jsonToStrArr(db?.location_tags ?? null);

  const rowGpaMin = db?.gpa_requirement_min ?? null;
  const rowGpaBucket = db?.gpa_bucket?.trim() ?? null;

  let gpaMin = rowGpaMin;
  let gpaBucketId = rowGpaBucket;
  const gpaDerived = deriveGpa(s, blob, gpaMin, gpaBucketId);
  gpaMin = gpaDerived.min;
  gpaBucketId = gpaDerived.bucketId;

  const eligibilityIds = deriveEligibilityIds(blob, eligibilitySeed);
  const educationIds = deriveEducationIds(s.studyLevels, blob, educationSeed);
  const easyApplyIds = deriveEasyApply(s, blob, easySeed);
  const locationLabels = deriveLocationLabels(s, blob, locSeed);

  const rowScore = db?.listing_completeness_score;
  const rowBucket = db?.listing_completeness_bucket?.trim().toLowerCase();

  let completenessScore: number | null =
    rowScore != null && !Number.isNaN(Number(rowScore)) ? Math.round(Number(rowScore)) : null;
  let completenessBucket: 'basic' | 'standard' | 'detailed' | null =
    rowBucket === 'basic' || rowBucket === 'standard' || rowBucket === 'detailed'
      ? rowBucket
      : null;

  if (completenessScore == null || completenessBucket == null) {
    const sc = scoreCompleteness(s);
    if (completenessScore == null) completenessScore = sc.score;
    if (completenessBucket == null) completenessBucket = sc.bucket;
  }

  const categorySlugs = mergeCategoriesWithInference(s.categories, s);

  const reqNorm = mergeRequirementTypesNormalized(s.requirementTypes ?? [], s);

  return {
    seoTags: db?.seo_tags ?? s.seoTags ?? undefined,
    eligibilityIds: uniq(eligibilityIds),
    educationIds: uniq(educationIds),
    gpaBucketId,
    gpaMin,
    easyApplyIds: uniq(easyApplyIds),
    locationLabels: uniq(locationLabels),
    completenessScore,
    completenessBucket,
    categorySlugs,
    requirementTypesNormalized: reqNorm
  };
}

export function getScholarshipCatalog(s: Scholarship): ScholarshipCatalogView {
  if (s.scholarshipCatalog) return s.scholarshipCatalog;
  return buildScholarshipCatalog(s, null);
}

/** Labels for GPA bucket chips / filters. */
export function gpaBucketLabel(id: string | null): string | null {
  if (!id) return null;
  const o = GPA_BUCKET_OPTIONS.find((x) => x.id === id);
  return o?.label ?? null;
}

export function payoutMethodChipLabel(method: string | null | undefined): string | null {
  if (!method) return null;
  const m = method.toLowerCase();
  if (m === 'college') return 'Paid to school';
  if (m === 'student') return 'Direct to student';
  if (m === 'non_monetary') return 'Non-monetary';
  if (m === 'not_stated') return null;
  return null;
}

export type CardChip = { key: string; label: string };

/**
 * All catalog chips in priority order. Pass `maxVisible` to cap count + overflow (legacy).
 * Default: return every chip; UI (e.g. ScholarshipCatalogChipRow) trims to one row by width.
 */
export function scholarshipCardChips(
  s: Scholarship,
  maxVisible?: number
): {
  visible: CardChip[];
  overflow: number;
} {
  const cat = getScholarshipCatalog(s);
  const chips: CardChip[] = [];

  const add = (key: string, label: string | null) => {
    if (!label || chips.some((c) => c.label === label)) return;
    chips.push({ key, label });
  };

  for (const slug of cat.categorySlugs) {
    const id = normalizeCategoryId(slug);
    if (id) {
      add(`cat:${slug}`, SCHOLARSHIP_CATEGORY_LABELS[id] ?? slug);
    }
  }

  const easyLabels = EASY_APPLY_OPTIONS.filter((o) => cat.easyApplyIds.includes(o.id));
  for (const o of easyLabels) {
    add(`easy:${o.id}`, o.label);
  }

  for (const id of cat.eligibilityIds) {
    const o = ELIGIBILITY_OPTIONS.find((e) => e.id === id);
    if (o) add(`elig:${id}`, o.label);
  }

  for (const id of cat.educationIds) {
    const o = EDUCATION_LEVEL_OPTIONS.find((e) => e.id === id);
    if (o) add(`edu:${id}`, o.label);
  }

  if (s.verified) add('verified', 'Verified');

  const payout = payoutMethodChipLabel(s.payoutMethod);
  if (payout) add('payout', payout);

  const gpaL = gpaBucketLabel(cat.gpaBucketId);
  if (gpaL && cat.gpaBucketId !== 'no_gpa_requirement') add('gpa', gpaL);

  for (const loc of cat.locationLabels) {
    if (loc === NATIONWIDE_LOCATION) add('loc:nation', loc);
    else add(`loc:${loc}`, loc);
  }

  if (maxVisible != null && maxVisible >= 0) {
    const visible = chips.slice(0, maxVisible);
    const overflow = Math.max(0, chips.length - maxVisible);
    return { visible, overflow };
  }

  return { visible: chips, overflow: 0 };
}
