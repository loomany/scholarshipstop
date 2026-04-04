import Link from 'next/link';

export default function DashboardPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
      <div className="px-6 text-center">
        <h1 className="mb-4 text-4xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mb-6 text-zinc-600">
          Welcome to your dashboard
        </p>

        <Link
          href="/"
          className="inline-flex transform items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 py-3 font-semibold text-zinc-900 shadow-sm transition duration-200 hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99]"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
