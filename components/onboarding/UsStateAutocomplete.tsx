'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import {
  filterUsStateNames,
  US_STATE_AUTOCOMPLETE_PLACEHOLDER
} from '@/lib/constants/usStates';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';

const onboardingInputClass = `w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-300 ${SITE_INPUT_FOCUS_CLASS}`;

const listClassBase =
  'absolute mt-1 max-h-52 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg';

const itemClass =
  'w-full cursor-pointer px-4 py-2.5 text-left text-sm text-zinc-900 hover:bg-zinc-50';

type Props = {
  id?: string;
  labelId?: string;
  /** When there is no visible label (`labelId`), set for screen readers. */
  ariaLabel?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Default matches Step 2 / onboarding fields */
  inputClassName?: string;
  maxSuggestions?: number;
  /** Override suggestion list panel (same defaults as onboarding). */
  suggestionsListClassName?: string;
  /** Override suggestion row (same defaults as onboarding). */
  suggestionItemClassName?: string;
  /** e.g. z-30 when the list must sit above dense stacked cards (account profile). */
  suggestionListZIndexClass?: string;
};

export function UsStateAutocomplete({
  id,
  labelId,
  ariaLabel,
  value,
  onChange,
  disabled = false,
  placeholder = US_STATE_AUTOCOMPLETE_PLACEHOLDER,
  inputClassName = onboardingInputClass,
  maxSuggestions = 8,
  suggestionsListClassName,
  suggestionItemClassName,
  suggestionListZIndexClass = 'z-20'
}: Props) {
  const genId = useId();
  const listboxId = `${genId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = open
    ? filterUsStateNames(value, maxSuggestions)
    : [];

  const listBoxClass =
    suggestionsListClassName ?? `${listClassBase} ${suggestionListZIndexClass}`;
  const rowClass = suggestionItemClassName ?? itemClass;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
      setHighlight(0);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && value.trim()) {
      setOpen(true);
      setHighlight(0);
      e.preventDefault();
      return;
    }
    if (!open) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlight((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowUp') {
      setHighlight((i) => Math.max(0, i - 1));
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && suggestions.length > 0) {
      const row = suggestions[highlight] ?? suggestions[0];
      if (row) pick(row);
      e.preventDefault();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-labelledby={labelId || undefined}
        aria-label={labelId ? undefined : ariaLabel}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClassName}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          if (value.trim()) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className={listBoxClass}
          aria-label="State suggestions"
        >
          {suggestions.map((name, idx) => (
            <li key={name} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={idx === highlight}
                className={`${rowClass} ${idx === highlight ? 'bg-zinc-100' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
