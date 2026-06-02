import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type ContextLinkItem = {
  href: string;
  label: string;
};

type RelatedContextLinksProps = {
  title?: string;
  links: ContextLinkItem[];
  className?: string;
};

export function RelatedContextLinks({
  title = 'Related guides',
  links,
  className = ''
}: RelatedContextLinksProps) {
  const visible = links.filter((link) => link.href.trim() && link.label.trim());
  if (!visible.length) return null;

  return (
    <nav
      className={`mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 ${className}`.trim()}
      aria-label={title}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50/70 hover:text-orange-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
            >
              <span className="min-w-0">{link.label}</span>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-orange-600"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
