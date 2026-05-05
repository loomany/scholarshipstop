import type { Scholarship, ScholarshipSeoFaqItem } from '@/app/scholarships/scholarshipsData';
import {
  filterRawAiMissingInfoLines,
  getNormalizedBeforeYouApplySections,
  softenImportantCheckLine
} from '@/lib/scholarships/scholarshipCheckSectionsNormalize';
import { sanitizeRequirementLines } from '@/lib/scholarships/scholarshipText';

/** Below this, on-page FAQ / rich AI guidance / next steps are suppressed or reduced. */
export const AI_CONFIDENCE_LOW_THRESHOLD = 0.45;

export const QUICK_DECISION_MAX_PER_CARD = 3;

export type NormalizedScholarshipUi = {
  record: Scholarship;
  heroSummary: string | null;
  eligibilityLines: string[];
  overviewPrimary: string;
  matchBadge: { label: string; title?: string } | null;
  urgencyBadge: {
    label: string;
    variant: 'slate' | 'sky' | 'amber' | 'rose';
  } | null;
  difficultyBadge: { label: string } | null;
  quickDecision: {
    bestFor: string[];
    highlights: string[];
    whyApply: string[];
    importantChecks: string[];
  };
  lowConfidenceAi: boolean;
};

export function hasNonEmptyText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function hasNonEmptyArray(arr: string[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.some((x) => String(x).trim().length > 0);
}

export function clampBullets(lines: string[], max: number): string[] {
  return lines
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function filterAiMissingInfoForDisplay(
  items: string[] | null | undefined
): string[] {
  return filterRawAiMissingInfoLines(items);
}

/** Use for tips, next steps, on-page FAQ: only when model reported sufficient confidence. */
export function hasTrustworthyAiConfidence(s: Scholarship): boolean {
  const v = s.aiConfidenceScore;
  if (v == null || Number.isNaN(Number(v))) return false;
  return Number(v) >= AI_CONFIDENCE_LOW_THRESHOLD;
}

/** Banner / “limited data” messaging when score exists and is explicitly low. */
export function isLowConfidenceAi(s: Scholarship): boolean {
  const v = s.aiConfidenceScore;
  if (v == null || Number.isNaN(Number(v))) return false;
  return Number(v) < AI_CONFIDENCE_LOW_THRESHOLD;
}

export function getHeroSummary(s: Scholarship): string | null {
  const a = s.aiStudentSummary?.trim();
  if (a) return a;
  const seo = s.seoExcerpt?.trim();
  if (seo) return seo;
  const short = s.summaryShort?.trim();
  if (short) return short;
  const d = s.description?.trim();
  if (d && d.length <= 400) return d;
  if (d) return `${d.slice(0, 280).trim()}…`;
  return null;
}

function normBulletKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s: string): Set<string> {
  const t = normBulletKey(s);
  return new Set(t.split(' ').filter((w) => w.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of Array.from(a)) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function bulletsSimilar(a: string, b: string): boolean {
  const na = normBulletKey(a);
  const nb = normBulletKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 24 && nb.includes(na)) return true;
  if (nb.length >= 24 && na.includes(nb)) return true;
  return jaccard(tokenSet(a), tokenSet(b)) >= 0.55;
}

/**
 * True when “Before you apply” content largely repeats Quick decision bullets
 * (same checks / missing / flags echoed as highlights).
 */
export function isDecisionAndChecksTooSimilar(s: Scholarship): boolean {
  const quick = [
    ...(s.aiBestFor ?? []),
    ...(s.aiKeyHighlights ?? []),
    ...(s.aiWhyApply ?? []),
    ...(s.aiImportantChecks ?? []).map(softenImportantCheckLine)
  ]
    .map((x) => x.trim())
    .filter((x) => x.length > 8);
  const normalizedBefore = getNormalizedBeforeYouApplySections(s);
  const before = [
    ...normalizedBefore.importantChecks,
    ...normalizedBefore.detailsToConfirm,
    ...normalizedBefore.redFlags
  ]
    .map((x) => x.trim())
    .filter((x) => x.length > 8);
  if (quick.length === 0 || before.length === 0) return false;
  let hit = 0;
  for (const b of before) {
    if (quick.some((q) => bulletsSimilar(q, b))) hit++;
  }
  return hit / before.length >= 0.5;
}

/**
 * When Quick decision and Before you apply overlap, keep one panel or split roles
 * (no duplicate “important checks” in Quick when Before is shown).
 */
export function pickQuickDecisionAndBeforePanels(s: Scholarship): {
  showQuickDecision: boolean;
  showBeforeYouApply: boolean;
} {
  const q =
    hasNonEmptyArray(s.aiBestFor) ||
    hasNonEmptyArray(s.aiKeyHighlights) ||
    hasNonEmptyArray(s.aiWhyApply) ||
    hasNonEmptyArray(s.aiImportantChecks);
  const b = shouldRenderBeforeYouApply(s);
  if (!q && !b) return { showQuickDecision: false, showBeforeYouApply: false };
  if (q && !b) return { showQuickDecision: true, showBeforeYouApply: false };
  if (!q && b) return { showQuickDecision: false, showBeforeYouApply: true };
  if (!isDecisionAndChecksTooSimilar(s)) {
    return { showQuickDecision: true, showBeforeYouApply: true };
  }
  const normalizedBefore = getNormalizedBeforeYouApplySections(s);
  const hasExtra =
    hasNonEmptyArray(normalizedBefore.detailsToConfirm) ||
    hasNonEmptyArray(normalizedBefore.redFlags);
  if (hasExtra) return { showQuickDecision: false, showBeforeYouApply: true };
  return { showQuickDecision: true, showBeforeYouApply: false };
}

/** True if this AI bullet duplicates award $ info (belongs in stat cards, not hero one-liner). */
function isAwardOrMoneySnippet(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/\$\s*[\d,.]+/.test(text)) return true;
  if (t.includes('award amount')) return true;
  if (/^amount\s*:/i.test(text.trim())) return true;
  return false;
}

/**
 * One-line hint from AI bullets (best for / highlights / checks).
 * Not used in the scholarship detail hero: keep award amounts and dollar figures
 * in stat cards and Award sections only, not as a second line under the intro
 * (applies to AI-generated listings too). Award-like snippets are skipped here
 * so pipelines can keep rich bullets without duplicating money under the intro.
 */
export function getDecisionLine(s: Scholarship): string | null {
  const parts: string[] = [];
  const bfRaw = (s.aiBestFor ?? []).map((x) => x.trim()).filter(Boolean)[0];
  const hiRaw = (s.aiKeyHighlights ?? []).map((x) => x.trim()).filter(Boolean)[0];
  const ckRaw = (s.aiImportantChecks ?? []).map((x) => x.trim()).filter(Boolean)[0];
  const bf = bfRaw && !isAwardOrMoneySnippet(bfRaw) ? bfRaw : undefined;
  const hi = hiRaw && !isAwardOrMoneySnippet(hiRaw) ? hiRaw : undefined;
  const ck = ckRaw && !isAwardOrMoneySnippet(ckRaw) ? ckRaw : undefined;
  if (bf) parts.push(bf);
  if (hi && (!bf || !bulletsSimilar(bf, hi))) parts.push(hi);
  if (
    ck &&
    !parts.some((p) => bulletsSimilar(p, ck)) &&
    parts.length < 2
  ) {
    parts.push(ck);
  }
  if (parts.length === 0) return null;
  let line = parts.join(' · ');
  if (line.length > 175) line = `${line.slice(0, 172).trim()}…`;
  return line;
}

function normLevel(
  raw: string | null | undefined,
  allowed: string[]
): string | null {
  const t = raw?.trim().toLowerCase();
  if (!t) return null;
  const hit = allowed.find((a) => a.toLowerCase() === t);
  if (hit) return hit;
  if (t === 'urgent') return 'Urgent';
  if (t === 'high') return 'High';
  if (t === 'medium' || t === 'med') return 'Medium';
  if (t === 'low') return 'Low';
  if (t === 'easy') return 'Easy';
  if (t === 'moderate') return 'Moderate';
  if (t === 'selective' || t === 'hard') return 'Selective';
  if (t === 'unknown') return 'Unknown';
  return null;
}

export function getUrgencyBadge(
  s: Scholarship
): { label: string; variant: 'slate' | 'sky' | 'amber' | 'rose' } | null {
  const u =
    normLevel(s.aiUrgencyLevel, ['Low', 'Medium', 'High', 'Urgent']) ?? null;
  if (!u) return null;
  const variant =
    u === 'Urgent' || u === 'High'
      ? 'rose'
      : u === 'Medium'
        ? 'amber'
        : 'sky';
  return { label: u, variant };
}

export function getMatchBadge(_s: Scholarship): {
  label: string;
  title?: string;
} | null {
  return null;
}

export function getDifficultyBadge(s: Scholarship): { label: string } | null {
  const raw = s.aiDifficultyLevel?.trim().toLowerCase();
  if (!raw || raw === 'unknown') return null;
  const d =
    normLevel(s.aiDifficultyLevel, ['Easy', 'Moderate', 'Selective']) ?? null;
  if (!d) return { label: 'Difficulty: Limited data' };
  return { label: d };
}

export function shouldRenderQuickDecision(s: Scholarship): boolean {
  return (
    hasNonEmptyArray(s.aiBestFor) ||
    hasNonEmptyArray(s.aiKeyHighlights) ||
    hasNonEmptyArray(s.aiWhyApply) ||
    hasNonEmptyArray(s.aiImportantChecks)
  );
}

export function shouldRenderBeforeYouApply(s: Scholarship): boolean {
  const n = getNormalizedBeforeYouApplySections(s);
  return (
    hasNonEmptyArray(n.importantChecks) ||
    hasNonEmptyArray(n.detailsToConfirm) ||
    hasNonEmptyArray(n.redFlags)
  );
}

const GENERIC_TIP_RE =
  /\b(check|visit|review|see|read)\s+(the\s+)?(official\s+)?(website|site|page)\b/i;
const GENERIC_PREP_RE =
  /\b(prepare|gather)\s+(your\s+)?documents?\b/i;
const GENERIC_VERIFY_RE = /^verify\s+eligibility\.?$/i;

export function filterApplicationTipsForUi(
  tips: string[] | null | undefined,
  opts: { trustworthyAi: boolean }
): string[] {
  const raw = (tips ?? []).map((t) => t.trim()).filter((t) => t.length > 8);
  const filtered = raw.filter(
    (t) =>
      !GENERIC_TIP_RE.test(t) &&
      !GENERIC_PREP_RE.test(t) &&
      !GENERIC_VERIFY_RE.test(t)
  );
  const use = filtered.length > 0 ? filtered : raw;
  if (opts.trustworthyAi) return clampBullets(use, 4);
  const safe = use.filter((t) => t.length >= 24);
  if (safe.length > 0) return clampBullets(safe, 2);
  return clampBullets(raw, 2);
}

export function shouldRenderApplicationTipsUi(
  s: Scholarship,
  filteredTips: string[]
): boolean {
  return filteredTips.length > 0;
}

export function shouldRenderSeoApplication(s: Scholarship): boolean {
  return hasNonEmptyText(s.seoApplication);
}

function payoutIsOnlyNotStated(label: string | null | undefined): boolean {
  const t = label?.trim().toLowerCase() ?? '';
  return (
    t.includes('not stated') ||
    t.includes('unknown') ||
    t === '' ||
    t.includes('не указан')
  );
}

export function shouldRenderAwardPaymentSection(ctx: {
  hasAwardStat: boolean;
  awardsPlain?: string | null;
  numberOfAwards?: number | null;
  payoutLabel?: string | null;
  paymentNarrative?: string | null;
  recurring?: boolean;
  paymentHtml?: string | null;
}): boolean {
  const payoutOnlyNoise =
    Boolean(ctx.payoutLabel) &&
    payoutIsOnlyNotStated(ctx.payoutLabel) &&
    !hasNonEmptyText(ctx.paymentNarrative) &&
    !hasNonEmptyText(ctx.paymentHtml);

  const extra =
    hasNonEmptyText(ctx.awardsPlain) ||
    hasNonEmptyText(ctx.paymentNarrative) ||
    ctx.numberOfAwards != null ||
    (hasNonEmptyText(ctx.payoutLabel) && !payoutOnlyNoise) ||
    Boolean(ctx.recurring) ||
    hasNonEmptyText(ctx.paymentHtml);
  if (extra) return true;
  if (ctx.hasAwardStat) return false;
  return false;
}

function stripHtmlish(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isMostlyNumericJunk(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (t.length <= 8 && /^[\d,.$\s%-]+$/i.test(t)) return true;
  if (t.length <= 4 && /^\d+$/.test(t)) return true;
  return false;
}

const BOILERPLATE_NOTE_RE =
  /\b(see|check|visit)\s+(the\s+)?(website|site|page)\b/i;

/** Drops empty, numeric-only, or boilerplate-only “important notes” subsections. */
export function shouldRenderImportantNotesSubsection(
  heading: string,
  plain: string | null | undefined
): boolean {
  const p = plain?.trim() ?? '';
  if (!p) return false;
  if (p.length < 14 && isMostlyNumericJunk(p)) return false;
  if (p.length < 24 && BOILERPLATE_NOTE_RE.test(p) && p.length < 40) {
    return false;
  }
  const h = heading.toLowerCase();
  if (h.includes('program') && isMostlyNumericJunk(p)) return false;
  return true;
}

export type ImportantNoteChunk = {
  key: string;
  heading: string;
  plain?: string | null;
  html?: string | null;
};

export function filterImportantNoteChunks(
  chunks: ImportantNoteChunk[],
  ctx: { awardLine: string; deadlineLine?: string }
): ImportantNoteChunk[] {
  const awardNorm = ctx.awardLine.replace(/\s/g, '').toLowerCase();
  const deadlineNorm = (ctx.deadlineLine ?? '').replace(/\s/g, '').toLowerCase();
  return chunks.filter((c) => {
    const plain = c.plain?.trim() ?? '';
    if (c.html?.trim()) {
      const stripped = stripHtmlish(c.html!);
      return shouldRenderImportantNotesSubsection(c.heading, stripped);
    }
    if (!shouldRenderImportantNotesSubsection(c.heading, plain)) return false;
    const pNorm = plain.replace(/\s/g, '').toLowerCase();
    if (awardNorm && pNorm === awardNorm) return false;
    if (deadlineNorm && pNorm === deadlineNorm) return false;
    return true;
  });
}

export function shouldMergeApplicationDetails(ctx: {
  hasRequirementsSection: boolean;
  requirementBulletCount: number;
  hasRequirementsHtml: boolean;
  documentCount: number;
  hasSeoApplication: boolean;
  seoApplicationLength: number;
}): boolean {
  const n = [ctx.hasRequirementsSection, ctx.documentCount > 0, ctx.hasSeoApplication].filter(
    Boolean
  ).length;
  if (n < 2) return false;

  const reqStrong =
    ctx.hasRequirementsSection &&
    (ctx.hasRequirementsHtml || ctx.requirementBulletCount >= 3);
  const docStrong = ctx.documentCount >= 3;
  const seoStrong =
    ctx.hasSeoApplication && ctx.seoApplicationLength >= 100;

  if (reqStrong || docStrong || seoStrong) return false;

  const reqWeak =
    !ctx.hasRequirementsSection ||
    (!ctx.hasRequirementsHtml && ctx.requirementBulletCount <= 1);
  const docWeak = ctx.documentCount <= 1;
  const seoWeak =
    !ctx.hasSeoApplication || ctx.seoApplicationLength < 60;

  return [reqWeak, docWeak, seoWeak].filter(Boolean).length >= 2;
}

export type ApplicationDetailsPart = 'requirements' | 'documents' | 'applying';

export function getApplicationDetailsSections(
  ctx: {
    hasRequirementsSection: boolean;
    documentCount: number;
    hasSeoApplication: boolean;
  },
  merged: boolean
): ApplicationDetailsPart[] {
  if (merged) return ['requirements', 'documents', 'applying'];
  const out: ApplicationDetailsPart[] = [];
  if (ctx.hasRequirementsSection) out.push('requirements');
  if (ctx.documentCount > 0) out.push('documents');
  if (ctx.hasSeoApplication) out.push('applying');
  return out;
}

function normFaqText(s: string): string {
  return normBulletKey(s);
}

function faqDuplicatesVisibleFact(
  question: string,
  answer: string,
  ctx: { awardNorm: string; deadlineNorm: string; heroNorm: string }
): boolean {
  const a = normFaqText(answer);
  if (!a) return true;
  if (ctx.awardNorm && a === ctx.awardNorm && a.length < 80) return true;
  if (ctx.deadlineNorm && a === ctx.deadlineNorm && a.length < 80) return true;
  if (
    ctx.heroNorm &&
    ctx.heroNorm.length > 40 &&
    (a === ctx.heroNorm || ctx.heroNorm.includes(a) || a.includes(ctx.heroNorm))
  ) {
    return a.length < 100;
  }
  const q = question.toLowerCase();
  if (/deadline|due date|when.*due/.test(q) && ctx.deadlineNorm && a.length < 60) {
    return a === ctx.deadlineNorm || ctx.deadlineNorm.includes(a);
  }
  if (/how much|award amount|worth/.test(q) && ctx.awardNorm && a.length < 60) {
    return a === ctx.awardNorm;
  }
  return false;
}

function isJunkFaqQuestion(q: string): boolean {
  const t = q.trim().toLowerCase();
  return t.length < 8 || /^faq\.?$/i.test(t) || /^question\s*\d+$/i.test(t);
}

/** On-page FAQ only: strict quality + confidence: SEO/schema may still use full seo_faq in layout. */
export function shouldRenderUsefulFaq(
  s: Scholarship,
  ctx: {
    heroSummary: string | null;
    awardLine: string;
    deadlinePrimary: string;
  }
): boolean {
  const items = s.seoFaq ?? [];
  const good = items.filter((it) => {
    const q = it.question?.trim() ?? '';
    const a = it.answer?.trim() ?? '';
    if (!q || !a) return false;
    if (isJunkFaqQuestion(q)) return false;
    if (a.length < 28) return false;
    return true;
  });
  if (good.length < 2) return false;

  const heroNorm = normFaqText(ctx.heroSummary ?? '');
  const awardNorm = normFaqText(ctx.awardLine);
  const deadlineNorm = normFaqText(ctx.deadlinePrimary);

  const nonDup = good.filter(
    (it) =>
      !faqDuplicatesVisibleFact(it.question, it.answer, {
        heroNorm,
        awardNorm,
        deadlineNorm
      })
  );
  return nonDup.length >= 2;
}

export function filterFaqForOnPageDisplay(
  s: Scholarship,
  ctx: {
    heroSummary: string | null;
    awardLine: string;
    deadlinePrimary: string;
  }
): ScholarshipSeoFaqItem[] {
  const items = s.seoFaq ?? [];
  const good = items.filter((it) => {
    const q = it.question?.trim() ?? '';
    const a = it.answer?.trim() ?? '';
    if (!q || !a || isJunkFaqQuestion(q) || a.length < 28) return false;
    return true;
  });
  const heroNorm = normFaqText(ctx.heroSummary ?? '');
  const awardNorm = normFaqText(ctx.awardLine);
  const deadlineNorm = normFaqText(ctx.deadlinePrimary);
  return good.filter(
    (it) =>
      !faqDuplicatesVisibleFact(it.question, it.answer, {
        heroNorm,
        awardNorm,
        deadlineNorm
      })
  );
}

/** Next steps: only with trustworthy AI; grounded in listing signals. */
export function getNextStepActions(s: Scholarship): string[] {
  if (!hasTrustworthyAiConfidence(s)) return [];
  const out: string[] = [];
  out.push('Confirm every eligibility rule on the official program page.');
  if (hasNonEmptyArray(s.documentsRequired)) {
    out.push(
      `Prepare the listed materials (${s.documentsRequired!.length} document type(s) detected in the catalog).`
    );
  } else if (s.documentRequired || s.essayRequired) {
    out.push(
      'Review the official instructions for essays, transcripts, or uploads.'
    );
  } else {
    out.push('Skim the official instructions for any uploads or essays.');
  }
  if (
    s.deadline?.trim() &&
    s.deadline.trim() !== '—'
  ) {
    out.push('Add the deadline to your calendar and submit before it passes.');
  } else {
    out.push('If no deadline is shown here, find the closing date on the official listing.');
  }
  out.push('Apply through the official site linked above.');
  return clampBullets(out, 4);
}

export function eligibilityLinesForUi(s: Scholarship): string[] {
  const ai = (s.aiEligibilitySummary ?? [])
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);
  if (ai.length) return ai;

  const fromNorm = sanitizeRequirementLines(s.whoCanApplyText ?? undefined);
  if (fromNorm.length) return fromNorm;

  const et = s.eligibilityText?.trim();
  if (et) {
    return et
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 10 && !/application is ready/i.test(x));
  }

  const seo = s.seoEligibility?.trim();
  if (seo) {
    const lines = seo
      .split(/\r?\n+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 8);
    if (lines.length) return lines;
    return [seo];
  }

  return [];
}

