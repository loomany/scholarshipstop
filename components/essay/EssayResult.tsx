'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns2,
  GitCompare,
  Loader2,
  Lock,
  ShieldAlert,
  Sparkles,
  Wand2,
  X
} from 'lucide-react';

import type { HighlightLevel } from '@/lib/essay/gptZeroHighlightLevels';
import { levelForRow } from '@/lib/essay/gptZeroHighlightLevels';
import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import {
  ESSAY_HUMANIZE_MODEL_STORAGE_KEY,
  UNDETECTABLE_HUMANIZE_MODEL_OPTIONS,
  type UndetectableHumanizeModelId
} from '@/lib/essay/undetectableHumanizeModels';
import {
  friendlyUndetectableError,
  UNDETECTABLE_MIN_CONTENT_CHARS
} from '@/lib/essay/undetectableUserMessages';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { cn } from '@/utils/cn';
import { getEssaySentenceSegmentsExact } from '@/lib/essay/splitEssaySentences';

const UNDETECTABLE_MIN_CHARS = UNDETECTABLE_MIN_CONTENT_CHARS;

export type EssayResultGptZeroProps = {
  humanScore: number | null;
  sentenceScores: GptZeroSentenceScore[] | null;
  essayContent: string;
};

function verdictForHumanScore(score: number): string {
  if (score > 80) {
    return 'Sounds natural. Risk of AI flags is below average.';
  }
  if (score >= 50) {
    return 'Some borderline spots. Strengthen your voice and specifics.';
  }
  return 'High AI risk. Rephrase the highlighted snippets.';
}

function scoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score > 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

/** GPTZero sometimes returns 0% human — we show at least 1% in the UI to avoid a misleading empty range. */
function displayHumanScorePercent(score: number): number {
  return score === 0 ? 1 : score;
}

