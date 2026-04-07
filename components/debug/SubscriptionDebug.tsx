'use client';

import { Settings, Terminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/client';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
type ProfilesUpdate = Database['public']['Tables']['profiles']['Update'];

type DebugPlan = 'free' | 'trial' | 'monthly_pro' | 'quarterly_pro' | 'yearly_pro';

const PLAN_OPTIONS: Array<{ value: DebugPlan; label: string }> = [
  { value: 'free', label: 'free' },
  { value: 'trial', label: 'trial' },
  { value: 'monthly_pro', label: 'monthly_pro' },
  { value: 'quarterly_pro', label: 'quarterly_pro' },
  { value: 'yearly_pro', label: 'yearly_pro' }
];

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}

export default function SubscriptionDebug() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DebugPlan>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const loadProfile = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_debug_plan')
        .eq('id', user.id)
        .maybeSingle();

      const profile = profileRow as
        | Pick<ProfilesRow, 'subscription_plan' | 'subscription_debug_plan'>
        | null;

      const plan = profile?.subscription_debug_plan ?? profile?.subscription_plan ?? 'free';
      if (
        plan === 'free' ||
        plan === 'trial' ||
        plan === 'monthly_pro' ||
        plan === 'quarterly_pro' ||
        plan === 'yearly_pro'
      ) {
        setSelectedPlan(plan);
      }

      setIsLoading(false);
    };

    void loadProfile();
  }, [supabase]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const updateProfileDebug = async (
    patch: Partial<{
      subscription_debug_plan: DebugPlan | null;
      subscription_debug_status: string | null;
      subscription_debug_trial_ends_at: string | null;
      subscription_debug_renews_at: string | null;
      subscription_debug_now: string | null;
    }>
  ) => {
    if (!userId) {
      setMessage('Sign in to use subscription debug.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    // `createBrowserClient<Database>()` can infer `from('profiles').update` as `never` here; runtime is valid.
    const { error } = await (
      supabase.from('profiles') as unknown as {
        update: (values: ProfilesUpdate) => {
          eq: (
            col: string,
            val: string
          ) => PromiseLike<{ error: { message: string } | null }>;
        };
      }
    )
      .update(patch as ProfilesUpdate)
      .eq('id', userId);

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Updated.');
    router.refresh();
  };

  const handleApplyPlan = async () => {
    const now = new Date();

    if (selectedPlan === 'free') {
      await updateProfileDebug({
        subscription_debug_plan: 'free',
        subscription_debug_status: 'expired',
        subscription_debug_trial_ends_at: null,
        subscription_debug_renews_at: null,
        subscription_debug_now: null
      });
      return;
    }

    if (selectedPlan === 'trial') {
      await updateProfileDebug({
        subscription_debug_plan: 'trial',
        subscription_debug_status: 'on_trial',
        subscription_debug_trial_ends_at: addDays(now, 3),
        subscription_debug_renews_at: null,
        subscription_debug_now: null
      });
      return;
    }

    const renewsAt =
      selectedPlan === 'monthly_pro'
        ? addDays(now, 30)
        : selectedPlan === 'quarterly_pro'
          ? addDays(now, 90)
          : addDays(now, 365);

    await updateProfileDebug({
      subscription_debug_plan: selectedPlan,
      subscription_debug_status: 'active',
      subscription_debug_trial_ends_at: null,
      subscription_debug_renews_at: renewsAt,
      subscription_debug_now: null
    });
  };

  const handleTrial3Days = async () => {
    setSelectedPlan('trial');
    await updateProfileDebug({
      subscription_debug_plan: 'trial',
      subscription_debug_status: 'on_trial',
      subscription_debug_trial_ends_at: addDays(new Date(), 3),
      subscription_debug_renews_at: null,
      subscription_debug_now: null
    });
  };

  const handleTrialExpired = async () => {
    setSelectedPlan('trial');
    await updateProfileDebug({
      subscription_debug_plan: 'trial',
      subscription_debug_status: 'on_trial',
      subscription_debug_trial_ends_at: addHours(new Date(), -1),
      subscription_debug_renews_at: null,
      subscription_debug_now: null
    });
  };

  const handleResetDebug = async () => {
    await updateProfileDebug({
      subscription_debug_plan: null,
      subscription_debug_status: null,
      subscription_debug_trial_ends_at: null,
      subscription_debug_renews_at: null,
      subscription_debug_now: null
    });
  };

  if (!userId && !isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[320px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Settings className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Subscription Debug</p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Terminal className="h-3.5 w-3.5" aria-hidden />
            Development only
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          subscription_plan
        </label>
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value as DebugPlan)}
          disabled={isLoading || isSaving}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
        >
          {PLAN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleApplyPlan}
          disabled={isLoading || isSaving}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Applying...' : 'Apply Debug Plan'}
        </button>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleTrial3Days}
            disabled={isLoading || isSaving}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Set Trial: 3 Days
          </button>
          <button
            type="button"
            onClick={handleTrialExpired}
            disabled={isLoading || isSaving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Set Trial: Expired
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetDebug}
          disabled={isLoading || isSaving}
          className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset Debug
        </button>

        {message ? <p className="text-xs font-medium text-slate-500">{message}</p> : null}
      </div>
    </div>
  );
}
