import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { isSubscriptionLockedScholarship } from '@/lib/scholarships/subscriptionLockedCategory';

export function isLikelyProviderName(value: string | null | undefined): value is string {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  if (!normalized) return false;
  if (normalized.length > 120) return false;
  if (normalized.split(/\s+/).length > 14) return false;
  if (/[.!?]\s/.test(normalized) || /[•:]/.test(normalized)) return false;
  return true;
}

/**
 * Same rule as `ScholarshipCard` `targetedCategoryLocked` when the parent passes
 * `subscriptionLocked={catalogFreeTier}` (`authResolved && !hasSubscription` on listings).
 */
export function resolveScholarshipTargetedCategoryLocked(args: {
  subscriptionLockedCatalog: boolean;
  hasSubscription: boolean;
  scholarship: Scholarship;
}): boolean {
  if (args.hasSubscription) return false;
  return (
    args.subscriptionLockedCatalog ||
    isSubscriptionLockedScholarship(args.scholarship)
  );
}

export function resolveScholarshipProviderNameLocked(args: {
  hasSubscription: boolean;
  providerRaw: string | null | undefined;
}): boolean {
  if (args.hasSubscription) return false;
  const trimmed = args.providerRaw?.trim();
  if (!trimmed || !isLikelyProviderName(trimmed)) return false;
  return true;
}
