'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

type SaveFilterPresetModalProps = {
  open: boolean;
  value: string;
  error?: string | null;
  submitting?: boolean;
  onChange: (next: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function SaveFilterPresetModal({
  open,
  value,
  error = null,
  submitting = false,
  onChange,
  onClose,
  onSubmit
}: SaveFilterPresetModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close save filter modal"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <h2 id={titleId} className="pr-8 text-lg font-bold tracking-tight text-zinc-900">
          Save filter preset
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Name this preset to reuse it quickly in Saved Filters.
        </p>

        <div className="mt-4 space-y-2">
          <label
            htmlFor={`${titleId}-name`}
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            Preset name
          </label>
          <input
            id={`${titleId}-name`}
            ref={inputRef}
            value={value}
            maxLength={64}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. STEM deadlines under 30 days"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-zinc-900 outline-none transition ${
              error
                ? 'border-rose-300 bg-rose-50/40 focus:border-rose-400'
                : 'border-zinc-200 bg-white focus:border-orange-300'
            }`}
          />
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#FF7A1A] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E6670C] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Save preset
          </button>
        </div>
      </div>
    </div>
  );
}
