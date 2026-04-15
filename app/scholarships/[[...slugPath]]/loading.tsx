import { ShimmerBox } from '@/components/ui/Shimmer';

/**
 * Shown during navigations to `/scholarships` and scholarship detail URLs while the RSC payload streams.
 * Generic hub + detail–ish layout so both feel acceptable.
 */
export default function ScholarshipsCatchAllLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="min-h-[calc(100dvh-4rem)] w-full min-w-0 bg-zinc-50 md:min-h-[calc(100dvh-5rem)]"
    >
      <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <ShimmerBox className="h-3 w-12 rounded" />
          <span className="text-zinc-300">/</span>
          <ShimmerBox className="h-3 w-28 rounded" />
          <span className="text-zinc-300">/</span>
          <ShimmerBox className="h-3 w-36 rounded sm:w-48" />
        </div>

        <ShimmerBox className="mt-8 h-9 w-full max-w-3xl rounded-lg sm:h-11" />
        <ShimmerBox className="mt-4 h-4 w-full max-w-xl rounded" />
        <div className="mt-3 flex flex-wrap gap-2">
          <ShimmerBox className="h-6 w-24 rounded-full" />
          <ShimmerBox className="h-6 w-20 rounded-full" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_min(360px,100%)] lg:gap-10">
          <div className="space-y-4">
            <ShimmerBox className="h-40 w-full rounded-2xl sm:h-48" />
            <ShimmerBox className="h-28 w-full rounded-2xl" />
            <ShimmerBox className="h-64 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <ShimmerBox className="h-24 rounded-xl" />
              <ShimmerBox className="h-24 rounded-xl" />
            </div>
          </div>
          <aside className="space-y-4">
            <ShimmerBox className="h-44 w-full rounded-2xl" />
            <ShimmerBox className="h-32 w-full rounded-2xl" />
            <ShimmerBox className="h-24 w-full rounded-xl" />
          </aside>
        </div>
      </div>
    </div>
  );
}
