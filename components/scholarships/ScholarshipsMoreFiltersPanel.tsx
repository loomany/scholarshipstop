'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Lock, X } from 'lucide-react';

import type {
  CitizenshipAudienceFilter,
  DeadlinePreset,
  MoreFiltersState
} from '@/app/scholarships/moreFilters';
import {
  scholarshipGuestLockIconClass,
  scholarshipSaveFilterButtonClass,
  scholarshipSeeResultsButtonClass
} from '@/lib/constants/scholarshipActionUi';
import { REQUIREMENT_TYPE_OPTIONS } from '@/app/scholarships/moreFilters';
import { UsStateAutocomplete } from '@/components/onboarding/UsStateAutocomplete';
import { SITE_SEARCH_INPUT_CHROME } from '@/lib/constants/catalogControlBar';
import {
  EASY_APPLY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  ELIGIBILITY_OPTIONS
} from '@/lib/scholarships/scholarshipCatalog';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  SCHOLARSHIP_GPA_BUCKET_OPTIONS,
  SCHOLARSHIP_GPA_OPTIONS,
  SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY
} from '@/lib/constants/scholarshipGpaOptions';
import {
  SUBSCRIPTION_LOCKED_EASY_APPLY_IDS
} from '@/lib/scholarships/subscriptionLockedCategory';

type Bounds = {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
};

/** Optional callouts for hub tab scope (easy apply / hot deadlines / best profile, etc.). */
export type ScholarshipsMoreFiltersContextNotice = {
  key: string;
  title: string;
  body: string;
  learnMoreHref?: string;
  learnMoreLabel?: string;
};

