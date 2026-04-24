function SidebarSkeletonRows() {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="rounded-lg bg-black px-4 py-3.5 text-center">
        <span className="text-sm font-bold tracking-tight text-white">My scholarships</span>
      </div>
      <ul className="mt-2 space-y-1">
        {Array.from({ length: 7 }).map((_, idx) => (
          <li key={idx} className="flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-3">
            <span className="h-[18px] w-[18px] rounded-full bg-orange-200" />
            <span className="h-4 flex-1 rounded bg-gray-200" />
            <span className="h-3 w-[4.5ch] rounded bg-gray-200" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListSkeletonCards() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
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

export default function ScholarshipsCatchAllLoading() {
  return (
    <section className="min-h-screen bg-[#F3F7FA] px-4 py-8 sm:px-5 md:py-12 lg:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="space-y-5 sm:space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
            Scholarship matches
          </h1>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 h-4 w-48 rounded bg-gray-200" />
            <div className="mb-3 h-11 w-full rounded-xl bg-gray-100" />
            <div className="flex gap-3">
              <div className="h-10 w-24 rounded-xl bg-gray-100" />
              <div className="h-10 w-28 rounded-xl bg-gray-100" />
              <div className="h-10 w-24 rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ListSkeletonCards />
          <div className="space-y-4">
            <SidebarSkeletonRows />
            <div className="h-40 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </section>
  );
}
