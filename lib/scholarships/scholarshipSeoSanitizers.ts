import type { Scholarship } from '@/app/scholarships/scholarshipsData';

type FaqLike = {
  question: string;
  answer: string;
};

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /scholarshiptop could not structure this detail from current listing data/i,
  /\bcould not structure this detail\b/i
];

const GENERIC_FAQ_PATTERNS: RegExp[] = [
  /review the eligibility section/i,
  /review\s+the\s+(official\s+)?listing\s+requirements\s+carefully/i,
  /apply only if your profile matches/i,
  /check the official (website|scholarship page)/i,
  /review the official (website|scholarship page)/i,
  /see the official (website|scholarship page) for full details/i,
  /use the provider application link/i,
  /locate\s+the\s+official\s+.*\s+application/i,
  /use\s+the\s+listed\s+deadline\s+as\s+guidance/i,
  /always\s+confirm\s+.*\s+official\s+scholarship\s+page/i,
  /prepare (all )?(required )?(your )?documents/i,
  /follow\s+the\s+official\s+application\s+steps/i,
  /submit\s+through\s+the\s+verified\s+program\s+link/i,
  /track the deadline/i,
  /final checks/i
];

const GENERIC_QUESTION_PATTERNS: RegExp[] = [
  /^should i apply/i,
  /^how do i apply/i,
  /^what should i do next/i,
  /^where can i find more information/i
];

const GENERIC_APPLICATION_TEXT_PATTERNS: RegExp[] = [
  /\bto\s+apply,\s*students\s+should\s+locate\s+the\s+official\b/i,
  /\blocated?\s+the\s+official\s+.*\s+application\b/i,
  /\bprepare\s+all\s+required\s+documents\s+in\s+advance\b/i,
  /\bfollow\s+the\s+official\s+application\s+steps\b/i,
  /\bsubmit\s+through\s+the\s+verified\s+program\s+link\b/i,
  /\breview\s+the\s+eligibility\s+section\s+and\s+official\s+listing\s+requirements\b/i,
  /\buse\s+the\s+listed\s+deadline\s+as\s+guidance\b/i,
  /\balways\s+confirm\s+the\s+exact\s+final\s+date\b/i
];

export function isScholarshipPlaceholderText(
  value: string | null | undefined
): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return false;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function cleanScholarshipGeneratedText<
  T extends string | null | undefined
>(value: T): string | null {
  if (!value) {
    return null;
  }
  const cleaned = String(value).replace(/\s+/g, ' ').trim();
  if (!cleaned || isScholarshipPlaceholderText(cleaned)) {
    return null;
  }
  return cleaned;
}

export function cleanScholarshipStringArray(
  values: string[] | null | undefined
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const value of values) {
    const text = cleanScholarshipGeneratedText(value);
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cleaned.push(text);
  }
  return cleaned;
}

export function isGenericScholarshipFaqItem(
  question: string,
  answer: string
): boolean {
  const normalizedQuestion = question.replace(/\s+/g, ' ').trim();
  const normalizedAnswer = answer.replace(/\s+/g, ' ').trim();
  if (!normalizedQuestion || !normalizedAnswer) {
    return true;
  }
  if (
    isScholarshipPlaceholderText(normalizedQuestion) ||
    isScholarshipPlaceholderText(normalizedAnswer)
  ) {
    return true;
  }
  if (
    GENERIC_QUESTION_PATTERNS.some((pattern) =>
      pattern.test(normalizedQuestion)
    )
  ) {
    return true;
  }
  return GENERIC_FAQ_PATTERNS.some((pattern) => pattern.test(normalizedAnswer));
}

export function isGenericScholarshipApplicationText(
  value: string | null | undefined
): boolean {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) return true;
  if (isScholarshipPlaceholderText(normalized)) return true;
  return GENERIC_APPLICATION_TEXT_PATTERNS.some((pattern) =>
    pattern.test(normalized)
  );
}

export function cleanScholarshipFaqItems(
  items: FaqLike[] | null | undefined
): FaqLike[] {
  if (!Array.isArray(items)) {
    return [];
  }
  const seen = new Set<string>();
  const cleaned: FaqLike[] = [];
  for (const item of items) {
    const question = cleanScholarshipGeneratedText(item?.question);
    const answer = cleanScholarshipGeneratedText(item?.answer);
    if (!question || !answer || isGenericScholarshipFaqItem(question, answer)) {
      continue;
    }
    const key = `${question.toLowerCase()}::${answer.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cleaned.push({ question, answer });
  }
  return cleaned;
}

export function scholarshipHasProviderFact(
  scholarship: Pick<Scholarship, 'provider' | 'providerSlug'>
): boolean {
  return Boolean(
    (scholarship.provider && scholarship.provider.trim().length >= 2) ||
    (scholarship.providerSlug && scholarship.providerSlug.trim().length >= 2)
  );
}
