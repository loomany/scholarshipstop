'use client';

import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { GRANT_NOTIFY_CHANNELS } from '@/lib/notifications/grantNotificationPrefs';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getAccountProfileUiCopy } from '@/lib/i18n/accountProfileUiCopy';
import type { Database } from '@/types_db';

type Prefs = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'email_notify_best_matches'
  | 'email_notify_saved_filters'
  | 'email_notify_easy_apply'
  | 'email_notify_hot_deadlines'
>;

const PREVIEW_TEST_EMAIL = 'loomany.self@gmail.com';
const SHOW_TELEGRAM_BOT_CARD = false;

export default function GrantNotificationToggles({
  profile,
  userEmail,
  disabled,
  uiLocale = 'en'
}: {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  userEmail?: string | null;
  disabled?: boolean;
  uiLocale?: LocalizedUiLocale;
}) {
  const notifyUi = getAccountProfileUiCopy(uiLocale).grantNotify;
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    email_notify_best_matches: profile?.email_notify_best_matches ?? true,
    email_notify_saved_filters: profile?.email_notify_saved_filters ?? true,
    email_notify_easy_apply: profile?.email_notify_easy_apply ?? true,
    email_notify_hot_deadlines: profile?.email_notify_hot_deadlines ?? true
  }));

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [testState, setTestState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');

  useEffect(() => {
    setPrefs({
      email_notify_best_matches: profile?.email_notify_best_matches ?? true,
      email_notify_saved_filters: profile?.email_notify_saved_filters ?? true,
      email_notify_easy_apply: profile?.email_notify_easy_apply ?? true,
      email_notify_hot_deadlines: profile?.email_notify_hot_deadlines ?? true
    });
  }, [
    profile?.email_notify_best_matches,
    profile?.email_notify_saved_filters,
    profile?.email_notify_easy_apply,
    profile?.email_notify_hot_deadlines
  ]);

  const toggle = useCallback(
    async (column: keyof Prefs) => {
      if (disabled || pendingKey) return;
      const next = !prefs[column];
      setPendingKey(column);
      const prev = prefs[column];
      setPrefs((p) => ({ ...p, [column]: next }));
      try {
        const res = await fetch('/api/account/notification-preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [column]: next })
        });
        if (!res.ok) {
          setPrefs((p) => ({ ...p, [column]: prev }));
          return;
        }
        const data = (await res.json()) as Prefs;
        setPrefs({
          email_notify_best_matches: data.email_notify_best_matches,
          email_notify_saved_filters: data.email_notify_saved_filters,
          email_notify_easy_apply: data.email_notify_easy_apply,
          email_notify_hot_deadlines: data.email_notify_hot_deadlines
        });
      } catch {
        setPrefs((p) => ({ ...p, [column]: prev }));
      } finally {
        setPendingKey(null);
      }
    },
    [disabled, pendingKey, prefs]
  );

  const sendTest = useCallback(async () => {
    setTestState('loading');
    try {
      const res = await fetch('/api/account/test-grant-email', { method: 'POST' });
      setTestState(res.ok ? 'ok' : 'err');
    } catch {
      setTestState('err');
    }
    setTimeout(() => setTestState('idle'), 4000);
  }, []);

  const showTest = userEmail?.trim().toLowerCase() === PREVIEW_TEST_EMAIL;

  return (
    <div className="mt-6 space-y-4 border-t border-zinc-100 pt-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {notifyUi.heading}
        </p>
        <p className="mt-1 text-sm text-zinc-600">{notifyUi.description}</p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {GRANT_NOTIFY_CHANNELS.map((ch) => {
          const on = prefs[ch.profileColumn];
          const busy = pendingKey === ch.profileColumn;
          const localized = notifyUi.channels.find((c) => c.id === ch.id);
          const shortLabel = localized?.shortLabel ?? ch.shortLabel;
          const emailPromptOff = localized?.emailPromptOff ?? ch.emailPromptOff;
          const emailPromptOn = localized?.emailPromptOn ?? ch.emailPromptOn;
          return (
            <button
              key={ch.id}
              type="button"
              aria-pressed={on}
              disabled={disabled || Boolean(pendingKey)}
              onClick={() => void toggle(ch.profileColumn)}
              className={`relative rounded-xl border bg-white px-3.5 py-3 pr-12 text-left text-sm font-medium leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                on
                  ? 'border-emerald-200 text-zinc-800 shadow-sm ring-1 ring-emerald-500/10'
                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
              } ${busy ? 'opacity-70' : ''}`}
            >
              <span
                className="absolute top-2.5 right-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                aria-hidden
              >
                {on ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white shadow-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border border-red-200/90 bg-red-50 text-red-500">
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {shortLabel}
              </span>
              <span className="mt-1 block pr-1">{on ? emailPromptOn : emailPromptOff}</span>
            </button>
          );
        })}
      </div>

      {SHOW_TELEGRAM_BOT_CARD ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <p className="text-sm font-medium text-zinc-800">Telegram bot</p>
        </div>
      ) : null}

      {showTest ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={testState === 'loading'}
            onClick={() => void sendTest()}
            className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {testState === 'loading' ? notifyUi.sendingTest : notifyUi.sendTest}
          </button>
          {testState === 'ok' ? (
            <span className="text-xs text-emerald-700">Check {PREVIEW_TEST_EMAIL}</span>
          ) : null}
          {testState === 'err' ? (
            <span className="text-xs text-red-600">{notifyUi.testErr}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
