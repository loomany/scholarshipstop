import Link from 'next/link';

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
      className={`mt-4 ${className}`.trim()}
      aria-label={title}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {visible.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50/80 hover:text-orange-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
