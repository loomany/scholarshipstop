import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';
import { isInternationalFriendlyScholarship } from '@/lib/scholarships/internationalFriendly';

export const SUBSCRIPTION_LOCKED_EASY_APPLY_IDS = new Set([
  'no_essay',
  'easy_apply',
  'quick_apply'
]);

export const SUBSCRIPTION_LOCKED_CITIZENSHIP_AUDIENCE = 'international_friendly';

const TITLE_TOKEN_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'apply',
  'award',
  'club',
  'college',
  'education',
  'foundation',
  'for',
  'from',
  'fund',
  'grant',
  'in',
  'inc',
  'institute',
  'international',
  'legacy',
  'llc',
  'memorial',
  'of',
  'program',
  'scholarship',
  'society',
  'students',
  'the',
  'trust',
  'university'
]);

function normalizeWord(raw: string): string {
  return raw.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').trim();
}

function titleIncludesToken(title: string, token: string): boolean {
  if (!title || !token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(title);
}

export function isSubscriptionLockedEasyApplyId(id: string | null | undefined): boolean {
  const normalized = id?.trim().toLowerCase() ?? '';
  return SUBSCRIPTION_LOCKED_EASY_APPLY_IDS.has(normalized);
}

export function isSubscriptionLockedScholarship(scholarship: Scholarship): boolean {
  const catalog = getScholarshipCatalog(scholarship);
  if (
    catalog.easyApplyIds.some((id) => isSubscriptionLockedEasyApplyId(id))
  ) {
    return true;
  }
  return isInternationalFriendlyScholarship(scholarship);
}

export function pickScholarshipLockedTitleBlurPhrase(
  title: string,
  provider?: string | null
): string | null {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return null;

  const providerTokens = (provider ?? '')
    .split(/\s+/)
    .map(normalizeWord)
    .filter((token) => {
      if (token.length < 4) return false;
      return !TITLE_TOKEN_STOP_WORDS.has(token.toLowerCase());
    })
    .sort((a, b) => b.length - a.length);

  for (const token of providerTokens) {
    if (titleIncludesToken(normalizedTitle, token)) return token;
  }

  const titleTokens = normalizedTitle
    .split(/\s+/)
    .map(normalizeWord)
    .filter((token) => {
      if (token.length < 5) return false;
      return !TITLE_TOKEN_STOP_WORDS.has(token.toLowerCase());
    });

  return titleTokens[0] ?? null;
}
