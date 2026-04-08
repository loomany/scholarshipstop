import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
      >
        Back to home
      </Link>
    </div>
  );
}
