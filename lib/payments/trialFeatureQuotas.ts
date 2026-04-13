import type { Tables } from '@/types_db';
import {
  deriveSubscriptionPresentation,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';

type Profile = Tables<'profiles'>;

/** AI authenticity check + full-draft humanize during 3-day trial. */
export const TRIAL_FEATURE_LIMIT = 2;
/** Mentor chat: one `essay_chats` dialogue (POST /api/interviewer init) per trial. */
export const TRIAL_CHAT_DIALOGUE_LIMIT = 1;

export type TrialQuotaKind = 'chat' | 'ai_check' | 'humanize_draft';

export function shouldApplyTrialFeatureQuotas(
  profile: Profile | null,
  subscription: SubscriptionWithPriceAndProduct | null
): boolean {
  const p = deriveSubscriptionPresentation(profile, subscription);
  return p.plan === 'trial' && p.isSubscribed;
}

export type TrialFeatureQuotaSnapshot = {
  applies: boolean;
  chatRemaining: number;
  aiRemaining: number;
  humanizeRemaining: number;
};

export function trialQuotaSnapshotFromProfile(
  profile: Profile | null,
  applies: boolean
): TrialFeatureQuotaSnapshot | null {
  if (!applies || !profile) return null;
  const chatUsed = profile.trial_quota_chat_turns_used ?? 0;
  const aiUsed = profile.trial_quota_ai_check_used ?? 0;
  const humUsed = profile.trial_quota_humanize_draft_used ?? 0;
  return {
    applies: true,
    chatRemaining: Math.max(0, TRIAL_CHAT_DIALOGUE_LIMIT - chatUsed),
    aiRemaining: Math.max(0, TRIAL_FEATURE_LIMIT - aiUsed),
    humanizeRemaining: Math.max(0, TRIAL_FEATURE_LIMIT - humUsed)
  };
}

export function trialQuotasAllExhausted(s: TrialFeatureQuotaSnapshot): boolean {
  return (
    s.chatRemaining <= 0 && s.aiRemaining <= 0 && s.humanizeRemaining <= 0
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export async function trialReserveQuota(
  supabase: Sb,
  kind: TrialQuotaKind
): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc('trial_reserve_quota', {
    p_kind: kind
  });
  if (error) {
    console.error('[trialReserveQuota]', error.message);
    return { ok: false };
  }
  const row = data as { ok?: boolean } | null;
  return { ok: Boolean(row?.ok) };
}

export async function trialReleaseQuota(
  supabase: Sb,
  kind: TrialQuotaKind
): Promise<void> {
  const { error } = await supabase.rpc('trial_release_quota', { p_kind: kind });
  if (error) {
    console.error('[trialReleaseQuota]', error.message);
  }
}
