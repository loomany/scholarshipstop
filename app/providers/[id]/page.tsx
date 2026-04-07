import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Check, ExternalLink, Info } from 'lucide-react';
import type { Metadata } from 'next';

import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import { ProviderProfileFaqAccordion } from '@/components/providers/ProviderProfileFaqAccordion';
import { ProviderProfileScholarshipsList } from '@/components/providers/ProviderProfileScholarshipsList';
import { ProviderProfileScholarshipsScroll } from '@/components/providers/ProviderProfileScholarshipsScroll';
import { getCachedProviderProfilePage } from '@/lib/providers/providerProfileServer';
import {
  buildProviderProfileScholarshipsHref,
  parseProviderProfilePageParam,
  PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
} from '@/lib/providers/providerProfilePagination';
import { getUserSubscriptionStatus } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { id: string };
  searchParams?: { page?: string | string[] };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getCachedProviderProfilePage(params.id, 1);
  if (!data) {
    return { title: 'Provider | ScholarshipTop' };
  }
  return {
    title: `${data.displayName} | Scholarship Provider`,
    description: `Scholarships and profile for ${data.displayName} on ScholarshipTop.`
  };
}

export default async function ProviderProfilePage({
  params,
  searchParams
}: PageProps) {
  const currentPage = parseProviderProfilePageParam(searchParams?.page);
  const data = await getCachedProviderProfilePage(params.id, currentPage);
  if (!data) notFound();

  const totalPages =
    data.totalScholarshipCount === 0
      ? 1
      : Math.ceil(
          data.totalScholarshipCount / PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
        );

  if (data.totalScholarshipCount > 0 && currentPage > totalPages) {
    redirect(buildProviderProfileScholarshipsHref(params.id, totalPages));
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const hasSubscription = user?.id
    ? await getUserSubscriptionStatus(supabase, user.id)
    : false;

  const showingFrom =
    data.totalScholarshipCount === 0
      ? 0
      : (currentPage - 1) * PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE + 1;
  const showingTo =
    data.totalScholarshipCount === 0
      ? 0
      : Math.min(
          currentPage * PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE,
          data.totalScholarshipCount
        );

  const findMatchesHref =
    '/scholarships?' +
    new URLSearchParams({
      tab: 'matches',
      scope: 'catalog',
      q: data.displayName
    }).toString();

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16 pt-8 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {data.displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80">
                  <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} aria-hidden />
                  Verified Provider
                </span>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-semibold text-gray-900">Total scholarships</span>
                  <span className="ml-2 tabular-nums text-gray-700">
                    {data.totalScholarshipCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {data.officialUrl ? (
              <a
                href={data.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55"
              >
                Visit official website
                <ExternalLink className="h-4 w-4 text-gray-500" aria-hidden />
              </a>
            ) : null}
          </div>
        </header>

        <section className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">About the provider</h2>
          {data.aiDescription ? (
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-700 sm:text-[0.9375rem]">
              {data.aiDescription.split(/\n\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Extended public profile text is not available yet. Explore active scholarships below
              or visit the official site when linked.
            </p>
          )}
          {data.aiSources.length > 0 ? (
            <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
              <p className="flex items-start gap-2 leading-relaxed">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                  aria-hidden
                />
                <span>
                  Information aggregated from public sources:{' '}
                  {data.aiSources.map((url, i) => (
                    <span key={url}>
                      {i > 0 ? ', ' : null}
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-700 underline decoration-emerald-600/30 underline-offset-2 hover:text-emerald-800"
                      >
                        {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </span>
                  ))}
                </span>
              </p>
            </div>
          ) : null}
        </section>

        <ProviderProfileFaqAccordion items={data.aiFaq} />

        <section
          id="provider-scholarships"
          className="mt-12 scroll-mt-24"
          aria-labelledby="provider-scholarships-heading"
        >
          <ProviderProfileScholarshipsScroll page={currentPage} />
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="provider-scholarships-heading"
              className="text-xl font-bold text-gray-900"
            >
              Active scholarships by {data.displayName}
            </h2>
            <Link
              href={findMatchesHref}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55"
            >
              Find matches
            </Link>
          </div>

          {data.totalScholarshipCount === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-10">
              <p className="text-base font-medium text-zinc-900">
                No active scholarships found for this provider right now.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                Create a free account to get scholarship alerts and updates when new
                opportunities from this organization appear in the catalog.
              </p>
              <Link
                href="/onboarding"
                className="mt-6 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55"
              >
                Get notified
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                Showing {showingFrom}-{showingTo} of{' '}
                {data.totalScholarshipCount.toLocaleString()} scholarships
              </p>
              <div className="mt-6 flex w-full min-w-0 flex-col gap-4">
                <ProviderProfileScholarshipsList
                  scholarships={data.scholarships}
                  isAuthenticated={Boolean(user)}
                  hasSubscription={hasSubscription}
                />
              </div>
              <ResourcesPagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={(p) => buildProviderProfileScholarshipsHref(params.id, p)}
                linkScroll={false}
              />
            </>
          )}
        </section>

        {data.similarProviders.length > 0 ? (
          <section className="mt-14 border-t border-gray-200/80 pt-12">
            <h2 className="mb-6 text-xl font-bold text-gray-900">
              Explore similar organizations
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.similarProviders.map((p) => (
                <Link
                  key={p.slug}
                  href={`/providers/${encodeURIComponent(p.slug)}`}
                  className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-emerald-200/80 hover:shadow-md"
                >
                  <div className="h-1 w-10 rounded-full bg-emerald-500/90 transition group-hover:w-14" />
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-gray-900">
                    {p.displayName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {p.scholarshipCount.toLocaleString()} scholarships
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
