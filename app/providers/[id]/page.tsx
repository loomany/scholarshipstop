import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import type { Metadata } from 'next';

import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import ProviderProfilePageAuthBridge from '@/app/providers/ProviderProfilePageAuthBridge';
import { ProviderProfileFaqAccordion } from '@/components/providers/ProviderProfileFaqAccordion';
import { ProviderOfficialWebsiteGate } from '@/components/providers/ProviderOfficialWebsiteGate';
import { ProviderProfileScholarshipsScroll } from '@/components/providers/ProviderProfileScholarshipsScroll';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import {
  getCachedProviderProfilePage,
  resolveProviderProfileSlug
} from '@/lib/providers/providerProfileServer';
import { getURL } from '@/utils/helpers';
import {
  buildProviderProfileScholarshipsHref,
  parseProviderProfilePageParam,
  PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
} from '@/lib/providers/providerProfilePagination';

export const revalidate = 60;

function providerMetaDescription(
  aiDescription: string | null | undefined,
  displayName: string
): string {
  const trimmed = aiDescription?.trim();
  if (!trimmed) {
    return `Scholarships and profile for ${displayName} on ScholarshipTop.`;
  }
  const singleLine = trimmed.replace(/\s+/g, ' ').trim();
  return singleLine.length <= 160
    ? singleLine
    : `${singleLine.slice(0, 157).trimEnd()}...`;
}

function normalizeAiSourceHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return url;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Up to two paragraphs for profile copy (avoid a full scroll of text). */
function aboutProviderParagraphs(text: string | null | undefined): string[] {
  const t = text?.trim();
  if (!t) return [];
  return t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 2);
}

/** Deduped http(s) URLs for the sources list. */
function providerProfileSourceLinks(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== 'string') continue;
    const u = normalizeAiSourceHref(raw).trim();
    if (!u) continue;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    } catch {
      continue;
    }
    const key = u.split('#')[0]?.toLowerCase() ?? u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

type PageProps = {
  params: { id: string };
  searchParams?: { page?: string | string[] };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = await resolveProviderProfileSlug(params.id);
  const data = slug ? await getCachedProviderProfilePage(slug, 1) : null;
  if (!data) {
    return { title: 'Provider' };
  }
  return {
    title: `${data.displayName} | Scholarship Provider`,
    description: providerMetaDescription(data.aiDescription, data.displayName)
  };
}

export default async function ProviderProfilePage({
  params,
  searchParams
}: PageProps) {
  const currentPage = parseProviderProfilePageParam(searchParams?.page);
  const slug = await resolveProviderProfileSlug(params.id);
  if (!slug) notFound();
  if (slug !== decodeURIComponent(params.id).trim()) {
    permanentRedirect(buildProviderProfileScholarshipsHref(slug, currentPage));
  }

  const data = await getCachedProviderProfilePage(slug, currentPage);
  if (!data) notFound();

  const totalPages =
    data.totalScholarshipCount === 0
      ? 1
      : Math.ceil(
          data.totalScholarshipCount / PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
        );

  if (data.totalScholarshipCount > 0 && currentPage > totalPages) {
    redirect(buildProviderProfileScholarshipsHref(slug, totalPages));
  }

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

  const aboutParas = aboutProviderParagraphs(data.aiDescription);
  const sourceLinks = providerProfileSourceLinks(data.aiSources);

  const providerPath = `/providers/${encodeURIComponent(data.slug)}`;
  const providerUrl = getURL(providerPath);
  const providerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.displayName,
    url: data.officialUrl?.trim() || providerUrl,
    mainEntityOfPage: providerUrl,
    description: providerMetaDescription(data.aiDescription, data.displayName),
    ...(data.officialUrl?.trim() ? { sameAs: [data.officialUrl.trim()] } : {})
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16 pt-8 sm:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(providerSchema) }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-gray-900 max-sm:w-full max-sm:text-center sm:text-4xl">
                {data.displayName}
              </h1>
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 sm:self-center">
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
        </header>

        <section className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">About Provider</h2>
          {aboutParas.length > 0 ? (
            <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-gray-700 sm:text-[0.9375rem]">
              {aboutParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              We don&apos;t have a profile write-up for this organization yet. Browse the scholarships
              below or open the official site when it&apos;s listed.
            </p>
          )}
        </section>

        {data.officialUrl?.trim() ? (
          <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-gray-900">Official Website</h2>
            <div className="mt-4">
              <ProviderOfficialWebsiteGate
                href={normalizeAiSourceHref(data.officialUrl)}
                label="Open official website"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55"
              />
            </div>
          </section>
        ) : null}

        {sourceLinks.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-gray-900">Sources</h2>
            <ul className="mt-4 list-none space-y-2.5 text-sm">
              {sourceLinks.map((href) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words font-medium text-emerald-800 underline decoration-emerald-600/35 underline-offset-[3px] transition hover:text-emerald-900 hover:decoration-emerald-700/50"
                  >
                    {href.replace(/^https?:\/\//i, '')}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ProviderProfileFaqAccordion items={data.aiFaq} />

        <section id="provider-scholarships" className="mt-12 scroll-mt-24">
          <ProviderProfileScholarshipsScroll page={currentPage} />
          <div className="mb-6 flex flex-col gap-4">
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:px-6 sm:py-5">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl leading-none sm:text-[1.7rem]" aria-hidden>
                  🎯
                </span>
                <h3 className="text-xl font-bold leading-[1.08] tracking-tight text-indigo-950 sm:text-[1.65rem] md:text-[1.85rem] md:whitespace-nowrap">
                  Get matched with scholarships in 2 minutes
                </h3>
              </div>
              <HomePrimaryCtaClient
                className="mt-3 inline-flex items-center justify-center rounded-full bg-black px-7 py-2 text-xl font-bold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
              >
                Find My Scholarships
              </HomePrimaryCtaClient>
            </div>
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
                <ProviderProfilePageAuthBridge scholarships={data.scholarships} />
              </div>
              <ResourcesPagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={(p) => buildProviderProfileScholarshipsHref(slug, p)}
                linkScroll={false}
                navClassName="mt-4 flex flex-col items-center gap-2 sm:mt-12 sm:gap-3"
              />
            </>
          )}
        </section>

        {data.similarProviders.length > 0 ? (
          <section className="mt-4 border-t border-gray-200/80 pt-4 sm:mt-14 sm:pt-12">
            <h2 className="mb-3 text-xl font-bold text-gray-900 sm:mb-6">
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
