import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';

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
      label: 'Verified official source',
      shortLabel: 'Verified',
      description:
        'ScholarshipTop has an official-source destination for this listing. Confirm final rules on the provider page before applying.'
    };
  }

  if (hasOfficialDestination) {
    return {
      code: 'official_source_available',
      label: 'Official source available',
      shortLabel: 'Source available',
      description:
        'An official application or provider destination is available. Review that page for final eligibility, deadline, and submission rules.'
    };
  }

  if (hasNamedSource) {
    return {
      code: 'needs_confirmation',
      label: 'Needs confirmation',
      shortLabel: 'Needs check',
      description:
        'A source or sponsor is listed, but the final official application route should be confirmed before applying.'
    };
  }

  return {
    code: 'source_unclear',
    label: 'Source unclear',
    shortLabel: 'Source unclear',
    description:
      'The official source is not clear from current catalog data. Treat this as a lead and verify the provider before sharing personal information.'
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
    !deadlineText || (deadlineText.length <= 3 && !/[A-Za-z0-9]/.test(deadlineText));
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
    hasText(s.payoutMethod) ||
    hasAnyText([s.paymentDetails, s.winnerPayment]);

  if (!hasDeadline) {
    flags.push({
      key: 'deadline_unclear',
      label: 'Deadline unclear',
      description: 'Confirm the final deadline and timezone on the provider page.'
    });
  }
  if (!hasAward) {
    flags.push({
      key: 'award_unclear',
      label: 'Award amount unclear',
      description: 'Confirm the award value and whether the amount is renewable.'
    });
  }
  if (!hasEligibility) {
    flags.push({
      key: 'eligibility_incomplete',
      label: 'Eligibility incomplete',
      description: 'Confirm citizenship, level, field, GPA, and location rules before applying.'
    });
  }
  if (!hasDocs) {
    flags.push({
      key: 'documents_unclear',
      label: 'Required documents unclear',
      description: 'Check whether essays, transcripts, recommendations, or forms are required.'
    });
  }
  if (!payoutKnown) {
    flags.push({
      key: 'payout_unclear',
      label: 'Payout method unclear',
      description: 'Confirm whether funds go to the student, school, or another approved recipient.'
    });
  }
  if (!s.recurring && !hasText(s.scholarshipStatus)) {
    flags.push({
      key: 'renewal_unclear',
      label: 'Renewal status unclear',
      description: 'Confirm whether this is one-time, renewable, annual, or tied to a future cycle.'
    });
  }

  for (const item of s.aiMissingInfo ?? []) {
    const text = item.trim();
    if (!text) continue;
    const key = `ai_missing_${text.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    if (flags.some((flag) => flag.key === key)) continue;
    flags.push({
      key,
      label: text,
      description: 'ScholarshipTop could not confirm this detail from current listing data.'
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
        'Difficulty comes from ScholarshipTop structured application signals. Confirm final tasks on the official source.'
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
  const namedDocs = s.documentsRequired?.filter((item) => item.trim()).length ?? 0;
  const explicitReqCount =
    typeof s.requirementsCount === 'number' && !Number.isNaN(s.requirementsCount)
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
        'The application workload is not clear from current listing data. Check required materials on the provider page.'
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
      'Current structured data shows few required materials, but the official source still controls the final application tasks.'
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
        'This listing may reopen or repeat. Confirm the current cycle on the official source.',
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
      label: 'Check source',
      description:
        'ScholarshipTop does not have a trustworthy calendar deadline for this listing yet.',
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
        'The catalog deadline appears to have passed. Check whether the provider has reopened a new cycle.',
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
      'The deadline is not immediate, but final timing and timezone should still be confirmed on the official source.',
    daysLeft
  };
}

export function getScholarshipBestForLabel(
  s: Pick<
    Scholarship,
    | 'aiBestFor'
    | 'studyLevels'
    | 'fieldOfStudy'
    | 'internationalFriendlyListing'
    | 'applicantCountryCodes'
  >
): string {
  const ai = s.aiBestFor?.map((item) => item.trim()).find(Boolean);
  if (ai) return ai;
  const field = s.fieldOfStudy?.map((item) => item.trim()).find(Boolean);
  if (field) return `${field} students`;
  const level = s.studyLevels?.map((item) => item.trim()).find(Boolean);
  if (level) return `${level} students`;
  if (s.internationalFriendlyListing === true) return 'International students';
  if ((s.applicantCountryCodes?.length ?? 0) > 0) {
    return 'Students matching country rules';
  }
  return 'Students who match the official eligibility rules';
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
    return 'This listing has partial details. Confirm the final deadline, eligibility rules, award value, and application steps on the official source before applying.';
  }

  const bestFor = getScholarshipBestForLabel(s);
  const deadline = s.deadline?.trim();
  const amount = hasAwardContent ? awardDisplay : null;
  if (amount && deadline) {
    return `${bestFor} can compare this scholarship with a listed award of ${amount} and a ${deadline} deadline. Confirm eligibility and required materials before applying.`;
  }
  if (deadline) {
    return `${bestFor} should review this scholarship early because the deadline is listed as ${deadline}. Confirm the official application path before applying.`;
  }
  if (amount) {
    return `${bestFor} can use this listing as a funding lead with a listed award of ${amount}. Check the provider page for final rules and timing.`;
  }

  const fallback =
    s.summaryShort?.trim() ||
    s.seoExcerpt?.trim() ||
    s.description?.trim();
  if (fallback) {
    return fallback.length > 220 ? `${fallback.slice(0, 217).trim()}...` : fallback;
  }

  return `${bestFor} should confirm eligibility, deadline, award amount, and application steps on the official source before applying.`;
}

export function meaningfulScholarshipFactCount(
  s: Pick<
    Scholarship,
    | 'deadline'
    | 'deadlineAt'
    | 'amount'
    | 'awardAmount'
    | 'provider'
    | 'providerUrl'
    | 'listingUrl'
    | 'applyLink'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'documentsRequired'
    | 'studyLevels'
    | 'fieldOfStudy'
    | 'hostCountryCodes'
    | 'applicantCountryCodes'
  >
): number {
  const scalarFacts = [
    hasAnyText([s.deadline, s.deadlineAt]),
    hasAnyText([s.amount, s.awardAmount]),
    hasAnyText([s.provider, s.providerUrl, s.listingUrl, s.applyLink]),
    hasAnyText([s.whoCanApplyText, s.eligibilityText])
  ].filter(Boolean).length;
  return (
    scalarFacts +
    nonEmptyCount([
      s.eligibility,
      s.documentsRequired,
      s.studyLevels,
      s.fieldOfStudy,
      s.hostCountryCodes,
      s.applicantCountryCodes
    ])
  );
}

export function getScholarshipDetailIndexPolicy(
  s: Scholarship
): ScholarshipDetailIndexPolicy {
  const sourceStatus = getScholarshipSourceStatus(s);
  const missingDataFlags = getScholarshipMissingDataFlags(s);
  const meaningfulFactCount = meaningfulScholarshipFactCount(s);
  const hasOriginalSummary = hasAnyText([
    s.aiStudentSummary,
    s.summaryShort,
    s.summaryLong,
    s.seoExcerpt,
    s.seoOverview
  ]);
  const reasonCodes: string[] = [];

  if (s.isIndexable === false) reasonCodes.push('explicit_noindex');
  if (
    sourceStatus.code === 'source_unclear' ||
    sourceStatus.code === 'needs_confirmation'
  ) {
    reasonCodes.push('source_needs_confirmation');
  }
  if (!hasOriginalSummary) reasonCodes.push('missing_original_summary');
  if (meaningfulFactCount < 3) reasonCodes.push('low_fact_count');
  if (missingDataFlags.length >= 5) reasonCodes.push('many_missing_fields');

  return {
    indexable:
      s.isIndexable !== false &&
      hasOriginalSummary &&
      meaningfulFactCount >= 3 &&
      sourceStatus.code !== 'source_unclear',
    reasonCodes,
    meaningfulFactCount,
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