export function overviewBodyForUi(
  s: Scholarship,
  isSimplerGov: boolean,
  simplerOverviewText: string
): string {
  if (isSimplerGov) return simplerOverviewText;
  const seo = s.seoOverview?.trim();
  if (seo) return seo;
  const long = s.summaryLong?.trim() ?? '';
  const short = s.summaryShort?.trim() ?? '';
  if (long && long !== short) return long;
  const d = s.description?.trim() ?? '';
  if (d) return d;
  return s.aiStudentSummary?.trim() ?? '';
}

/** Avoid word-for-word repeat of hero summary in overview body. */
export function overviewTextAvoidingHeroDuplicate(
  overviewBody: string,
  heroSummary: string | null
): string {
  const o = overviewBody.trim();
  const h = (heroSummary ?? '').trim();
  if (!o || !h) return o;
  const on = normBulletKey(o.slice(0, Math.min(o.length, 320)));
  const hn = normBulletKey(h.slice(0, Math.min(h.length, 320)));
  if (on === hn || (hn.length > 50 && on.startsWith(hn))) {
    const rest = o.slice(h.length).trim().replace(/^[.\s—-]+/, '');
    return rest.length > 80 ? rest : o;
  }
  return o;
}

export function normalizeScholarshipForUi(
  s: Scholarship,
  opts: {
    isSimplerGov: boolean;
    simplerOverviewText: string;
  }
): NormalizedScholarshipUi {
  const eligibilityLines = eligibilityLinesForUi(s);
  let overviewPrimary = overviewBodyForUi(
    s,
    opts.isSimplerGov,
    opts.simplerOverviewText
  );
  const heroSummary = getHeroSummary(s);
  overviewPrimary = overviewTextAvoidingHeroDuplicate(
    overviewPrimary,
    heroSummary
  );

  return {
    record: s,
    heroSummary,
    eligibilityLines,
    overviewPrimary,
    matchBadge: getMatchBadge(s),
    urgencyBadge: getUrgencyBadge(s),
    difficultyBadge: getDifficultyBadge(s),
    quickDecision: {
      bestFor: clampBullets(s.aiBestFor ?? [], QUICK_DECISION_MAX_PER_CARD),
      highlights: clampBullets(
        s.aiKeyHighlights ?? [],
        QUICK_DECISION_MAX_PER_CARD
      ),
      whyApply: clampBullets(s.aiWhyApply ?? [], QUICK_DECISION_MAX_PER_CARD),
      importantChecks: clampBullets(
        (s.aiImportantChecks ?? []).map(softenImportantCheckLine),
        QUICK_DECISION_MAX_PER_CARD
      )
    },
    lowConfidenceAi: isLowConfidenceAi(s)
  };
}
