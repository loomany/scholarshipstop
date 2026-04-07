'use client';

import { useEffect } from 'react';
import { Lock, X } from 'lucide-react';

import type { DeadlinePreset, MoreFiltersState } from '@/app/scholarships/moreFilters';
import {
  scholarshipGuestLockIconClass,
  scholarshipSeeResultsButtonClass
} from '@/lib/constants/scholarshipActionUi';
import { REQUIREMENT_TYPE_OPTIONS } from '@/app/scholarships/moreFilters';
import { UsStateAutocomplete } from '@/components/onboarding/UsStateAutocomplete';
import {
  EASY_APPLY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  ELIGIBILITY_OPTIONS,
  GPA_BUCKET_OPTIONS
} from '@/lib/scholarships/scholarshipCatalog';

type Bounds = {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
};

type ScholarshipsMoreFiltersPanelProps = {
  open: boolean;
  onClose: () => void;
  bounds: Bounds;
  value: MoreFiltersState;
  onChange: (next: MoreFiltersState) => void;
  onClear: () => void;
  onApply: () => void;
  previewCount: number | null;
  previewCountLoading: boolean;
  previewCountFallback?: number | null;
  /** State names from loaded scholarships (excludes unknown free text). */
  locationOptions: string[];
  isAuthenticated?: boolean;
  onGuestLockedAction?: () => void;
  hasSubscription?: boolean;
  onSubscriptionLockedAction?: () => void;
};

function DualRangeSlider({
  minBound,
  maxBound,
  low,
  high,
  onLow,
  onHigh,
  disabled = false
}: {
  minBound: number;
  maxBound: number;
  low: number;
  high: number;
  onLow: (n: number) => void;
  onHigh: (n: number) => void;
  disabled?: boolean;
}) {
  const span = Math.max(maxBound - minBound, 1);
  const p1 = ((low - minBound) / span) * 100;
  const p2 = ((high - minBound) / span) * 100;

  return (
    <div className="scholarship-dual-range px-1 pt-2 pb-1">
      <div className="relative mx-1 h-7">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-100" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-500"
          style={{
            left: `${p1}%`,
            width: `${Math.max(p2 - p1, 0)}%`
          }}
        />
        <input
          type="range"
          min={minBound}
          max={maxBound}
          value={low}
          disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onChange={(e) => {
            if (disabled) return;
            const v = Number(e.target.value);
            onLow(Math.min(v, high));
          }}
          className="scholarship-dual-range__input"
          aria-label="Minimum"
        />
        <input
          type="range"
          min={minBound}
          max={maxBound}
          value={high}
          disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onChange={(e) => {
            if (disabled) return;
            const v = Number(e.target.value);
            onHigh(Math.max(v, low));
          }}
          className="scholarship-dual-range__input scholarship-dual-range__input--top"
          aria-label="Maximum"
        />
      </div>
    </div>
  );
}

const sectionTitle = 'text-sm font-bold text-zinc-900';
const sectionHint = 'mt-1 text-xs text-zinc-500';
const divider = 'border-t border-zinc-200';

const filterPanelStateInputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

