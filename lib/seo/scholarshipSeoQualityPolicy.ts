import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  getLongTailSitemapSlugs,
  LONG_TAIL_SLUG_SET,
  normalizeScholarshipDynamicParam
} from '@/app/scholarships/scholarshipLongTailPresets';
import {
  fieldOfStudyDisplayList,
  getScholarshipDeadlineDisplayParts,
  studyLevelsDisplayList,
  type ScholarshipDeadlineFields
} from '@/app/scholarships/scholarshipsData';
import { fieldOfStudyLabelForValue } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import { schoolLevelLabelForValue } from '@/lib/constants/scholarshipProfileOptions';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';
import type { LongTailSeoBundle } from '@/lib/scholarships/longTailSeoTypes';
import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';
import { listUsStateSeoSlugs } from '@/lib/scholarships/seoScholarshipRouteTokens';

export type ScholarshipSourceStatusCode =
  | 'verified_official_source'
  | 'official_source_available'
  | 'needs_confirmation'
  | 'source_unclear';

export type ScholarshipSourceStatus = {
  code: ScholarshipSourceStatusCode;
  label: string;
  shortLabel: string;
  description: string;
};

export type ScholarshipDifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Unknown';

export type ScholarshipDifficulty = {
  level: ScholarshipDifficultyLevel;
  label: string;
  reason: string;
};

export type ScholarshipDeadlineUrgencyLevel =
  | 'Expired'
  | 'Urgent'
  | 'Soon'
  | 'Open'
  | 'Recurring'
  | 'Check source';

export type ScholarshipDeadlineUrgency = {
  level: ScholarshipDeadlineUrgencyLevel;
  label: string;
  description: string;
  daysLeft: number | null;
};

export type ScholarshipMissingDataFlag = {
  key: string;
  label: string;
  description: string;
};

