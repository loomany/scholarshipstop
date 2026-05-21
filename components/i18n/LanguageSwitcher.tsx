'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import {
  getStage2LanguageSwitcherItems,
  type Stage2LanguageSwitcherItem
} from '@/lib/i18n/localizedHref';

type LanguageSwitcherProps = {
  pathname: string;
  /** Prefer explicit locale from parent nav so selection stays correct during client navigations. */
  currentLocale?: Stage2LanguageSwitcherItem['locale'];
  className?: string;
  label?: string;
  variant?: 'inline' | 'dropdown';
  triggerClassName?: string;
};

function defaultLabelFor(items: Stage2LanguageSwitcherItem[]): string {
  const current = items.find((item) => item.current);
  if (current?.locale === 'es') return 'Idioma';
  if (current?.locale === 'fr') return 'Langue';
  return 'Language';
}

function LanguageSwitcherDropdown({
  items,
  navLabel,
  className,
  triggerClassName
}: {
  items: Stage2LanguageSwitcherItem[];
  navLabel: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const current = items.find((item) => item.current) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-language-switcher="true"
      className={clsx('relative shrink-0', className)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 shadow-none transition hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          triggerClassName
        )}
      >
        <span className="sr-only">{navLabel}: </span>
        <span aria-hidden>{current.label}</span>
        <ChevronDown
          className={clsx(
            'h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={navLabel}
          data-language-switcher="true"
          className="absolute right-0 top-full z-[120] mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          {items.map((item) => (
            <Link
              key={item.locale}
              href={item.href}
              role="option"
              aria-selected={item.current}
              data-language-switcher="true"
              data-language-switcher-locale={item.locale}
              onClick={() => setOpen(false)}
              className={clsx(
                'block rounded-lg px-3 py-2 text-sm font-medium transition',
                item.current
                  ? 'bg-gray-950 text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function LanguageSwitcher({
  pathname,
  currentLocale,
  className,
  label,
  variant = 'inline',
  triggerClassName
}: LanguageSwitcherProps) {
  const items = getStage2LanguageSwitcherItems({ pathname, currentLocale });
  if (items.length <= 1) return null;

  const navLabel = label ?? defaultLabelFor(items);

  if (variant === 'dropdown') {
    return (
      <LanguageSwitcherDropdown
        items={items}
        navLabel={navLabel}
        className={className}
        triggerClassName={triggerClassName}
      />
    );
  }

  return (
    <nav
      aria-label={navLabel}
      data-language-switcher="true"
      className={clsx(
        'flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white/85 p-1 text-xs font-semibold shadow-sm',
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.locale}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          data-language-switcher="true"
          data-language-switcher-locale={item.locale}
          className={clsx(
            'rounded-full px-3 py-1.5 transition',
            item.current
              ? 'bg-gray-950 text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
