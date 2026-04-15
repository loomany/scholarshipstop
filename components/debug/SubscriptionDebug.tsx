'use client';

import { Settings, Terminal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/client';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

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
  const [open, setOpen] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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

    try {
      const res = await fetch('/api/internal/subscription-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        credentials: 'same-origin'
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setMessage('Updated.');
      window.dispatchEvent(new Event('subscription-debug-updated'));
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setIsSaving(false);
    }
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
    <>
      {/* Overlay */}
      <div
        role="presentation"
        aria-hidden={!open}
        className={`fixed inset-0 z-[9998] bg-black/40 transition-opacity duration-300 ease-out ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        id="subscription-debug-drawer"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[9999] flex flex-col bg-white shadow-2xl transition-[width,opacity,transform] duration-300 ease-out ${
          open
            ? 'w-[min(80%,350px)] max-w-full translate-x-0 border-l border-slate-200 opacity-100'
            : 'pointer-events-none w-0 max-w-0 translate-x-0 overflow-hidden border-0 opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Settings className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Subscription Debug</p>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Development only
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close subscription debug"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
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

            <div className="grid gap-2 sm:grid-cols-1">
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

            {message ? (
              <p
                className={`text-xs font-medium ${
                  message.startsWith('Updated') ? 'text-emerald-700' : 'text-red-600'
                }`}
                role="status"
              >
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      {/* FAB — above overlay/drawer */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-4 z-[10000] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-800/50 text-white shadow-lg backdrop-blur-md transition hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
        aria-label={open ? 'Close subscription debug' : 'Open subscription debug'}
        aria-expanded={open}
        aria-controls="subscription-debug-drawer"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </button>
    </>
  );
}
