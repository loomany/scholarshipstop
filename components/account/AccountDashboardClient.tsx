'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { User } from '@supabase/supabase-js';

import EmailForm from '@/components/ui/AccountForms/EmailForm';
import ScholarshipProfileForm from '@/components/ui/AccountForms/ScholarshipProfileForm';
import type { Database } from '@/types_db';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export default function AccountDashboardClient({
  user,
  profile
}: {
  user: User;
  profile: ProfilesRow | null;
}) {
  const displayName = useMemo(() => {
    const fn = profile?.first_name?.trim();
    const ln = profile?.last_name?.trim();
    if (fn || ln) return [fn, ln].filter(Boolean).join(' ');
    const email = user.email?.split('@')[0];
    return email || 'Account';
  }, [profile?.first_name, profile?.last_name, user.email]);

  return (
    <div className="min-h-screen bg-zinc-50/90">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
        <section id="account-section-profile" className="scroll-mt-20 space-y-5 pb-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)] sm:p-8">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {displayName}
              </h1>
              <p className="mt-2 text-sm text-zinc-500 sm:text-base">
                Manage your profile and account email in one place.
              </p>
              <div className="mt-6">
                <EmailForm userEmail={user.email} variant="embedded" />
              </div>
            </div>

            <aside className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)] sm:p-8">
              <h2 className="text-base font-semibold text-zinc-900">Billing</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Billing details and subscription actions will live here.
              </p>
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 p-4">
                <p className="text-sm font-medium text-zinc-700">Billing shell</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  This placeholder keeps the account header balanced for now without adding a
                  new billing flow or CTA.
                </p>
              </div>
            </aside>
          </div>

          <ScholarshipProfileForm profile={profile} variant="saas" />

          <div>
            <Link
              href="/scholarships"
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
            >
              ← Back to scholarships
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
