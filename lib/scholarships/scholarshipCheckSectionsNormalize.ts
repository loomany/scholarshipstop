import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { isScholarshipPlaceholderText } from '@/lib/scholarships/scholarshipSeoSanitizers';

/** Low-signal structured repeats — hide from “missing” before normalization (not payout). */
const SUPPRESSED_AI_MISSING_PHRASES = new Set(['provider url']);

export function filterRawAiMissingInfoLines(
  items: string[] | null | undefined
): string[] {
  return (items ?? [])
    .map((s) => String(s).trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !SUPPRESSED_AI_MISSING_PHRASES.has(s.toLowerCase()) &&
        !isScholarshipPlaceholderText(s)
    );
}

export type ScholarshipCheckSectionsInput = {
  importantChecks: string[];
  missingOrUnclear: string[];
  redFlags: string[];
};

export type NormalizedScholarshipCheckSections = {
  importantChecks: string[];
  detailsToConfirm: string[];
  redFlags: string[];
};

/** Canonical soft prompts when payout/disbursement wording was only “missing / unclear”. */
export const SCHOLARSHIP_PAYOUT_DETAILS_TO_CONFIRM: readonly string[] = [
  'How the award is paid',
  'Whether the scholarship is paid to you or directly to your school'
] as const;

function dedupeCaseInsensitive(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * True when the line signals a serious concern that must stay in Red flags
 * (fees, scams, verification, unsafe asks — not “payout wording absent”).
 */
export function isSeriousScholarshipRiskFlag(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return false;

  const needles = [
    'application fee',
    'fee required',
    'processing fee',
    'pay to apply',
    'payment to apply',
    'pay for application',
    'asks for payment',
    'upfront fee',
    'bank details before',
    'banking details before',
    'bank account before',
    'banking information before',
    'before you receive the award',
    'unverified provider',
    'no official application',
    'official application page',
    'cannot be verified',
    'source cannot be verified',
    'scholarship source cannot',
    'suspicious provider',
    'suspicious contact',
    'misleading award',
    'misleading information',
    'inconsistent award',
    'wire transfer before',
    'gift card',
    'western union',
    'moneygram'
  ];
  if (needles.some((n) => t.includes(n))) return true;

  if (/\bno\s+official\s+application\b/.test(t)) return true;
  if (/\bno\s+provider\s+contact\b/.test(t)) return true;

  return false;
}

/**
 * Listing-only uncertainty about how/whether funds are paid — not a scam signal.
 * Returns false when {@link isSeriousScholarshipRiskFlag} matches.
 */
export function isPayoutMethodUnclearFlag(text: string): boolean {
  if (isSeriousScholarshipRiskFlag(text)) return false;
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return false;

  const exactFragments = [
    'payout method is not stated',
    'payout method not stated',
    'payout method was not stated',
    'specific payout method details',
    'award payment method unclear',
    'payment method is unclear',
    'payment method unclear',
    'how the award is paid',
    'whether the scholarship is paid to you or directly to your school',
    'whether funds are paid directly or to the school',
    'paid to you or directly to your school',
    'disbursement method not stated',
    'disbursement details unclear',
    'how funds are disbursed',
    'tuition payment method unclear'
  ];
  if (exactFragments.some((f) => t === f || t.includes(f))) return true;

  const payoutLex =
    /\b(payout|disbursement|award\s+payment|payment\s+method|how\s+(the\s+)?award|how\s+funds|paid\s+to\s+(your\s+)?school|directly\s+to\s+(the\s+)?school|sent\s+to\s+(the\s+)?school)\b/i.test(
      text
    );

  const unclearLex =
    /\b(not\s+stated|not\s+specified|unspecified|unclear|missing|unknown|no\s+details|without\s+details|not\s+provided|not\s+listed|not\s+mentioned)\b/i.test(
      t
    );

  if (payoutLex && unclearLex) return true;

  if (
    /\bpayout\b/i.test(text) &&
    /\b(method|details?|information)\b/i.test(text) &&
    unclearLex
  ) {
    return true;
  }

  return false;
}

/** Shorten scary / redundant AI phrasing for Important checks (Quick decision + Before you apply). */
export function softenImportantCheckLine(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const lower = t.toLowerCase();
  if (
    lower.includes('background criteria') ||
    lower.includes('meet the background') ||
    (lower.includes('ensure you meet') &&
      lower.includes('criteria') &&
      lower.includes('before'))
  ) {
    return 'Ensure you meet the eligibility criteria before applying.';
  }
  return t;
}

export function normalizeScholarshipCheckSections(
  input: ScholarshipCheckSectionsInput
): NormalizedScholarshipCheckSections {
  const importantChecks = dedupeCaseInsensitive(
    (input.importantChecks ?? []).map((x) =>
      softenImportantCheckLine(String(x))
    )
  );

  const keptRed: string[] = [];
  let payoutClarificationNeeded = false;

  for (const raw of input.redFlags ?? []) {
    const line = String(raw).trim();
    if (!line) continue;
    if (isSeriousScholarshipRiskFlag(line)) {
      keptRed.push(line);
      continue;
    }
    if (isPayoutMethodUnclearFlag(line)) {
      payoutClarificationNeeded = true;
      continue;
    }
    keptRed.push(line);
  }

  const keptMissing: string[] = [];
  for (const raw of input.missingOrUnclear ?? []) {
    const line = String(raw).trim();
    if (!line) continue;
    if (isSeriousScholarshipRiskFlag(line)) {
      keptRed.push(line);
      continue;
    }
    if (isPayoutMethodUnclearFlag(line)) {
      payoutClarificationNeeded = true;
      continue;
    }
    keptMissing.push(line);
  }

  const payoutHints = [...SCHOLARSHIP_PAYOUT_DETAILS_TO_CONFIRM];
  const detailsToConfirm = dedupeCaseInsensitive([
    ...keptMissing,
    ...(payoutClarificationNeeded ? payoutHints : [])
  ]);

  return {
    importantChecks,
    detailsToConfirm,
    redFlags: dedupeCaseInsensitive(keptRed)
  };
}

export function getNormalizedBeforeYouApplySections(
  s: Pick<Scholarship, 'aiImportantChecks' | 'aiMissingInfo' | 'aiRedFlags'>
): NormalizedScholarshipCheckSections {
  const rawMissing = filterRawAiMissingInfoLines(s.aiMissingInfo);

  return normalizeScholarshipCheckSections({
    importantChecks: s.aiImportantChecks ?? [],
    missingOrUnclear: rawMissing,
    redFlags: s.aiRedFlags ?? []
  });
}