type ScholarshipsMoreFiltersPanelProps = {
  open: boolean;
  onClose: () => void;
  bounds: Bounds;
  value: MoreFiltersState;
  onChange: (next: MoreFiltersState) => void;
  onClear: () => void;
  onApply: () => void;
  applyPending?: boolean;
  /** Hub: explain tab-only SQL / profile layers above the form. */
  contextNotices?: ScholarshipsMoreFiltersContextNotice[];
  /** Persist current draft as the “Saved filters” tab preset (hub). */
  onSaveFilter?: () => void;
  /** False when nothing is selected vs defaults or guest. */
  saveFilterEnabled?: boolean;
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

const DualRangeSlider = memo(function DualRangeSlider({
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
});
DualRangeSlider.displayName = 'DualRangeSlider';

const sectionTitle = 'text-sm font-bold text-zinc-900';
const sectionHint = 'mt-1 text-xs text-zinc-500';
const divider = 'border-t border-zinc-200';

const filterPanelStateInputClass = `w-full px-3 py-2.5 text-left text-sm text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`;

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

type CheckboxGroupOption = {
  id: string;
  label: string;
  locked?: boolean;
};

type ProfileSelectOption = {
  value: string;
  label: string;
};

function ProfileSelectField({
  id,
  label,
  value,
  options,
  onChange,
  helper
}: {
  id: string;
  label: string;
  value: string;
  options: readonly ProfileSelectOption[];
  onChange: (value: string) => void;
  helper?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';

  return (
    <div className="relative">
      <span className="mb-1.5 block text-sm font-medium text-zinc-800" id={`${id}-label`}>
        {label}
      </span>
      <button
        type="button"
        id={id}
        aria-labelledby={`${id}-label ${id}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[90] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg ring-1 ring-zinc-900/5">
          <ul className="max-h-72 overflow-y-auto overscroll-contain px-2 py-1" role="listbox" aria-labelledby={`${id}-label`}>
            {options.map((option) => (
              <li key={option.value || 'any'} role="option" aria-selected={value === option.value}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded border ${
                      value === option.value
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-zinc-200 bg-white'
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                    {option.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {helper ? (
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
          {helper}
        </span>
      ) : null}
    </div>
  );
}

const FilterCheckboxGroup = memo(function FilterCheckboxGroup({
  options,
  selected,
  onCheckedChange,
  columnsClassName = 'grid grid-cols-1 gap-2 sm:grid-cols-2'
}: {
  options: readonly CheckboxGroupOption[];
  selected: Set<string>;
  onCheckedChange: (id: string, checked: boolean) => void;
  columnsClassName?: string;
}) {
  return (
    <div className={columnsClassName}>
      {options.map((opt) => (
        <label
          key={opt.id}
          className="flex cursor-pointer items-start gap-2"
        >
          <input
            type="checkbox"
            checked={selected.has(opt.id)}
            onChange={(e) => onCheckedChange(opt.id, e.target.checked)}
            className="scholarship-filter-checkbox mt-0.5 h-4 w-4 shrink-0"
          />
          <span className="inline-flex items-center gap-1 text-sm text-zinc-800">
            {opt.label}
            {opt.locked ? (
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
  );
});
FilterCheckboxGroup.displayName = 'FilterCheckboxGroup';

type UniversitySuggestion = {
  slug: string;
  label: string;
  stateCode: string | null;
  scholarshipCount: number;
};

function UniversityAutocomplete({
  value,
  stateInput,
  onInputChange,
  onSelect,
  inputClassName,
  subscriptionLocked = false
}: {
  value: string;
  stateInput: string;
  onInputChange: (next: string) => void;
  onSelect: (item: UniversitySuggestion) => void;
  inputClassName: string;
  /** Signed-in user without active subscription — no typing or suggestions. */
  subscriptionLocked?: boolean;
}) {
  const genId = useId();
  const listboxId = `${genId}-listbox`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<UniversitySuggestion[]>([]);

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

  useEffect(() => {
    if (subscriptionLocked) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    if (!open) {
      setLoading(false);
      return;
    }
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setLoading(true);
        const sp = new URLSearchParams({
          q: query,
          limit: '8'
        });
        const trimmedState = stateInput.trim();
        if (trimmedState) {
          sp.set('state', trimmedState);
        }
        const res = await fetch(
          `/api/scholarships/university-suggestions?${sp.toString()}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error('suggestions failed');
        const data = (await res.json()) as {
          suggestions?: UniversitySuggestion[];
        };
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setHighlight(0);
      } catch (error) {
        if (ctrl.signal.aborted) return;
        setSuggestions([]);
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [open, stateInput, value, subscriptionLocked]);

  const pick = useCallback(
    (item: UniversitySuggestion) => {
      onSelect(item);
      setOpen(false);
      setHighlight(0);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (subscriptionLocked) return;
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

  const showEmpty = open && !loading && value.trim().length >= 2 && suggestions.length === 0;

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label="University filter"
        placeholder="Type a university, e.g. Texas…"
        className={`${inputClassName}${
          subscriptionLocked ? ' cursor-default bg-zinc-50 pr-10' : ''
        }`}
        value={value}
        readOnly={subscriptionLocked}
        tabIndex={subscriptionLocked ? -1 : 0}
        onChange={(e) => {
          if (subscriptionLocked) return;
          onInputChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          if (subscriptionLocked) return;
          if (value.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {subscriptionLocked ? (
        <Lock
          className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${scholarshipGuestLockIconClass}`}
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
      {open && (loading || suggestions.length > 0 || showEmpty) ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="University suggestions"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <div className="px-4 py-2.5 text-sm text-zinc-500">Searching universities...</div>
          ) : null}
          {!loading
            ? suggestions.map((item, idx) => (
                <button
                  key={item.slug}
                  type="button"
                  role="option"
                  aria-selected={idx === highlight}
                  className={`block w-full px-4 py-2.5 text-left hover:bg-zinc-50 ${idx === highlight ? 'bg-zinc-100' : ''}`}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pick(item)}
                >
                  <span className="block text-sm font-medium text-zinc-900">
                    {item.label}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {[item.stateCode, `${item.scholarshipCount} scholarships`]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </button>
              ))
            : null}
          {showEmpty ? (
            <div className="px-4 py-2.5 text-sm text-zinc-500">No universities found.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ScholarshipsMoreFiltersPanel({
  open,
  onClose,
  bounds,
  value,
  onChange,
  onClear,
  onApply,
  applyPending = false,
  onSaveFilter,
  saveFilterEnabled = false,
  previewCount,
  previewCountLoading,
  previewCountFallback = null,
  locationOptions,
  isAuthenticated = true,
  onGuestLockedAction,
  hasSubscription = true,
  onSubscriptionLockedAction,
  contextNotices
}: ScholarshipsMoreFiltersPanelProps) {
  const [showSlowPreviewIndicator, setShowSlowPreviewIndicator] = useState(false);

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

  useEffect(() => {
    if (!open || !previewCountLoading) {
      setShowSlowPreviewIndicator(false);
      return;
    }
    const t = window.setTimeout(() => {
      setShowSlowPreviewIndicator(true);
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, previewCountLoading]);

  if (!open) return null;
  const applySubscriptionLocked = !hasSubscription;
  const targetedCategoryLockAction = !hasSubscription
    ? onSubscriptionLockedAction ?? onGuestLockedAction
    : undefined;
  const amountLocked = false;
  const eligibilityLocked = false;
  const applicantsLocked = false;
  const universityLocked = false;
  const deadlineShortRangeLocked = false;
  const internationalAudienceGated = !hasSubscription;
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

  const profileSchoolLevelOptions = [
    { value: '', label: 'Any school level' },
    ...SCHOOL_LEVEL_OPTIONS
  ];
  const profileFieldOfStudyOptions = [
    { value: '', label: 'Any field of study' },
    ...FIELD_OF_STUDY_OPTIONS
  ];
  const profileCitizenshipOptions = [
    { value: '', label: 'Any citizenship status' },
    ...CITIZENSHIP_OPTIONS
  ];
  const gpaSelectOptions = [
    { value: '', label: 'Any GPA' },
    {
      value: SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY,
      label: 'Prefer not to say (optional)'
    },
    ...SCHOLARSHIP_GPA_BUCKET_OPTIONS,
    ...SCHOLARSHIP_GPA_OPTIONS
  ];
  const requirementOptions = REQUIREMENT_TYPE_OPTIONS;
  const educationOptions = EDUCATION_LEVEL_OPTIONS;
  const easyApplyOptions: CheckboxGroupOption[] = EASY_APPLY_OPTIONS.map((opt) => ({
    id: opt.id,
    label: opt.label,
    locked: !hasSubscription && SUBSCRIPTION_LOCKED_EASY_APPLY_IDS.has(opt.id)
  }));

  const onRequirementCheckedChange = (id: string, checked: boolean) => {
    const next = new Set(value.includeRequirementTypes);
    if (checked) next.add(id);
    else next.delete(id);
    onChange({ ...value, includeRequirementTypes: next });
  };

  const onEducationCheckedChange = (id: string, checked: boolean) =>
    onChange({
      ...value,
      includeEducationLevels: toggleInSet(
        value.includeEducationLevels,
        id,
        checked
      )
    });

  const onEasyApplyCheckedChange = (id: string, checked: boolean) => {
    const optionLocked =
      !hasSubscription &&
      SUBSCRIPTION_LOCKED_EASY_APPLY_IDS.has(id);
    if (optionLocked) {
      targetedCategoryLockAction?.();
      return;
    }
    onChange({
      ...value,
      includeEasyApply: toggleInSet(value.includeEasyApply, id, checked)
    });
  };

  const clearStudentProfileChoices = () => {
    onChange({
      ...value,
      profileSchoolLevelSlug: '',
      profileFieldOfStudySlug: '',
      profileCitizenshipStatus: ''
    });
  };

  const previewLabel = (() => {
    if (applyPending) return 'Applying filters...';
    if (previewCountLoading) {
      const continuityCount = previewCount ?? previewCountFallback;
      if (continuityCount != null) {
        return `Calculating... (${continuityCount})`;
      }
      return 'Calculating...';
    }
    const effectiveCount = previewCount ?? previewCountFallback;
    if (effectiveCount == null) return 'Show results';
    if (previewCountLoading) return `Show ${effectiveCount} results`;
    return `Show ${effectiveCount} results`;
  })();
  const applyButtonBusy = applyPending || previewCountLoading;

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
        {showSlowPreviewIndicator ? (
          <div
            className="h-0.5 w-full animate-pulse bg-emerald-500/70"
            aria-hidden
          />
        ) : null}
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
          {contextNotices && contextNotices.length > 0 ? (
            <div className="space-y-3 border-b border-zinc-200 py-4">
              {contextNotices.map((n) => (
                <div
                  key={n.key}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-600">
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-zinc-800">{n.body}</p>
                  {n.learnMoreHref && n.learnMoreLabel ? (
                    <p className="mt-2">
                      <Link
                        href={n.learnMoreHref}
                        className="text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline"
                      >
                        {n.learnMoreLabel}
                      </Link>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <section className={`py-5 ${divider}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={sectionTitle}>Student profile</h3>
                <p className={sectionHint}>
                  Add the quiz-style profile choices that are not covered by the
                  advanced filters below.
                </p>
              </div>
              <button
                type="button"
                onClick={clearStudentProfileChoices}
                className="shrink-0 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
              >
                Clear
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <ProfileSelectField
                id="profile-school-level"
                label="Current school level"
                value={value.profileSchoolLevelSlug}
                options={profileSchoolLevelOptions}
                onChange={(profileSchoolLevelSlug) =>
                  onChange({ ...value, profileSchoolLevelSlug })
                }
              />
              <ProfileSelectField
                id="profile-field-of-study"
                label="Field of study"
                value={value.profileFieldOfStudySlug}
                options={profileFieldOfStudyOptions}
                onChange={(profileFieldOfStudySlug) =>
                  onChange({ ...value, profileFieldOfStudySlug })
                }
              />
              <ProfileSelectField
                id="profile-citizenship-status"
                label="Citizenship status"
                value={value.profileCitizenshipStatus}
                options={profileCitizenshipOptions}
                onChange={(profileCitizenshipStatus) =>
                  onChange({ ...value, profileCitizenshipStatus })
                }
              />
            </div>
          </section>

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
                            onGuestLockedAction?.();
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
            <h3 className={sectionTitle}>Citizenship & eligibility</h3>
            <p className={sectionHint}>
              Narrow listings that explicitly mention international students, foreign
              nationals, or similar in our catalog fields. Always confirm rules on the
              official program page—this is not legal or visa advice.
            </p>
            <ul className="mt-4 space-y-3">
              {(
                [
                  ['any', 'All applicants (default)'],
                  [
                    'international_friendly',
                    'International Friendly (best effort)'
                  ]
                ] as const
              ).map(([id, label]) => {
                const optionLocked =
                  id === 'international_friendly' && internationalAudienceGated;
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="citizenship-audience"
                        checked={value.citizenshipAudience === id}
                        onChange={() => {
                          if (optionLocked) {
                            targetedCategoryLockAction?.();
                            return;
                          }
                          onChange({
                            ...value,
                            citizenshipAudience: id as CitizenshipAudienceFilter
                          });
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
                  onClick={() => onGuestLockedAction?.()}
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
            <div className="mt-4">
              <FilterCheckboxGroup
                options={requirementOptions}
                selected={value.includeRequirementTypes}
                onCheckedChange={onRequirementCheckedChange}
                columnsClassName="grid grid-cols-2 gap-x-4 gap-y-3"
              />
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
                  onClick={() => onGuestLockedAction?.()}
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
                  onClick={() => onGuestLockedAction?.()}
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
            <div className="mt-4">
              <FilterCheckboxGroup
                options={educationOptions}
                selected={value.includeEducationLevels}
                onCheckedChange={onEducationCheckedChange}
              />
            </div>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>GPA</h3>
            <p className={sectionHint}>
              Choose the GPA level you want scholarship requirements matched against.
            </p>
            <div className="mt-4">
              <ProfileSelectField
                id="more-filters-gpa"
                label="GPA"
                value={value.gpaChoice}
                options={gpaSelectOptions}
                onChange={(next) =>
                  onChange({
                    ...value,
                    gpaChoice: next,
                    includeGpaBuckets: new Set()
                  })
                }
              />
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
              University
              {universityLocked ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Lock
                    className={`h-3 w-3 ${scholarshipGuestLockIconClass}`}
                    strokeWidth={2}
                  />
                  Locked
                </span>
              ) : null}
            </h3>
            <p className={sectionHint}>
              Start typing a university name and choose a suggestion from our indexed
              catalog to narrow results to that school.
            </p>
            <div className="relative mt-4">
              {universityLocked ? (
                <button
                  type="button"
                  aria-label="Unlock Premium to filter by university"
                  title="Unlock Premium to filter by university"
                  onClick={() => onGuestLockedAction?.()}
                  className="absolute inset-0 z-10 cursor-pointer rounded-xl"
                />
              ) : null}
              <UniversityAutocomplete
                value={value.filterUniversityInput}
                stateInput={value.filterStateInput}
                onInputChange={(next) =>
                  onChange({
                    ...value,
                    filterUniversityInput: next,
                    filterUniversitySlug: null
                  })
                }
                onSelect={(item) =>
                  onChange({
                    ...value,
                    filterUniversityInput: item.label,
                    filterUniversitySlug: item.slug
                  })
                }
                inputClassName={filterPanelStateInputClass}
                subscriptionLocked={universityLocked}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Enter at least 2 characters. Filtering applies after you choose a
              suggestion.
            </p>
          </section>

          <section className={`py-5 ${divider}`}>
            <h3 className={sectionTitle}>
              Easy apply
            </h3>
            <p className={sectionHint}>
              Highlights no-essay and lighter applications when we can detect
              them (OR).
            </p>
            <div className="mt-4">
              <FilterCheckboxGroup
                options={easyApplyOptions}
                selected={value.includeEasyApply}
                onCheckedChange={onEasyApplyCheckedChange}
              />
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

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-4">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md text-sm font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-0"
          >
            Clear
          </button>
          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {onSaveFilter ? (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    onGuestLockedAction?.();
                    return;
                  }
                  onSaveFilter();
                }}
                disabled={isAuthenticated ? !saveFilterEnabled : false}
                title={
                  !isAuthenticated
                    ? 'Save filter preset after you start your free trial'
                    : undefined
                }
                className={`${scholarshipSaveFilterButtonClass} ${!isAuthenticated ? 'opacity-95' : ''}`}
              >
                {!isAuthenticated ? (
                  <Lock
                    className="mr-1.5 inline-block h-3.5 w-3.5 shrink-0 text-white"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
                Save filter
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (applyButtonBusy) return;
                if (applySubscriptionLocked) {
                  (onSubscriptionLockedAction ?? onGuestLockedAction)?.();
                  return;
                }
                onApply();
              }}
              disabled={applyButtonBusy}
              aria-busy={applyButtonBusy}
              title={
                applySubscriptionLocked
                  ? 'Premium subscription required to apply filters'
                  : undefined
              }
              className={`${scholarshipSeeResultsButtonClass} ${applySubscriptionLocked ? 'opacity-95' : ''} ${
                applyButtonBusy ? 'opacity-50' : ''
              }`}
            >
              {previewCountLoading && !applyPending ? (
                <span
                  className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-white"
                  aria-hidden
                />
              ) : null}
              {applySubscriptionLocked ? (
                <Lock
                  className={`mr-1.5 inline-block h-3.5 w-3.5 ${scholarshipGuestLockIconClass}`}
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
              {previewLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
