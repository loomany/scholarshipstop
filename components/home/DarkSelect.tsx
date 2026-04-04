'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type DarkSelectOption = { value: string; label: string };

type DarkSelectProps = {
  id?: string;
  ariaLabel?: string;
  options: DarkSelectOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Subtle validation hint — avoids loud red error styling */
  hasError?: boolean;
  /** Replaces default max-h-52 on the options list (e.g. max-h-72 for long lists) */
  menuClassName?: string;
};

const triggerBaseClass =
  'flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3.5 text-left text-sm shadow-sm transition-all duration-200 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/25 disabled:cursor-not-allowed disabled:opacity-50';

const triggerNormalBorder =
  'border-zinc-200 hover:border-zinc-300 focus-visible:border-teal-400';

const triggerErrorBorder =
  'border-amber-400/80 hover:border-amber-500/70 focus-visible:border-teal-400';

export function DarkSelect({
  id,
  ariaLabel,
  options,
  value,
  onChange,
  disabled,
  hasError,
  menuClassName
}: DarkSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? options[0]?.label ?? '';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${triggerBaseClass} ${
          hasError ? triggerErrorBorder : triggerNormalBorder
        }`}
      >
        <span className={value ? 'text-zinc-900' : 'text-zinc-400'}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          {...(id
            ? { 'aria-labelledby': id }
            : { 'aria-label': ariaLabel ?? 'Choose an option' })}
          className={`absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5 ${menuClassName ?? 'max-h-52'}`}
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <li
                key={opt.value === '' ? '__empty' : opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`cursor-pointer px-4 py-2.5 text-sm text-zinc-900 transition-colors duration-150 ${
                  isSelected
                    ? 'bg-teal-50 text-teal-900'
                    : 'hover:bg-zinc-50'
                }`}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
