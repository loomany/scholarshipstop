'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import { getIqLanguageSwitcherItems } from '@/lib/iq/i18n/iqLocalizedHref';
import { useOptionalIqLocale } from '@/components/iq/IqLocaleProvider';

type IqLanguageSwitcherProps = {
  onIqSubdomain: boolean;
  className?: string;
};

export default function IqLanguageSwitcher({
  onIqSubdomain,
  className
}: IqLanguageSwitcherProps) {
  const pathname = usePathname() ?? '/';
  const iqContext = useOptionalIqLocale();
  const items = getIqLanguageSwitcherItems({ pathname, onIqSubdomain });
  const navLabel = iqContext?.shell.languageSwitcherLabel ?? 'Language';

  return (
    <nav
      aria-label={iqContext?.shell.productNavAria ?? 'IQ product navigation'}
      data-iq-language-switcher="true"
      className={clsx(
        'flex flex-wrap items-center justify-end gap-1.5 sm:gap-2',
        className
      )}
    >
      <span className="sr-only">{navLabel}</span>
      {items.map((item) => (
        <Link
          key={item.locale}
          href={item.href}
          hrefLang={item.locale === 'en' ? 'en' : item.locale}
          aria-current={item.current ? 'page' : undefined}
          className={clsx(
            'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs',
            item.current
              ? 'border-slate-950 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