function toggleInSet(
  prev: Set<string>,
  id: string,
  on: boolean
): Set<string> {
  const next = new Set(prev);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export default function ScholarshipsMoreFiltersPanel({
  open,
  onClose,
  bounds,
  value,
  onChange,
  onClear,
  onApply,
  previewCount,
  previewCountLoading,
  previewCountFallback = null,
  locationOptions,
  isAuthenticated = true,
  onGuestLockedAction,
  hasSubscription = true,
  onSubscriptionLockedAction
}: ScholarshipsMoreFiltersPanelProps) {
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const easyApplyLocked = isAuthenticated && !hasSubscription;
  const amountLocked = isAuthenticated && !hasSubscription;
  const eligibilityLocked = isAuthenticated && !hasSubscription;
  const applicantsLocked = isAuthenticated && !hasSubscription;
  const deadlineShortRangeLocked = isAuthenticated && !hasSubscription;
  const SUBSCRIPTION_LOCKED_EASY_APPLY_IDS = new Set([
    'easy_apply',
    'quick_apply'
  ]);
  const SUBSCRIPTION_LOCKED_DEADLINE_PRESETS = new Set<DeadlinePreset>([
    'lt1d',
    'd1_7'
  ]);

  const setDeadline = (deadlinePreset: MoreFiltersState['deadlinePreset']) =>
    onChange({ ...value, deadlinePreset });

  const toggleRequirementType = (id: string) => {
    const next = new Set(value.includeRequirementTypes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...value, includeRequirementTypes: next });
  };

  const setDataComp = (
    key: keyof MoreFiltersState['dataCompleteness'],
    v: boolean
  ) =>
    onChange({
      ...value,
      dataCompleteness: { ...value.dataCompleteness, [key]: v }
    });

  const setPayout = (key: keyof MoreFiltersState['payout'], v: boolean) =>
    onChange({
      ...value,
      payout: { ...value.payout, [key]: v }
    });

  const previewLabel = (() => {
    if (previewCountLoading) return 'Updating...';
    const effectiveCount = previewCount ?? previewCountFallback;
    if (effectiveCount == null) return 'See results';
    return `See ${effectiveCount} results`;
  })();

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(92vh,800px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-filters-title"
      >
        <header
          className={`flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-4`}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <h2
            id="more-filters-title"
            className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-zinc-900"
          >
            More Filters
          </h2>
          <span className="w-9" aria-hidden />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>
              Filter by time until deadline
              {deadlineShortRangeLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Lock className={`h-3 w-3 ${scholarshipGuestLockIconClass}`} strokeWidth={2} />
                  Locked
                </span>
              ) : null}
            </h3>
            <ul className="mt-4 space-y-3">
              {(
                [
                  ['any', 'Any'],
                  ['lt1d', 'Less than 1 day'],
                  ['d1_7', '1 - 7 days'],
                  ['w1_4', '1 - 4 weeks'],
                  ['gt4w', 'More than 4 weeks']
                ] as const
              ).map(([id, label]) => {
                const presetId = id as DeadlinePreset;
                const optionLocked =
                  deadlineShortRangeLocked &&
                  SUBSCRIPTION_LOCKED_DEADLINE_PRESETS.has(presetId);
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="deadline-preset"
                        checked={value.deadlinePreset === id}
                        onChange={() => {
                          if (optionLocked) {
                            onSubscriptionLockedAction?.();
                            return;
                          }
                          setDeadline(presetId);
                        }}
                        className="scholarship-deadline-radio h-4 w-4 shrink-0"
                      />
                      <span className="inline-flex items-center gap-1.5 text-sm text-zinc-800">
                        {label}
                        {optionLocked ? (
                          <Lock
                            className={`h-3.5 w-3.5 ${scholarshipGuestLockIconClass}`}
                            strokeWidth={2}
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>
              Filter by scholarship amount
              {amountLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Lock className={`h-3 w-3 ${scholarshipGuestLockIconClass}`} strokeWidth={2} />
                  Locked
                </span>
              ) : null}
            </h3>
            <div className="relative mt-4">
              {amountLocked ? (
                <button
                  type="button"
                  aria-label="Start your free access to use amount filter"
                  title="Start your free access to use amount filter"
                  onClick={() => onSubscriptionLockedAction?.()}
                  className="absolute inset-0 z-10 cursor-pointer rounded-lg"
                />
              ) : null}
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    $
                  </span>
                  <input
                    type="number"
                    min={bounds.amountMin}
                    max={bounds.amountMax}
                    value={value.amountMin}
                    readOnly={amountLocked}
                    tabIndex={amountLocked ? -1 : 0}
                    onChange={(e) => {
                      if (amountLocked) return;
                      onChange({
                        ...value,
                        amountMin: Math.min(
                          Number(e.target.value) || 0,
                          value.amountMax
                        )
                      });
                    }}
                    className="w-full rounded-lg border border-zinc-200 py-2 pl-7 pr-2 text-sm text-zinc-900"
                  />
                </div>
                <span className="text-zinc-400">—</span>
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    $
                  </span>
                  <input
                    type="number"
                    min={bounds.amountMin}
                    max={bounds.amountMax}
                    value={value.amountMax}
                    readOnly={amountLocked}
                    tabIndex={amountLocked ? -1 : 0}
                    onChange={(e) => {
                      if (amountLocked) return;
                      onChange({
                        ...value,
                        amountMax: Math.max(
                          Number(e.target.value) || 0,
                          value.amountMin
                        )
                      });
                    }}
                    className="w-full rounded-lg border border-zinc-200 py-2 pl-7 pr-2 text-sm text-zinc-900"
                  />
                </div>
              </div>
              <DualRangeSlider
                minBound={bounds.amountMin}
                maxBound={bounds.amountMax}
                low={value.amountMin}
                high={value.amountMax}
                disabled={amountLocked}
                onLow={(n) =>
                  onChange({ ...value, amountMin: Math.min(n, value.amountMax) })
                }
                onHigh={(n) =>
                  onChange({ ...value, amountMax: Math.max(n, value.amountMin) })
                }
              />
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>Application requirements</h3>
            <p className={sectionHint}>
              Show scholarships that require the selected items.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {REQUIREMENT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <input
                    type="checkbox"
                    checked={value.includeRequirementTypes.has(opt.id)}
                    onChange={() => toggleRequirementType(opt.id)}
                    className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm text-zinc-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>
              Filter by number of applicants
              {applicantsLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Lock className={`h-3 w-3 ${scholarshipGuestLockIconClass}`} strokeWidth={2} />
                  Locked
                </span>
              ) : null}
            </h3>
            <div className="relative mt-4">
              {applicantsLocked ? (
                <button
                  type="button"
                  aria-label="Start your free access to use applicants filter"
                  title="Start your free access to use applicants filter"
                  onClick={() => onSubscriptionLockedAction?.()}
                  className="absolute inset-0 z-10 cursor-pointer rounded-lg"
                />
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={bounds.applicantsMin}
                  max={bounds.applicantsMax}
                  value={value.applicantsMin}
                  readOnly={applicantsLocked}
                  tabIndex={applicantsLocked ? -1 : 0}
                  onChange={(e) => {
                    if (applicantsLocked) return;
                    onChange({
                      ...value,
                      applicantsMin: Math.min(
                        Number(e.target.value) || 0,
                        value.applicantsMax
                      )
                    });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
                <span className="text-zinc-400">—</span>
                <input
                  type="number"
                  min={bounds.applicantsMin}
                  max={bounds.applicantsMax}
                  value={value.applicantsMax}
                  readOnly={applicantsLocked}
                  tabIndex={applicantsLocked ? -1 : 0}
                  onChange={(e) => {
                    if (applicantsLocked) return;
                    onChange({
                      ...value,
                      applicantsMax: Math.max(
                        Number(e.target.value) || 0,
                        value.applicantsMin
                      )
                    });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <DualRangeSlider
                minBound={bounds.applicantsMin}
                maxBound={bounds.applicantsMax}
                low={value.applicantsMin}
                high={value.applicantsMax}
                disabled={applicantsLocked}
                onLow={(n) =>
                  onChange({
                    ...value,
                    applicantsMin: Math.min(n, value.applicantsMax)
                  })
                }
                onHigh={(n) =>
                  onChange({
                    ...value,
                    applicantsMax: Math.max(n, value.applicantsMin)
                  })
                }
              />
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>
              Eligibility
              {eligibilityLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Lock className={`h-3 w-3 ${scholarshipGuestLockIconClass}`} strokeWidth={2} />
                  Locked
                </span>
              ) : null}
            </h3>
            <p className={sectionHint}>
              Show scholarships that mention any of these audiences (OR). Empty
              = no filter.
            </p>
            <div className="relative mt-4">
              {eligibilityLocked ? (
                <button
                  type="button"
                  aria-label="Start your free access to use eligibility filter"
                  title="Start your free access to use eligibility filter"
                  onClick={() => onSubscriptionLockedAction?.()}
                  className="absolute inset-0 z-10 cursor-pointer rounded-lg"
                />
              ) : null}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ELIGIBILITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-start gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={value.includeEligibility.has(opt.id)}
                      tabIndex={eligibilityLocked ? -1 : 0}
                      onChange={(e) => {
                        if (eligibilityLocked) return;
                        onChange({
                          ...value,
                          includeEligibility: toggleInSet(
                            value.includeEligibility,
                            opt.id,
                            e.target.checked
                          )
                        });
                      }}
                      className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="inline-flex items-center gap-1 text-sm text-zinc-800">
                      {opt.label}
                      {eligibilityLocked ? (
                        <Lock
                          className={`h-3.5 w-3.5 ${scholarshipGuestLockIconClass}`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>Education level</h3>
            <p className={sectionHint}>
              Show listings that match any selected level (OR).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <input
                    type="checkbox"
                    checked={value.includeEducationLevels.has(opt.id)}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        includeEducationLevels: toggleInSet(
                          value.includeEducationLevels,
                          opt.id,
                          e.target.checked
                        )
                      })
                    }
                    className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm text-zinc-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>GPA</h3>
            <p className={sectionHint}>
              Show scholarships whose stated GPA bar matches any selection (OR).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {GPA_BUCKET_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <input
                    type="checkbox"
                    checked={value.includeGpaBuckets.has(opt.id)}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        includeGpaBuckets: toggleInSet(
                          value.includeGpaBuckets,
                          opt.id,
                          e.target.checked
                        )
                      })
                    }
                    className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm text-zinc-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>Location</h3>
            <p className={sectionHint}>
              Search by U.S. state (matches each listing&apos;s state data). Choose a
              suggestion — partial typing alone does not narrow results until the name is
              valid.
            </p>
            <div className="mt-4">
              <UsStateAutocomplete
                id="more-filters-state"
                ariaLabel="U.S. state filter"
                value={value.filterStateInput}
                onChange={(next) =>
                  onChange({ ...value, filterStateInput: next })
                }
                inputClassName={filterPanelStateInputClass}
                placeholder="Type a state, e.g. Cal…"
                maxSuggestions={8}
              />
            </div>
            {locationOptions.length > 0 ? (
              <div className="mt-3 grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {locationOptions.map((label) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-start gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={value.includeLocationLabels.has(label)}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          includeLocationLabels: toggleInSet(
                            value.includeLocationLabels,
                            label,
                            e.target.checked
                          )
                        })
                      }
                      className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="text-sm text-zinc-800">{label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>
              Easy apply
              {easyApplyLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Lock className={`h-3 w-3 ${scholarshipGuestLockIconClass}`} strokeWidth={2} />
                  Locked
                </span>
              ) : null}
            </h3>
            <p className={sectionHint}>
              Highlights no-essay and lighter applications when we can detect
              them (OR).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EASY_APPLY_OPTIONS.map((opt) => (
                (() => {
                  const optionLocked =
                    easyApplyLocked &&
                    SUBSCRIPTION_LOCKED_EASY_APPLY_IDS.has(opt.id);
                  return (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <input
                    type="checkbox"
                    checked={value.includeEasyApply.has(opt.id)}
                    onChange={(e) => {
                      if (optionLocked) {
                        onSubscriptionLockedAction?.();
                        return;
                      }
                      onChange({
                        ...value,
                        includeEasyApply: toggleInSet(
                          value.includeEasyApply,
                          opt.id,
                          e.target.checked
                        )
                      });
                    }}
                    className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="inline-flex items-center gap-1 text-sm text-zinc-800">
                    {opt.label}
                    {optionLocked ? (
                      <Lock className={`h-3.5 w-3.5 ${scholarshipGuestLockIconClass}`} strokeWidth={2} aria-hidden />
                    ) : null}
                  </span>
                </label>
                  );
                })()
              ))}
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>Data completeness</h3>
            <p className={sectionHint}>
              How much key information we could extract for this listing (deadline,
              apply link, requirements, etc.). Not a score of legitimacy.
            </p>
            <ul className="mt-4 space-y-4">
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.dataCompleteness.low}
                    onChange={(e) => setDataComp('low', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Basic info
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Only a few core fields are filled in.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.dataCompleteness.medium}
                    onChange={(e) => setDataComp('medium', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Standard detail
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      A solid amount of information for comparing programs.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.dataCompleteness.high}
                    onChange={(e) => setDataComp('high', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Detailed listing
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Richer structured fields from the public listing.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.dataCompleteness.verified}
                    onChange={(e) => setDataComp('verified', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Verified listing
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Marked verified — always confirm on the official site.
                    </span>
                  </span>
                </label>
              </li>
            </ul>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>Filter by payout method</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.payout.college}
                    onChange={(e) => setPayout('college', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      College
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Funds are paid to the Financial Aid Office on your behalf.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.payout.student}
                    onChange={(e) => setPayout('student', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Student
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Scholarship funds are paid directly to you.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.payout.nonMonetary}
                    onChange={(e) => setPayout('nonMonetary', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Non-monetary awards
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Prizes that support educational goals (courses,
                      subscriptions, etc.)
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={value.payout.notStated}
                    onChange={(e) => setPayout('notStated', e.target.checked)}
                    className="scholarship-filter-checkbox mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-900">
                      Not Stated
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      Payment process details have not been specified by the
                      provider.
                    </span>
                  </span>
                </label>
              </li>
            </ul>
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-4">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md text-sm font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-0"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                onGuestLockedAction?.();
                return;
              }
              onApply();
            }}
            title={
              !isAuthenticated
                ? 'Apply filters after you create a free account'
                : undefined
            }
            className={`${scholarshipSeeResultsButtonClass} ${!isAuthenticated ? 'opacity-95' : ''}`}
          >
            {!isAuthenticated ? (
              <Lock
                className={`mr-1.5 inline-block h-3.5 w-3.5 ${scholarshipGuestLockIconClass}`}
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
            {previewLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
