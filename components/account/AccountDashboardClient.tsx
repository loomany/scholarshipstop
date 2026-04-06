'use client';

import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

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
  return (
    <div className="min-h-screen bg-zinc-50/90">
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <section id="account-section-profile" className="scroll-mt-20 space-y-6 pb-16">
          <ScholarshipProfileForm
            profile={profile}
            userEmail={user.email}
            variant="saas"
          />

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
