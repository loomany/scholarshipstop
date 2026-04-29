'use client';

/**
 * Hub listing shell while Suspense/streaming resolves — mirrors
 * `ScholarshipsTwoColumnLayout` + lead (h1 + intro) + list header + cards
 * so the first paint matches the hydrated hub layout (no column swap / missing intro).
 */

export function HubListSkeleton({
  showApplyingLabel = false
}: {
  showApplyingLabel?: boolean;
}) {
  return (
    <div aria-live="polite" aria-busy className="space-y-4">
      {showApplyingLabel ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm">
          Applying filters...
        </div>
      ) : null}
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={`hub-list-skeleton-${idx}`}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
          <div className="mb-2 h-4 w-full rounded bg-gray-100" />
          <div className="mb-4 h-4 w-5/6 rounded bg-gray-100" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-9 rounded bg-gray-100" />
            <div className="h-9 rounded bg-gray-100" />
            <div className="h-9 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HubSidebarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="rounded-lg bg-black px-4 py-3.5 text-center">
          <span className="text-sm font-bold tracking-tight text-white">
            My scholarships
          </span>
        </div>
        <ul className="mt-2 space-y-0.5">
          {Array.from({ length: 7 }).map((_, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-3"
            >
              <span className="h-[18px] w-[18px] rounded-full bg-orange-200" />
              <span className="h-4 flex-1 rounded bg-gray-200" />
              <span className="h-3 w-[4.5ch] rounded bg-gray-200" />
            </li>
          ))}
        </ul>
      </div>
      <div className="h-40 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}

type ScholarshipsHubShellSkeletonProps = {
  /** Listing h1 — default matches root hub before tab resolves. */
  pageTitle?: string;
};

export default function ScholarshipsHubShellSkeleton({
  pageTitle = 'Scholarship matches'
}: ScholarshipsHubShellSkeletonProps) {
  return (
    <section
      aria-busy
      className="min-h-screen bg-[#F3F7FA] px-4 py-8 text-left text-zinc-900 sm:px-5 md:py-12 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
        <div className="w-full min-w-0">
          <div className="space-y-5 sm:space-y-6">
            <div className="space-y-0">
              <h1 className="min-w-0 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
                {pageTitle}
              </h1>
              <div
                className="mt-5 max-w-5xl rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-sm sm:mt-6 sm:p-6 lg:mx-auto"
                aria-hidden
              >
                <div className="space-y-2.5">
                  <div className="h-4 w-full max-w-3xl rounded bg-slate-200/90" />
                  <div className="h-4 w-full max-w-2xl rounded bg-slate-200/90" />
                  <div className="h-4 w-full max-w-xl rounded bg-slate-200/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-6 xl:gap-8">
          <aside
            className="order-1 w-full shrink-0 lg:order-2 lg:w-[min(100%,280px)] lg:max-w-[30%] xl:w-[300px] 2xl:w-[320px]"
            aria-label="My scholarships navigation"
          >
            <div className="lg:sticky lg:top-20 lg:z-10 lg:w-full">
              <HubSidebarSkeleton />
            </div>
          </aside>

          <div className="order-2 min-w-0 flex-1 basis-0 lg:order-1">
            <div className="relative z-[80] mb-4 space-y-5 sm:mb-5 sm:space-y-6">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 h-4 w-56 rounded bg-gray-200" />
                <div className="mb-3 h-11 w-full rounded-xl bg-gray-100" />
                <div className="flex gap-3">
                  <div className="h-10 w-24 rounded-xl bg-gray-100" />
                  <div className="h-10 w-28 rounded-xl bg-gray-100" />
                  <div className="h-10 w-24 rounded-xl bg-gray-100" />
                </div>
              </div>
            </div>
            <HubListSkeleton />
          </div>
        </div>
      </div>
    </section>
  );
}
