export default function UniversityScholarshipsLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-[#F3F7FA] px-4 py-12 sm:px-5 md:py-16 lg:px-8"
    >
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-10 w-full max-w-xl rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-[92%] rounded bg-slate-200" />
        <div className="mt-12 space-y-4">
          <div className="h-36 rounded-2xl bg-slate-200" />
          <div className="h-36 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
