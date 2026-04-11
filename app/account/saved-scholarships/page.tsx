import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { fetchScholarshipsByIdsForListing } from '@/lib/scholarships/supabase';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';

export const metadata: Metadata = {
  title: 'Saved scholarships',
  robots: { index: false, follow: true }
};

export default async function SavedScholarshipsPage() {
  const supabase = createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const { data: saves, error } = await (supabase as any)
    .from('user_saved_scholarships')
    .select('scholarship_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50/90 px-4 py-8">
        <p className="text-sm text-red-600">Could not load saved scholarships.</p>
        <Link href="/account" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to account
        </Link>
      </div>
    );
  }

  const ids = (saves ?? []).map((r: { scholarship_id: string }) => r.scholarship_id);
  const scholarships = ids.length ? await fetchScholarshipsByIdsForListing(supabase, ids) : [];

  return (
    <div className="min-h-screen bg-zinc-50/90">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          ← Back to account
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">Saved scholarships</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Grants you saved from the site or from Telegram appear here.
        </p>

        {scholarships.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            No saved scholarships yet. Save from a grant page or tap Save on a Telegram card.
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {scholarships.map((s) => {
              const href = scholarshipPublicPath(s);
              return (
                <li key={s.id}>
                  <Link
                    href={href}
                    className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/80"
                  >
                    <span className="font-medium text-zinc-900">{s.title?.trim() || 'Scholarship'}</span>
                    {s.deadline?.trim() ? (
                      <span className="mt-1 block text-sm text-zinc-500">
                        Deadline: {s.deadline.trim()}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
