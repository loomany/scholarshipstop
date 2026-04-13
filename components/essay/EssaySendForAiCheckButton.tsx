'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';

import { cn } from '@/utils/cn';

export type EssaySendForAiDetectorChoice = 'gptzero' | 'undetectable';

type Props = {
  disabled: boolean;
  loading: boolean;
  /** 0–100: share of AI-risk text rewritten manually (green snippets). */
  manualCoveragePercent: number;
  onPickDetector: (detector: EssaySendForAiDetectorChoice) => void;
};

export default function EssaySendForAiCheckButton({
  disabled,
  loading,
  manualCoveragePercent,
  onPickDetector
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (detector: EssaySendForAiDetectorChoice) => {
    setOpen(false);
    onPickDetector(detector);
  };

  return (
    <div ref={rootRef} className="relative mt-3 w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Send for AI check — manual fixes ${manualCoveragePercent}% of highlighted text — choose detector`}
        className={cn(
          'inline-flex min-h-[2.5rem] w-full items-center gap-2 rounded-full bg-emerald-500 py-2.5 pl-5 pr-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
        )}
      >
        {loading ? (
          <Loader2 className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
        )}
        <span className="min-w-0 flex-1 text-center">Send for AI check</span>
        <span
          className="shrink-0 tabular-nums text-[13px] font-semibold tracking-tight text-white/95"
          title="Share of AI-risk text manually corrected (green highlights)"
        >
          {manualCoveragePercent}%
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-95 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="AI detector"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[85] overflow-hidden rounded-xl border border-zinc-200/95 bg-white py-1 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.06]"
        >
          <li role="option">
            <button
              type="button"
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-emerald-50 disabled:opacity-50"
              disabled={disabled || loading}
              onClick={() => pick('gptzero')}
            >
              <span className="font-semibold">GPTZero</span>
              <span className="text-xs font-normal leading-snug text-zinc-500">
                Sentence highlights &amp; human score
              </span>
            </button>
          </li>
          <li role="option" className="border-t border-zinc-100">
            <button
              type="button"
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-emerald-50 disabled:opacity-50"
              disabled={disabled || loading}
              onClick={() => pick('undetectable')}
            >
              <span className="font-semibold">Undetectable.AI</span>
              <span className="text-xs font-normal leading-snug text-zinc-500">
                Overall human score (no sentence map)
              </span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