export type ScholarshipDetailIndexPolicy = {
  indexable: boolean;
  reasonCodes: string[];
  meaningfulFactCount: number;
  hasDistinctiveDetailBlock: boolean;
  sourceStatus: ScholarshipSourceStatus;
  missingDataFlags: ScholarshipMissingDataFlag[];
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasAnyText(values: Array<string | null | undefined>): boolean {
  return values.some(hasText);
}

function nonEmptyCount(values: Array<unknown[] | null | undefined>): number {
  return values.reduce((count, value) => count + (value?.length ? 1 : 0), 0);
}

function hasLongText(
  value: string | null | undefined,
  minLength = 32
): boolean {
  return (value?.replace(/\s+/g, ' ').trim().length ?? 0) >= minLength;
}

function hasPositiveNumber(value: number | null | undefined): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

const COUNT_ONLY_REQUIREMENT_LINE_RE =
  /^\d+\s+requirements?;\s+see the official page for full details\.?$/i;

function hasSpecificDetailLine(lines: string[] | null | undefined): boolean {
  return Boolean(
    lines?.some((line) => {
      const text = line.replace(/\s+/g, ' ').trim();
      return text.length >= 12 && !COUNT_ONLY_REQUIREMENT_LINE_RE.test(text);
    })
  );
}

export function getScholarshipSourceStatus(
  s: Pick<
    Scholarship,
    | 'verified'
    | 'providerUrl'
    | 'listingUrl'
    | 'applyLink'
    | 'source'
    | 'officialSourceName'
    | 'hasOfficialApplicationDestination'
  >
): ScholarshipSourceStatus {
  const hasOfficialDestination =
    hasText(s.applyLink) ||
    hasText(s.listingUrl) ||
    hasText(s.providerUrl) ||
    s.hasOfficialApplicationDestination === true;
  const hasNamedSource = hasAnyText([
    s.officialSourceName,
    s.source,
    s.providerUrl
  ]);

  if (s.verified && hasOfficialDestination) {
    return {
      code: 'verified_official_source',
      label: 'Provider link available',
      shortLabel: 'Provider link',
      description: 'Provider-facing destination is available.'
    };
  }

  if (hasOfficialDestination) {
    return {
      code: 'official_source_available',
      label: 'Application path included',
      shortLabel: 'Application path',
      description: 'Application destination is available.'
    };
  }

  if (hasNamedSource) {
    return {
      code: 'needs_confirmation',
      label: 'Structured scholarship details',
      shortLabel: 'Structured details',
      description:
        'Named source is present, but no application destination is structured yet.'
    };
  }

  return {
    code: 'source_unclear',
    label: 'Source-quality signal',
    shortLabel: 'Quality signal',
    description: 'Limited source context is available.'
  };
}

export function getScholarshipMissingDataFlags(
  s: Pick<
    Scholarship,
    | 'deadline'
    | 'deadlineAt'
    | 'amount'
    | 'awardAmount'
    | 'awardAmountNumericSort'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'seoEligibility'
    | 'documentsRequired'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'payoutMethod'
    | 'paymentDetails'
    | 'winnerPayment'
    | 'recurring'
    | 'scholarshipStatus'
    | 'aiMissingInfo'
  >
): ScholarshipMissingDataFlag[] {
  const flags: ScholarshipMissingDataFlag[] = [];
  const deadlineText = s.deadline?.trim();
  const deadlineLooksEmpty =
    !deadlineText ||
    (deadlineText.length <= 3 && !/[A-Za-z0-9]/.test(deadlineText));
  const hasDeadline =
    !deadlineLooksEmpty ||
    Boolean(s.deadlineAt?.trim()) ||
    s.recurring === true;
  const hasAward =
    hasText(s.amount) ||
    hasText(s.awardAmount) ||
    (typeof s.awardAmountNumericSort === 'number' &&
      !Number.isNaN(s.awardAmountNumericSort));
  const hasEligibility =
    (s.eligibility?.length ?? 0) > 0 ||
    hasAnyText([s.whoCanApplyText, s.eligibilityText, s.seoEligibility]);
  const hasDocs =
    (s.documentsRequired?.length ?? 0) > 0 ||
    [
      s.documentRequired,
      s.essayRequired,
      s.transcriptRequired,
      s.recommendationRequired
    ].some((value) => value === true);
  const payoutKnown =
    hasText(s.payoutMethod) || hasAnyText([s.paymentDetails, s.winnerPayment]);

  if (!hasDeadline) {
    flags.push({
      key: 'deadline_unclear',
      label: 'Deadline unclear',
      description:
        'Deadline timing is not fully structured yet; save this scholarship and track the application path.'
    });
  }
  if (!hasAward) {
    flags.push({
      key: 'award_unclear',
      label: 'Award amount unclear',
      description:
        'Award value or renewal details are not fully structured yet.'
    });
  }
  if (!hasEligibility) {
    flags.push({
      key: 'eligibility_incomplete',
      label: 'Eligibility incomplete',
      description:
        'Use the visible eligibility signals to compare fit and prepare the materials that match your profile.'
    });
  }
  if (!hasDocs) {
    flags.push({
      key: 'documents_unclear',
      label: 'Required documents unclear',
      description:
        'Required documents are not fully structured yet; use the checklist and essay tools to prepare.'
    });
  }
  if (!payoutKnown) {
    flags.push({
      key: 'payout_unclear',
      label: 'Payout method unclear',
      description: 'Payout route is not fully structured yet.'
    });
  }
  if (!s.recurring && !hasText(s.scholarshipStatus)) {
    flags.push({
      key: 'renewal_unclear',
      label: 'Renewal status unclear',
      description: 'Cycle timing is not fully structured yet.'
    });
  }

  return flags.slice(0, 8);
}

export function getScholarshipApplicationDifficulty(
  s: Pick<
    Scholarship,
    | 'documentsRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'documentRequired'
    | 'photoRequired'
    | 'videoRequired'
    | 'linkRequired'
    | 'surveyRequired'
    | 'questionRequired'
    | 'goalRequired'
    | 'specialEligibilityRequired'
    | 'requirementsCount'
    | 'requirementSignalsCount'
    | 'aiDifficultyLevel'
  >
): ScholarshipDifficulty {
  const ai = s.aiDifficultyLevel?.trim();
  if (ai && /^(easy|medium|hard)$/i.test(ai)) {
    const level = (ai[0]!.toUpperCase() + ai.slice(1).toLowerCase()) as
      | 'Easy'
      | 'Medium'
      | 'Hard';
    return {
      level,
      label: `Effort: ${level}`,
      reason:
        'Difficulty comes from ScholarshipTop structured application signals. Use it to plan your preparation workload.'
    };
  }

  const requiredSignals = [
    s.documentRequired,
    s.photoRequired,
    s.videoRequired,
    s.linkRequired,
    s.surveyRequired,
    s.questionRequired,
    s.goalRequired,
    s.specialEligibilityRequired,
    s.essayRequired,
    s.transcriptRequired,
    s.recommendationRequired
  ].filter((value) => value === true).length;
  const namedDocs =
    s.documentsRequired?.filter((item) => item.trim()).length ?? 0;
  const explicitReqCount =
    typeof s.requirementsCount === 'number' &&
    !Number.isNaN(s.requirementsCount)
      ? s.requirementsCount
      : typeof s.requirementSignalsCount === 'number' &&
          !Number.isNaN(s.requirementSignalsCount)
        ? s.requirementSignalsCount
        : null;
  const count = Math.max(requiredSignals, namedDocs, explicitReqCount ?? 0);

  if (count === 0) {
    return {
      level: 'Unknown',
      label: 'Effort: Unknown',
      reason:
        'The application workload is not clear from current listing data. Use the organized details to plan materials before submitting.'
    };
  }

  const hasHeavyDocs =
    s.essayRequired === true ||
    s.transcriptRequired === true ||
    s.recommendationRequired === true ||
    s.videoRequired === true ||
    s.specialEligibilityRequired === true;
  const heavyDocCount = [
    s.essayRequired,
    s.transcriptRequired,
    s.recommendationRequired,
    s.videoRequired,
    s.specialEligibilityRequired
  ].filter((value) => value === true).length;

  if (count >= 5 || heavyDocCount >= 3) {
    return {
      level: 'Hard',
      label: 'Effort: Hard',
      reason:
        'This listing appears to require several materials or higher-effort evidence before submission.'
    };
  }

  if (hasHeavyDocs || count >= 2) {
    return {
      level: 'Medium',
      label: 'Effort: Medium',
      reason:
        'Expect at least one meaningful preparation step, such as an essay, transcript, recommendation, or supporting document.'
    };
  }

  return {
    level: 'Easy',
    label: 'Effort: Easy',
    reason:
      'Current structured data shows few required materials, so this may be a faster opportunity to prepare.'
  };
}

export function getScholarshipDeadlineUrgency(
  s: Pick<Scholarship, 'deadlineAt' | 'deadline' | 'recurring'>,
  now: Date = new Date()
): ScholarshipDeadlineUrgency {
  if (s.recurring === true) {
    return {
      level: 'Recurring',
      label: 'Recurring',
      description:
        'This listing may reopen or repeat. Save it to track the current or next cycle.',
      daysLeft: null
    };
  }

  const anchor = parseScholarshipDeadlineAnchor(
    s.deadlineAt ?? undefined,
    s.deadline ?? undefined
  );
  if (!anchor) {
    return {
      level: 'Check source',
      label: 'Timing to track',
      description:
        'ScholarshipTop does not have a structured calendar deadline for this listing yet.',
      daysLeft: null
    };
  }

  const daysLeft = Math.ceil(
    (anchor.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (daysLeft < 0) {
    return {
      level: 'Expired',
      label: 'Expired',
      description:
        'The catalog deadline appears to have passed. Save it if you want to track a future cycle.',
      daysLeft
    };
  }
  if (daysLeft <= 14) {
    return {
      level: 'Urgent',
      label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
      description:
        'The deadline is close. Prioritize eligibility checks and required materials before spending time on essays.',
      daysLeft
    };
  }
  if (daysLeft <= 45) {
    return {
      level: 'Soon',
      label: `${daysLeft} days left`,
      description:
        'There is still planning time, but documents and recommendations should be checked now.',
      daysLeft
    };
  }
  return {
    level: 'Open',
    label: `${daysLeft} days left`,
    description:
      'The deadline is not immediate, so there is planning time for materials, essays, and shortlist decisions.',
    daysLeft
  };
}

/** Turn catalog slug/token into readable copy (no underscores). */
export function formatScholarshipCatalogTokenForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return (
    fieldOfStudyLabelForValue(t) ??
    schoolLevelLabelForValue(t) ??
    t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  );
}

function formatBestForStudentsPhrase(token: string): string {
  const label = formatScholarshipCatalogTokenForDisplay(token);
  if (/\bstudents$/i.test(label) || /\bstudent$/i.test(label)) return label;
  return `${label} students`;
}

export function getScholarshipBestForLabel(
  s: Pick<
    Scholarship,
    | 'aiBestFor'
    | 'catalogUi'
    | 'studyLevels'
    | 'fieldOfStudy'
    | 'internationalFriendlyListing'
    | 'applicantCountryCodes'
  >
): string {
  const ai = s.aiBestFor?.map((item) => item.trim()).find(Boolean);
  if (ai) {
    const head = ai.replace(/\s+students\s*$/i, '').trim();
    return formatBestForStudentsPhrase(head || ai);
  }
  const field = fieldOfStudyDisplayList(s)[0];
  if (field) return formatBestForStudentsPhrase(field);
  const level = studyLevelsDisplayList(s)[0];
  if (level) return formatBestForStudentsPhrase(level);
  if (s.internationalFriendlyListing === true) return 'International students';
  if ((s.applicantCountryCodes?.length ?? 0) > 0) {
    return 'Students matching country rules';
  }
  return 'Students who match the listed eligibility signals';
}

/** Same calendar/relative deadline copy as the card metric column (never raw ISO). */
function deadlinePhraseForCardSnippet(
  s: ScholarshipDeadlineFields
): string | null {
  const { primary } = getScholarshipDeadlineDisplayParts(s);
  return primary && primary !== '—' ? primary : null;
}

export function buildScholarshipCardSnippet(
  s: Pick<
    Scholarship,
    | 'summaryShort'
    | 'seoExcerpt'
    | 'description'
    | 'amount'
    | 'awardAmount'
    | 'deadline'
    | 'deadlineAt'
    | 'fieldOfStudy'
    | 'studyLevels'
    | 'aiBestFor'
    | 'aiMissingInfo'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'seoEligibility'
    | 'documentsRequired'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'payoutMethod'
    | 'paymentDetails'
    | 'winnerPayment'
    | 'recurring'
    | 'scholarshipStatus'
  >,
  awardDisplay: string,
  hasAwardContent: boolean
): string {
  const partial = getScholarshipMissingDataFlags(s).length >= 3;
  if (partial) {
    return 'This listing has partial details. Use the structured fields to compare fit, prepare materials, track timing, and open the application path when ready.';
  }

  const bestFor = getScholarshipBestForLabel(s);
  const deadline = deadlinePhraseForCardSnippet(s);
  const amount = hasAwardContent ? awardDisplay : null;
  if (amount && deadline) {
    return `${bestFor} can compare this scholarship with a listed award of ${amount} and a ${deadline} deadline while planning eligibility fit and required materials.`;
  }
  if (deadline) {
    return `${bestFor} should review this scholarship early because the deadline is listed as ${deadline}. Save it and plan the application path before it closes.`;
  }
  if (amount) {
    return `${bestFor} can compare this opportunity with a listed award of ${amount} and review the application path in ScholarshipTop.`;
  }

  const fallback =
    s.summaryShort?.trim() || s.seoExcerpt?.trim() || s.description?.trim();
  if (fallback) {
    return fallback.length > 220
      ? `${fallback.slice(0, 217).trim()}...`
      : fallback;
  }

  return `${bestFor} can use ScholarshipTop to compare eligibility signals, deadline timing, award details, and application steps in one place.`;
}

export function meaningfulScholarshipFactCount(
  s: Pick<
    Scholarship,
    | 'deadline'
    | 'deadlineAt'
    | 'recurring'
    | 'amount'
    | 'awardAmount'
    | 'awardAmountNumericSort'
    | 'provider'
    | 'providerSlug'
    | 'providerMission'
    | 'providerUrl'
    | 'listingUrl'
    | 'applyLink'
    | 'hasOfficialApplicationDestination'
    | 'officialSourceName'
    | 'source'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'requirementsTextClean'
    | 'requirementsHtml'
    | 'eligibilityHtml'
    | 'seoEligibility'
    | 'documentsRequired'
    | 'documentUrls'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'photoRequired'
    | 'videoRequired'
    | 'linkRequired'
    | 'surveyRequired'
    | 'questionRequired'
    | 'goalRequired'
    | 'specialEligibilityRequired'
    | 'studyLevels'
    | 'fieldOfStudy'
    | 'hostCountryCodes'
    | 'applicantCountryCodes'
    | 'institutionTypes'
    | 'stateCodes'
    | 'locationScope'
    | 'requirementTypes'
    | 'requirementsCount'
    | 'requirementSignalsCount'
    | 'summaryShort'
    | 'summaryLong'
    | 'aiStudentSummary'
    | 'seoExcerpt'
    | 'seoOverview'
    | 'statusText'
    | 'scholarshipStatus'
    | 'payoutMethod'
    | 'paymentDetails'
    | 'winnerPayment'
    | 'numberOfAwards'
    | 'financialNeedConsidered'
  >
): number {
  const scalarFacts = [
    hasAnyText([s.deadline, s.deadlineAt]) || s.recurring === true,
    hasAnyText([s.amount, s.awardAmount]) ||
      hasPositiveNumber(s.awardAmountNumericSort),
    hasAnyText([s.provider, s.providerSlug, s.officialSourceName, s.source]),
    hasAnyText([s.providerUrl, s.listingUrl, s.applyLink]) ||
      s.hasOfficialApplicationDestination === true,
    hasScholarshipEligibilityDetail(s),
    hasScholarshipDocumentDetail(s),
    hasScholarshipProviderDescription(s),
    hasAnyText([
      s.summaryShort,
      s.summaryLong,
      s.aiStudentSummary,
      s.seoExcerpt,
      s.seoOverview
    ]),
    hasAnyText([s.statusText, s.scholarshipStatus]),
    hasAnyText([s.payoutMethod, s.paymentDetails, s.winnerPayment]) ||
      hasPositiveNumber(s.numberOfAwards),
    hasPositiveNumber(s.requirementsCount) ||
      hasPositiveNumber(s.requirementSignalsCount),
    s.financialNeedConsidered === true
  ].filter(Boolean).length;
  return (
    scalarFacts +
    nonEmptyCount([
      s.studyLevels,
      s.fieldOfStudy,
      s.hostCountryCodes,
      s.applicantCountryCodes,
      s.institutionTypes,
      s.stateCodes,
      s.requirementTypes
    ])
  );
}

function hasScholarshipEligibilityDetail(
  s: Pick<
    Scholarship,
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'requirementsTextClean'
    | 'requirementsHtml'
    | 'eligibilityHtml'
    | 'seoEligibility'
  >
): boolean {
  return (
    hasSpecificDetailLine(s.eligibility) ||
    hasLongText(s.whoCanApplyText) ||
    hasLongText(s.eligibilityText) ||
    hasLongText(s.requirementsTextClean) ||
    hasLongText(s.requirementsHtml) ||
    hasLongText(s.eligibilityHtml) ||
    hasLongText(s.seoEligibility, 80)
  );
}

function hasScholarshipDocumentDetail(
  s: Pick<
    Scholarship,
    | 'documentsRequired'
    | 'documentUrls'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'photoRequired'
    | 'videoRequired'
    | 'linkRequired'
    | 'surveyRequired'
    | 'questionRequired'
    | 'goalRequired'
    | 'specialEligibilityRequired'
  >
): boolean {
  return (
    hasSpecificDetailLine(s.documentsRequired) ||
    (s.documentUrls?.length ?? 0) > 0 ||
    [
      s.documentRequired,
      s.essayRequired,
      s.transcriptRequired,
      s.recommendationRequired,
      s.photoRequired,
      s.videoRequired,
      s.linkRequired,
      s.surveyRequired,
      s.questionRequired,
      s.goalRequired,
      s.specialEligibilityRequired
    ].some((value) => value === true)
  );
}

function hasScholarshipProviderDescription(
  s: Pick<Scholarship, 'providerMission'>
): boolean {
  return hasLongText(s.providerMission, 40);
}

function hasDistinctiveScholarshipDetailBlock(
  s: Pick<
    Scholarship,
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'requirementsTextClean'
    | 'requirementsHtml'
    | 'eligibilityHtml'
    | 'seoEligibility'
    | 'documentsRequired'
    | 'documentUrls'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'photoRequired'
    | 'videoRequired'
    | 'linkRequired'
    | 'surveyRequired'
    | 'questionRequired'
    | 'goalRequired'
    | 'specialEligibilityRequired'
    | 'providerMission'
  >
): boolean {
  return (
    hasScholarshipEligibilityDetail(s) ||
    hasScholarshipDocumentDetail(s) ||
    hasScholarshipProviderDescription(s)
  );
}

export function getScholarshipDetailIndexPolicy(
  s: Scholarship
): ScholarshipDetailIndexPolicy {
  const sourceStatus = getScholarshipSourceStatus(s);
  const missingDataFlags = getScholarshipMissingDataFlags(s);
  const meaningfulFactCount = meaningfulScholarshipFactCount(s);
  const hasDistinctiveDetailBlock = hasDistinctiveScholarshipDetailBlock(s);
  const deadlineUrgency = getScholarshipDeadlineUrgency(s);
  const sourceIsIndexable =
    sourceStatus.code === 'verified_official_source' ||
    sourceStatus.code === 'official_source_available';
  const hasOriginalSummary = hasAnyText([
    s.aiStudentSummary,
    s.summaryShort,
    s.summaryLong,
    s.seoExcerpt,
    s.seoOverview
  ]);
  const hasIndexableAward =
    hasAnyText([s.amount, s.awardAmount]) ||
    (typeof s.awardAmountNumericSort === 'number' &&
      !Number.isNaN(s.awardAmountNumericSort)) ||
    s.payoutMethod === 'non_monetary';
  const hasIndexableDeadline =
    s.recurring === true ||
    /\b(rolling|ongoing|open year[-\s]?round|varies)\b/i.test(
      s.deadline ?? ''
    ) ||
    ['Urgent', 'Soon', 'Open', 'Recurring'].includes(deadlineUrgency.level);
  const hasIndexableEligibility =
    hasScholarshipEligibilityDetail(s);
  const hasIndexableProvider =
    hasAnyText([
      s.provider,
      s.providerSlug,
      s.providerUrl,
      s.listingUrl,
      s.applyLink,
      s.officialSourceName,
      s.source
    ]) || s.hasOfficialApplicationDestination === true;
  const expiredWithoutFutureCycle =
    s.recurring !== true && deadlineUrgency.level === 'Expired';
  const reasonCodes: string[] = [];

  if (s.isIndexable === false) reasonCodes.push('explicit_noindex');
  if (expiredWithoutFutureCycle)
    reasonCodes.push('expired_without_future_cycle');
  if (!hasIndexableAward) reasonCodes.push('missing_award');
  if (!hasIndexableDeadline) reasonCodes.push('missing_or_expired_deadline');
  if (!hasIndexableEligibility) reasonCodes.push('missing_eligibility');
  if (!hasIndexableProvider) reasonCodes.push('missing_provider');
  if (
    sourceStatus.code === 'source_unclear' ||
    sourceStatus.code === 'needs_confirmation'
  ) {
    reasonCodes.push('source_needs_confirmation');
  }
  if (!hasOriginalSummary) reasonCodes.push('missing_original_summary');
  if (meaningfulFactCount < 3) reasonCodes.push('low_fact_count');
  if (meaningfulFactCount < 6) reasonCodes.push('low_unique_data_field_count');
  if (!hasDistinctiveDetailBlock)
    reasonCodes.push('missing_distinctive_detail_block');
  if (missingDataFlags.length >= 5) reasonCodes.push('many_missing_fields');

  return {
    indexable:
      s.isIndexable !== false &&
      !expiredWithoutFutureCycle &&
      hasIndexableAward &&
      hasIndexableDeadline &&
      hasIndexableEligibility &&
      hasIndexableProvider &&
      hasOriginalSummary &&
      meaningfulFactCount >= 6 &&
      hasDistinctiveDetailBlock &&
      missingDataFlags.length < 5 &&
      sourceIsIndexable,
    reasonCodes,
    meaningfulFactCount,
    hasDistinctiveDetailBlock,
    sourceStatus,
    missingDataFlags
  };
}

export function getProgrammaticSeoIndexPolicy({
  listingCount,
  hasUniqueIntro,
  hasSpecificFaq,
  hasInternalLinks,
  isCanonical,
  duplicateRisk = false
}: {
  listingCount: number;
  hasUniqueIntro: boolean;
  hasSpecificFaq: boolean;
  hasInternalLinks: boolean;
  isCanonical: boolean;
  duplicateRisk?: boolean;
}): { indexable: boolean; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  if (listingCount < 10) reasonCodes.push('low_listing_count');
  if (!hasUniqueIntro) reasonCodes.push('missing_unique_intro');
  if (!hasSpecificFaq) reasonCodes.push('missing_specific_faq');
  if (!hasInternalLinks) reasonCodes.push('missing_internal_links');
  if (!isCanonical) reasonCodes.push('non_canonical');
  if (duplicateRisk) reasonCodes.push('duplicate_risk');

  return {
    indexable: reasonCodes.length === 0,
    reasonCodes
  };
}

export type ScholarshipSeoRouteFamily =
  | 'manifest_single'
  | 'manifest_combo'
  | 'legacy_long_tail'
  | 'dynamic_state'
  | 'dynamic_state_topic'
  | 'dynamic_state_degree_topic'
  | 'dynamic_filter'
  | 'country_seo'
  | 'cross_country_seo'
  | 'university_hub'
  | 'scholarship_detail';

export type ScholarshipSeoRouteQualityTier =
  | 'strong'
  | 'medium'
  | 'weak'
  | 'excluded';

export type ScholarshipSeoRouteQualityFacts = {
  canonicalPath: string;
  entry?: SeoScholarshipRouteManifestEntry | null;
  seoContent?: LongTailSeoBundle | null;
  routeFamily?: ScholarshipSeoRouteFamily;
  stablePublicRoute?: boolean;
  routeResolves?: boolean;
  hasQueryParams?: boolean;
};

export type ScholarshipSeoRouteQualityDecision = {
  shouldIndex: boolean;
  shouldIncludeInSitemap: boolean;
  shouldBeRssEligible: boolean;
  indexable: boolean;
  includeInSitemap: boolean;
  rssEligible: boolean;
  qualityTier: ScholarshipSeoRouteQualityTier;
  routeFamily: ScholarshipSeoRouteFamily;
  reasonCodes: string[];
};

const US_STATE_SEO_SLUGS = new Set(listUsStateSeoSlugs());
const LEGACY_LONG_TAIL_SITEMAP_SLUGS = new Set<string>(
  getLongTailSitemapSlugs().map((slug) =>
    normalizeScholarshipDynamicParam(slug)
  )
);
const PRIORITY_LOW_COMPETITION_LONG_TAIL_SLUGS = new Set<string>([
  'no-essay',
  'closing-soon'
]);

function splitCanonicalScholarshipSeoPath(canonicalPath: string): string[] {
  return canonicalPath
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((part) => normalizeScholarshipDynamicParam(part))
    .filter(Boolean);
}

function countSeoBundleWords(
  seo: LongTailSeoBundle | null | undefined
): number {
  if (!seo) return 0;
  const parts = [
    seo.h1,
    seo.seo_title,
    seo.seo_description,
    seo.intro,
    seo.supporting,
    seo.related_intro,
    ...(Array.isArray(seo.how_to_use) ? seo.how_to_use : [seo.how_to_use]),
    ...(Array.isArray(seo.who_for) ? seo.who_for : [seo.who_for]),
    ...(seo.faq ?? []).flatMap((item) => [item.question, item.answer])
  ].filter((value): value is string => Boolean(value?.trim()));

  return parts
    .join(' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function manifestRouteIsExplicitlyStrong(
  entry: SeoScholarshipRouteManifestEntry | null | undefined
): boolean {
  if (!entry) return false;
  return (
    entry.indexable === true &&
    entry.noindexNow !== true &&
    entry.qualityBucket === 'GOOD' &&
    !(entry.reasonCodes ?? []).includes('dynamic_route')
  );
}

export function classifyScholarshipSeoRouteFamily({
  canonicalPath,
  entry,
  routeFamily
}: Pick<
  ScholarshipSeoRouteQualityFacts,
  'canonicalPath' | 'entry' | 'routeFamily'
>): ScholarshipSeoRouteFamily {
  if (routeFamily) return routeFamily;

  const parts = splitCanonicalScholarshipSeoPath(canonicalPath);
  const first = parts[0];

  if (manifestRouteIsExplicitlyStrong(entry)) {
    return parts.length <= 1 ? 'manifest_single' : 'manifest_combo';
  }

  if (parts.length === 1 && first && US_STATE_SEO_SLUGS.has(first)) {
    return 'dynamic_state';
  }

  if (parts.length === 2 && first && US_STATE_SEO_SLUGS.has(first)) {
    return 'dynamic_state_topic';
  }

  if (parts.length === 3 && first && US_STATE_SEO_SLUGS.has(first)) {
    return 'dynamic_state_degree_topic';
  }

  if (parts.length === 1 && first && LONG_TAIL_SLUG_SET.has(first)) {
    return 'legacy_long_tail';
  }

  return 'dynamic_filter';
}

function weakRouteDecision(
  routeFamily: ScholarshipSeoRouteFamily,
  reasonCodes: string[]
): ScholarshipSeoRouteQualityDecision {
  return {
    shouldIndex: false,
    shouldIncludeInSitemap: false,
    shouldBeRssEligible: false,
    indexable: false,
    includeInSitemap: false,
    rssEligible: false,
    qualityTier: 'weak',
    routeFamily,
    reasonCodes
  };
}

export function getScholarshipSeoRouteQualityPolicy(
  facts: ScholarshipSeoRouteQualityFacts
): ScholarshipSeoRouteQualityDecision {
  const routeFamily = classifyScholarshipSeoRouteFamily(facts);
  const reasonCodes: string[] = [];
  const entry = facts.entry ?? null;
  const parts = splitCanonicalScholarshipSeoPath(facts.canonicalPath);
  const seoBundleWords = countSeoBundleWords(facts.seoContent);

  if (facts.stablePublicRoute === false)
    reasonCodes.push('unstable_public_route');
  if (facts.routeResolves === false) reasonCodes.push('route_does_not_resolve');
  if (facts.hasQueryParams === true)
    reasonCodes.push('query_params_define_page');
  if (parts.length === 0) reasonCodes.push('missing_canonical_path');

  if (reasonCodes.length > 0) {
    return weakRouteDecision(routeFamily, reasonCodes);
  }

  if (routeFamily === 'country_seo' || routeFamily === 'cross_country_seo') {
    return {
      shouldIndex: true,
      shouldIncludeInSitemap: true,
      shouldBeRssEligible: false,
      indexable: true,
      includeInSitemap: true,
      rssEligible: false,
      qualityTier: 'strong',
      routeFamily,
      reasonCodes: ['approved_specialized_scholarship_seo_route']
    };
  }

  if (
    routeFamily === 'university_hub' ||
    routeFamily === 'scholarship_detail'
  ) {
    return {
      shouldIndex: true,
      shouldIncludeInSitemap: true,
      shouldBeRssEligible: false,
      indexable: true,
      includeInSitemap: true,
      rssEligible: false,
      qualityTier: 'medium',
      routeFamily,
      reasonCodes: ['handled_by_dedicated_route_quality_policy']
    };
  }

  if (manifestRouteIsExplicitlyStrong(entry)) {
    const count =
      entry?.scholarshipsCount ?? entry?.minCountSnapshot ?? seoBundleWords;
    if (count <= 3) {
      return weakRouteDecision(routeFamily, [
        'manifest_route_below_sitemap_result_threshold'
      ]);
    }
    return {
      shouldIndex: true,
      shouldIncludeInSitemap: true,
      shouldBeRssEligible: true,
      indexable: true,
      includeInSitemap: true,
      rssEligible: true,
      qualityTier: 'strong',
      routeFamily,
      reasonCodes: ['manifest_good_route']
    };
  }

  if (routeFamily === 'legacy_long_tail') {
    const slug = parts[0] ?? '';
    if (!LEGACY_LONG_TAIL_SITEMAP_SLUGS.has(slug)) {
      return weakRouteDecision(routeFamily, [
        'legacy_long_tail_not_promoted_for_sitemap'
      ]);
    }
    const minimumWords = PRIORITY_LOW_COMPETITION_LONG_TAIL_SLUGS.has(slug)
      ? 120
      : 1200;
    if (seoBundleWords < minimumWords) {
      return weakRouteDecision(routeFamily, [
        'legacy_long_tail_below_visible_content_threshold'
      ]);
    }
    if (PRIORITY_LOW_COMPETITION_LONG_TAIL_SLUGS.has(slug)) {
      return {
        shouldIndex: true,
        shouldIncludeInSitemap: true,
        shouldBeRssEligible: true,
        indexable: true,
        includeInSitemap: true,
        rssEligible: true,
        qualityTier: 'strong',
        routeFamily,
        reasonCodes: ['priority_legacy_long_tail_route']
      };
    }
  }

  if (
    routeFamily === 'dynamic_state' ||
    routeFamily === 'dynamic_state_topic' ||
    routeFamily === 'dynamic_state_degree_topic' ||
    routeFamily === 'dynamic_filter'
  ) {
    return weakRouteDecision(routeFamily, [
      ...(entry?.reasonCodes ?? []).filter(Boolean),
      'dynamic_scholarship_filter_route_requires_explicit_quality_approval'
    ]);
  }

  return weakRouteDecision(routeFamily, [
    'scholarship_route_failed_quality_policy'
  ]);
}