/** Human Score block + verdict (SaaS-style card). `embedded` sits inside a parent section without an extra outer frame. */
export function GptZeroResultPanel({
  humanScore,
  variant = 'card'
}: Pick<EssayResultGptZeroProps, 'humanScore'> & { variant?: 'card' | 'embedded' }) {
  if (humanScore === null) return null;

  const displayPct = displayHumanScorePercent(humanScore);
  const tier = scoreTier(displayPct);
  const verdict = verdictForHumanScore(displayPct);
  const embedded = variant === 'embedded';

  const tierAccent =
    tier === 'high'
      ? {
          border: 'border-emerald-200/90',
          bg: 'from-emerald-50/90 via-white to-white',
          iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-600/15',
          value: 'text-emerald-800',
          Icon: CheckCircle2
        }
      : tier === 'mid'
        ? {
            border: 'border-amber-200/90',
            bg: 'from-amber-50/80 via-white to-white',
            iconWrap: 'bg-amber-100 text-amber-800 ring-amber-600/15',
            value: 'text-amber-900',
            Icon: AlertTriangle
          }
        : {
            border: 'border-zinc-200/90',
            bg: 'from-zinc-50/90 via-white to-white',
            iconWrap: 'bg-zinc-100 text-zinc-700 ring-zinc-500/12',
            value: 'text-zinc-900',
            Icon: ShieldAlert
          };

  const StatusIcon = tierAccent.Icon;

  /** Compact SaaS row: icon inline with the percentage. */
  if (embedded) {
    return (
      <div className="w-full text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex shrink-0 text-[#FF7A1A]" aria-hidden>
              <StatusIcon
                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
                strokeWidth={1.5}
              />
            </span>
            <span
              className={cn(
                'text-base font-semibold tabular-nums tracking-tight sm:text-lg sm:leading-snug',
                tierAccent.value
              )}
            >
              {displayPct}%
            </span>
          </span>
          <span className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
            Human Score
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600 sm:text-[13px] sm:leading-relaxed">
          {verdict}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-br text-left',
        'rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] sm:p-6',
        tierAccent.border,
        tierAccent.bg
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex shrink-0 text-[#FF7A1A]" aria-hidden>
              <StatusIcon
                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
                strokeWidth={1.5}
              />
            </span>
            <span
              className={cn(
                'text-base font-semibold tabular-nums tracking-tight sm:text-lg sm:leading-snug',
                tierAccent.value
              )}
            >
              {displayPct}%
            </span>
          </span>
          <span className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
            Human Score
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{verdict}</p>
      </div>
    </div>
  );
}

export type HighlightPalette = 'orange' | 'red';

function spanClassForLevel(
  level: HighlightLevel,
  palette: HighlightPalette = 'orange'
): string {
  if (palette === 'red') {
    if (level === 'high') {
      return 'text-black bg-red-200/80 ring-1 ring-red-400/60 [box-decoration-break:clone]';
    }
    if (level === 'mid') {
      return 'text-black bg-red-100/88 ring-1 ring-red-300/55 [box-decoration-break:clone]';
    }
    return '';
  }
  /* Orange palette — Corrections tab */
  if (level === 'high') {
    return 'text-black bg-orange-200/65 ring-1 ring-orange-300/50 [box-decoration-break:clone]';
  }
  if (level === 'mid') {
    return 'text-black bg-orange-100/85 ring-1 ring-orange-200/55 [box-decoration-break:clone]';
  }
  return '';
}

export type EssayContentHighlightedProps = Pick<
  EssayResultGptZeroProps,
  'essayContent' | 'sentenceScores'
> & {
  /** Base text for segmentation (= essay row content before manual edits). */
  essayContent: string;
  userEdits?: Record<number, string>;
  /** Sentence indices rewritten via batch or snippet Humanize (distinct from manual Save). */
  humanizedIndices?: Set<number>;
  onSaveUserEdit?: (sentenceIndex: number, newText: string) => void;
  /** Clickable risky sentences + popover (step 1). */
  sentenceEditInteractive?: boolean;
  /** Source: red risk highlights; Corrections: orange. */
  highlightPalette?: HighlightPalette;
  /** Snippet pop-up editor: Undetectable “Humanize” button. Disabled on the Source tab. */
  snippetHumanizeEnabled?: boolean;
  /** Without a subscription: Humanize opens the paywall (callback) and does not call the API. */
  humanizeSnippetPremiumLocked?: boolean;
  onHumanizeSnippetPremiumBlocked?: () => void;
  /** Pop-up save after manual input in After (not only Humanize) — powers “Send for AI check”. */
  onManualSnippetTouchRecorded?: () => void;
};

/**
 * Essay text is unchanged (same characters and line breaks); highlights are a translucent overlay.
 */
export function EssayContentHighlighted({
  essayContent,
  sentenceScores,
  userEdits = {},
  humanizedIndices,
  onSaveUserEdit,
  sentenceEditInteractive = false,
  highlightPalette = 'orange',
  snippetHumanizeEnabled = true,
  humanizeSnippetPremiumLocked = false,
  onHumanizeSnippetPremiumBlocked,
  onManualSnippetTouchRecorded
}: EssayContentHighlightedProps) {
  const { toast } = useToast();
  /** True if the user typed in After after opening; resets after Humanize. */
  const userEditedAfterOpenRef = useRef(false);
  const parts = getEssaySentenceSegmentsExact(essayContent);
  const scoresByIndex = new Map<number, GptZeroSentenceScore>();
  if (sentenceScores?.length) {
    for (const s of sentenceScores) {
      scoresByIndex.set(s.index, s);
    }
  }

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /** “After” text — persisted into the essay. */
  const [draft, setDraft] = useState('');
  /** “Before” snapshot when the pop-up opened (comparison only). */
  const [beforeText, setBeforeText] = useState('');
  const [undetectLoading, setUndetectLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUndetectLoading(false);
    if (openIndex !== null) {
      userEditedAfterOpenRef.current = false;
    }
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (popoverRef.current?.contains(t)) return;
      if (t.closest?.('[data-essay-sentence-chip]')) return;
      setOpenIndex(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openIndex]);

  if (parts.length === 0) {
    return <div className="whitespace-pre-wrap text-black">{essayContent}</div>;
  }

  const interactive =
    sentenceEditInteractive && typeof onSaveUserEdit === 'function';

  return (
    <div className="whitespace-pre-wrap text-black">
      {parts.map((chunk, i) => {
        const row = scoresByIndex.get(i);
        const level = levelForRow(row);
        const onlyWs = chunk !== '' && chunk.trim() === '';
        const showRisk = !onlyWs && level !== 'none';
        const displayChunk = userEdits[i] !== undefined ? userEdits[i]! : chunk;
        const userSaved = userEdits[i] !== undefined;
        const fromHumanizeApi = Boolean(userSaved && humanizedIndices?.has(i));
        const bg = userSaved
          ? fromHumanizeApi
            ? 'bg-violet-700 text-white ring-1 ring-violet-950/40 [box-decoration-break:clone]'
            : 'bg-green-700 text-white ring-1 ring-green-900/35 [box-decoration-break:clone]'
          : spanClassForLevel(level, highlightPalette);
        const show = userSaved || showRisk;
        const clickable = interactive && (showRisk || userSaved) && !onlyWs;

        const titleText =
          showRisk && row?.generatedProbability !== undefined
            ? `AI score for this snippet: ${Math.round(row.generatedProbability * 100)}%`
            : userSaved
              ? fromHumanizeApi
                ? 'Rewritten with Humanize'
                : 'Edited manually'
              : undefined;

        const openPopover = () => {
          if (!clickable) return;
          setOpenIndex(i);
          setBeforeText(displayChunk);
          setDraft('');
        };

        return (
          <Fragment key={i}>
            <span
              {...(clickable ? { 'data-essay-sentence-chip': true } : {})}
              className={cn(
                show && `${bg} rounded-sm px-0.5 py-0.5`,
                show && 'transition-colors',
                clickable &&
                  (userSaved
                    ? fromHumanizeApi
                      ? 'cursor-pointer hover:bg-violet-800'
                      : 'cursor-pointer hover:bg-green-800'
                    : 'cursor-pointer hover:brightness-[0.95] active:brightness-[0.93]')
              )}
              title={titleText}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={(e) => {
                e.stopPropagation();
                openPopover();
              }}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPopover();
                      }
                    }
                  : undefined
              }
            >
              {displayChunk}
            </span>
            {interactive && openIndex === i ? (
              <div
                ref={popoverRef}
                className="relative z-30 my-3 block w-full max-w-full"
                role="dialog"
                aria-label="Edit snippet: Before, then After"
              >
                <div className="rounded-2xl border border-zinc-200/95 bg-white p-4 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.2)] ring-1 ring-black/5 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-3">
                    <div className="flex h-full min-h-0 flex-col gap-1.5">
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-black">
                        <GitCompare
                          className="h-3.5 w-3.5 shrink-0 text-[#FF7A1A]"
                          aria-hidden
                        />
                        Before
                      </span>
                      <div
                        className="min-h-[7rem] flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[15px] leading-relaxed text-zinc-700 shadow-inner sm:max-h-[min(40vh,16rem)]"
                        tabIndex={0}
                        role="region"
                        aria-label="Original snippet text"
                      >
                        {beforeText || '\u00a0'}
                      </div>
                    </div>

                    <div
                      className="hidden shrink-0 self-stretch items-center justify-center sm:flex"
                      aria-hidden
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                        <Columns2 className="h-4 w-4 rotate-90 sm:rotate-0" />
                      </div>
                    </div>

                    <div className="flex h-full min-h-0 flex-col gap-1.5">
                      <div className="flex shrink-0 items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-black">
                          <GitCompare
                            className="h-3.5 w-3.5 shrink-0 text-[#FF7A1A]"
                            aria-hidden
                          />
                          After
                        </span>
                        {draft.trim() !== '' && draft !== beforeText ? (
                          <span className="text-[10px] font-medium text-amber-700">
                            differs from Before
                          </span>
                        ) : null}
                      </div>
                      <div className="flex min-h-[7rem] w-full flex-1 flex-col sm:max-h-[min(40vh,16rem)]">
                        <textarea
                          value={draft}
                          onChange={(e) => {
                            userEditedAfterOpenRef.current = true;
                            setDraft(e.target.value);
                          }}
                          placeholder={
                            snippetHumanizeEnabled
                              ? 'Write a new version or tap Humanize…'
                              : 'Write a new version, then Save.'
                          }
                          className="box-border h-full min-h-[7rem] w-full flex-1 resize-y overflow-y-auto rounded-xl border border-orange-200/90 bg-white px-3 py-2.5 text-[15px] leading-relaxed text-zinc-900 shadow-inner outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/80"
                          spellCheck
                          aria-label="New snippet text"
                        />
                      </div>
                    </div>
                  </div>

                  {snippetHumanizeEnabled &&
                  draft.trim().length < UNDETECTABLE_MIN_CHARS &&
                  beforeText.trim().length < UNDETECTABLE_MIN_CHARS ? (
                    <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-xs leading-relaxed text-amber-950">
                      <span className="font-semibold">Why Humanize is disabled:</span> Undetectable
                      requires at least {UNDETECTABLE_MIN_CHARS} characters — there isn&apos;t enough to
                      rewrite in one short sentence. Edit manually in After, or merge neighboring sentences
                      in the essay and try again.
                    </p>
                  ) : null}

                  <div
                    className={cn(
                      'mt-4 border-t border-zinc-100 pt-4',
                      snippetHumanizeEnabled
                        ? 'grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3'
                        : 'flex flex-wrap items-center gap-2'
                    )}
                  >
                    <div
                      className={cn(
                        'flex w-full flex-wrap items-center justify-start gap-2',
                        snippetHumanizeEnabled ? 'sm:w-auto' : ''
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(null)}
                        className="inline-flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 sm:flex-none"
                      >
                        Cancel
                        <X className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={!draft.trim()}
                        title={
                          !draft.trim()
                            ? 'Enter text in After first'
                            : 'Replace snippet in essay'
                        }
                        onClick={() => {
                          if (userEditedAfterOpenRef.current) {
                            onManualSnippetTouchRecorded?.();
                          }
                          onSaveUserEdit!(i, draft);
                          setOpenIndex(null);
                        }}
                        className="inline-flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-200 sm:flex-none"
                      >
                        Save
                        <Check className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
                      </button>
                    </div>
                    {snippetHumanizeEnabled ? (
                      <>
                        <div
                          className="hidden min-h-[2.5rem] shrink-0 sm:block sm:w-9"
                          aria-hidden
                        />
                        <div className="flex w-full justify-stretch sm:justify-end">
                          <button
                            type="button"
                            disabled={
                              undetectLoading ||
                              (!humanizeSnippetPremiumLocked &&
                                draft.trim().length < UNDETECTABLE_MIN_CHARS &&
                                beforeText.trim().length < UNDETECTABLE_MIN_CHARS)
                            }
                            title={
                              humanizeSnippetPremiumLocked
                                ? 'Subscription required — tap to see plans'
                                : draft.trim().length >= UNDETECTABLE_MIN_CHARS
                                  ? 'Rewrite After text via Undetectable.AI'
                                  : beforeText.trim().length >= UNDETECTABLE_MIN_CHARS
                                    ? `Rewrite Before (${UNDETECTABLE_MIN_CHARS}+ chars) and insert into After`
                                    : `Need at least ${UNDETECTABLE_MIN_CHARS} characters in Before or After — short phrases need manual edits`
                            }
                            onClick={async () => {
                              if (
                                humanizeSnippetPremiumLocked &&
                                onHumanizeSnippetPremiumBlocked
                              ) {
                                onHumanizeSnippetPremiumBlocked();
                                return;
                              }
                              const payload =
                                draft.trim().length >= UNDETECTABLE_MIN_CHARS
                                  ? draft
                                  : beforeText;
                              setUndetectLoading(true);
                              try {
                                const res = await fetch(
                                  '/api/essay/undetectable-humanize',
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ text: payload })
                                  }
                                );
                                const data = (await res.json()) as {
                                  output?: string;
                                  error?: string;
                                };
                                if (!res.ok) {
                                  if (res.status === 403) {
                                    onHumanizeSnippetPremiumBlocked?.();
                                    return;
                                  }
                                  throw new Error(
                                    friendlyUndetectableError(
                                      data.error || `Error ${res.status}`
                                    )
                                  );
                                }
                                if (typeof data.output === 'string' && data.output) {
                                  userEditedAfterOpenRef.current = false;
                                  setDraft(data.output);
                                  toast({
                                    title: 'Done',
                                    description:
                                      'Text inserted in After. Review and tap Save.'
                                  });
                                } else {
                                  throw new Error('Empty service response');
                                }
                              } catch (e) {
                                const raw =
                                  e instanceof Error
                                    ? e.message
                                    : 'Request failed';
                                toast({
                                  variant: 'destructive',
                                  title: 'Undetectable.AI',
                                  description: friendlyUndetectableError(raw)
                                });
                              } finally {
                                setUndetectLoading(false);
                              }
                            }}
                            className={cn(
                              'inline-flex min-h-[2.5rem] w-full items-center justify-center gap-2 rounded-full bg-[#FF7A1A] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[11rem]'
                            )}
                            aria-label={
                              humanizeSnippetPremiumLocked
                                ? 'Humanize snippet — subscription required'
                                : 'Humanize snippet with Undetectable.AI'
                            }
                          >
                            {undetectLoading ? (
                              <Loader2
                                className="h-4 w-4 shrink-0 animate-spin text-white"
                                aria-hidden
                              />
                            ) : (
                              <Wand2
                                className="h-4 w-4 shrink-0 text-white"
                                aria-hidden
                              />
                            )}
                            {humanizeSnippetPremiumLocked && !undetectLoading ? (
                              <Lock
                                className="h-3.5 w-3.5 shrink-0 text-black"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                            ) : null}
                            Humanize
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

/** “Original” / “Magic Fix” tabs above the essay body (legacy layout). */
export function EssayVersionTabs(props: {
  active: 'original' | 'magic';
  onChange: (tab: 'original' | 'magic') => void;
  showMagicTab: boolean;
}) {
  const { active, onChange, showMagicTab } = props;

  return (
    <div
      className="mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-between sm:gap-3"
      role="tablist"
      aria-label="Essay versions"
    >
      <div className="inline-flex w-full max-w-md rounded-xl border border-zinc-200 bg-white p-1 shadow-sm sm:w-auto">
        <button
          type="button"
          role="tab"
          aria-selected={active === 'original'}
          onClick={() => onChange('original')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4',
            active === 'original'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
          )}
        >
          <span aria-hidden className="mr-1.5">
            🚩
          </span>
          Original
        </button>
        {showMagicTab ? (
          <button
            type="button"
            role="tab"
            aria-selected={active === 'magic'}
            onClick={() => onChange('magic')}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4',
              active === 'magic'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            )}
          >
            Magic Fix <span aria-hidden>✨</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Two-column compare toggle (only when two versions exist). */
export function CompareSideBySideToggle(props: {
  enabled: boolean;
  active: boolean;
  onToggle: () => void;
}) {
  const { enabled, active, onToggle } = props;
  if (!enabled) return null;

  return (
    <div className="mb-4 flex justify-center lg:justify-end">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition lg:inline-flex',
          active
            ? 'border-orange-400 bg-orange-50 text-orange-950'
            : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
        )}
      >
        <Columns2 className="h-4 w-4 shrink-0" aria-hidden />
        {active ? 'Single column' : 'Compare side by side'}
      </button>
    </div>
  );
}

export type EssayAiDetectorChoice = 'gptzero' | 'undetectable';

export type { UndetectableHumanizeModelId } from '@/lib/essay/undetectableHumanizeModels';

/** Dropdown of Undetectable Humanization API models, then runs “Humanize entire draft”. */
export function EssayHumanizeEntireDraftSlot(props: {
  humanizeLoading: boolean;
  disabled: boolean;
  onHumanize: (model: UndetectableHumanizeModelId) => void;
  /** Without a subscription: show a lock and call `onPremiumBlocked` instead of `onHumanize`. */
  premiumLocked?: boolean;
  onPremiumBlocked?: () => void;
}) {
  const {
    humanizeLoading,
    disabled,
    onHumanize,
    premiumLocked = false,
    onPremiumBlocked
  } = props;
  const [open, setOpen] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openMenu = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    leaveTimerRef.current = setTimeout(() => setOpen(false), 220);
  };

  const pick = (model: UndetectableHumanizeModelId) => {
    if (premiumLocked) {
      setOpen(false);
      onPremiumBlocked?.();
      return;
    }
    try {
      localStorage.setItem(ESSAY_HUMANIZE_MODEL_STORAGE_KEY, model);
    } catch {
      /* ignore */
    }
    setOpen(false);
    onHumanize(model);
  };

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 w-full sm:w-auto sm:min-w-[10.5rem] sm:flex-none"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || humanizeLoading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={
          premiumLocked
            ? 'Humanize entire draft — subscription required'
            : 'Humanize entire draft — choose strength'
        }
        title="Sends the full essay to Undetectable.AI in one request. For Spanish or other non-English text, use Balanced (multilingual). English-only drafts can use the English-focused options. Merge & re-check first if you edited sentences locally."
        className="inline-flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-zinc-200/95 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {humanizeLoading ? (
            <Loader2
              className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin text-[#FF7A1A]"
              aria-hidden
            />
          ) : (
            <Wand2
              className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#FF7A1A]"
              strokeWidth={2}
              aria-hidden
            />
          )}
          {premiumLocked ? (
            <Lock
              className="h-3.5 w-3.5 shrink-0 text-[#FF7A1A]"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
          <span className="min-w-0 leading-snug sm:truncate sm:max-w-[11rem]">
            Humanize entire draft
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Undetectable humanization models"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-[min(70vh,22rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-200/95 bg-white py-1 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.06]"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          {UNDETECTABLE_HUMANIZE_MODEL_OPTIONS.map((opt, i) => (
            <li
              key={opt.id}
              role="option"
              className={i > 0 ? 'border-t border-zinc-100' : undefined}
            >
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
                disabled={disabled || humanizeLoading}
                onClick={() => pick(opt.id)}
              >
                <span className="flex w-full items-center gap-1.5 font-semibold">
                  {opt.title}
                  {premiumLocked ? (
                    <Lock
                      className="h-3 w-3 shrink-0 text-[#FF7A1A]"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="text-xs font-normal leading-snug text-zinc-500">
                  {opt.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Primary toolbar slot: detector choice (GPTZero or Undetectable.AI) in a dropdown. */
export function EssayCheckOrHumanizeSlot(props: {
  checkLabel: string;
  checkLoading: boolean;
  disabled: boolean;
  onCheckAi: (detector: EssayAiDetectorChoice) => void;
}) {
  const { checkLabel, checkLoading, disabled, onCheckAi } = props;
  const [open, setOpen] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openMenu = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    leaveTimerRef.current = setTimeout(() => setOpen(false), 220);
  };

  const pick = (detector: EssayAiDetectorChoice) => {
    setOpen(false);
    onCheckAi(detector);
  };

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 w-full sm:w-auto sm:min-w-[10.5rem] sm:flex-none"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || checkLoading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={checkLabel}
        className="inline-flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-zinc-200/95 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {checkLoading ? (
            <Loader2
              className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin text-[#FF7A1A]"
              aria-hidden
            />
          ) : (
            <Sparkles
              className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#FF7A1A]"
              strokeWidth={2}
              aria-hidden
            />
          )}
          <span className="min-w-0 leading-snug sm:truncate">{checkLabel}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] overflow-hidden rounded-xl border border-zinc-200/95 bg-white py-1 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.06]"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <li role="option">
            <button
              type="button"
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
              disabled={disabled || checkLoading}
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
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
              disabled={disabled || checkLoading}
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

/** Legacy CTA — only when Human Score exists and is below 80%. */
export function MagicHumanizeButton(props: {
  humanScore: number | null;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { humanScore, loading, disabled, onClick } = props;
  if (humanScore === null || humanScore >= 80) return null;

  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#FF7A1A] px-4 py-2.5 text-center text-xs font-semibold leading-tight text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:text-sm sm:leading-normal"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Wand2 className="h-4 w-4 shrink-0" aria-hidden />
        )}
        Run AI check
      </button>
    </div>
  );
}
