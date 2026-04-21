'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  LayoutGrid,
  Lock,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

import {
  SCHOLARSHIP_CATEGORY_LABELS,
  SCHOLARSHIP_CATEGORY_ORDER,
  type ScholarshipCategoryId
} from '@/app/scholarships/scholarshipCategories';
import {
  CATALOG_CONTROL_BAR_BTN,
  CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS,
  SITE_SEARCH_INPUT_CHROME
} from '@/lib/constants/catalogControlBar';
import {
  scholarshipCategoriesApplyButtonClass,
  scholarshipGuestLockIconClass
} from '@/lib/constants/scholarshipActionUi';
import {
  GUEST_LOCKED_SORT_OPTIONS,
  type SortOption
} from '@/app/scholarships/scholarshipSort';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';

export type { SortOption };

type ScholarshipsListHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  /** Counts по base dataset текущей вкладки (не глобальный каталог). */
  categoryCounts: Record<ScholarshipCategoryId, number>;
  appliedCategoryIds: Set<ScholarshipCategoryId>;
  onApplyCategories: (next: Set<ScholarshipCategoryId>) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  resultCount: number | null;
  /** Inclusive range for current page (with pagination). */
  showingFrom?: number | null;
  showingTo?: number | null;
  onOpenMoreFilters?: () => void;
  /** Main heading (default: Scholarship matches). */
  pageTitle?: string;
  /** Optional intro under H1 (e.g. long-tail SEO paragraph). */
  introParagraph?: string | null;
  /** When true, skip H1 + intro (rendered above, e.g. SeoScholarshipHero). */
  omitHeadlineBlock?: boolean;
  /** Shown while `resultCount` is null (e.g. loading). */
  loadingCountText?: string;
  /** Текущая вкладка — для подписи «saved scholarships» и т.п. */
  listTab?: ScholarshipListTabId;
  /** Нет строк в base dataset вкладки — категории недоступны. */
  categoriesDisabled?: boolean;
  /** Число активных опций в More filters (для подписи кнопки). */
  moreFiltersActiveCount?: number;
  /** Активные фильтры над списком (поиск, категории, сводка по модалке). */
  activeListingChips?: { id: string; label: string; onDismiss: () => void }[];
  onClearAllListingChips?: () => void;
  /**
   * When false, “smart” sort options still appear but trigger `onGuestSortBlocked`
   * instead of changing sort (hub guests).
   */
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  onGuestSortBlocked?: () => void;
  onSubscriptionSortBlocked?: () => void;
  onGuestLockedAction?: () => void;
};

function listingResultUnit(
  tab: ScholarshipListTabId | undefined,
  plural: boolean
): string {
  switch (tab) {
    case 'saved':
      return plural ? 'saved scholarships' : 'saved scholarship';
    case 'started':
      return plural ? 'started applications' : 'started application';
    case 'submitted':
      return plural ? 'submitted applications' : 'submitted application';
    case 'ignored':
      return plural ? 'ignored scholarships' : 'ignored scholarship';
    case 'recommended':
    case 'easy-apply':
    case 'hot-deadlines':
      return plural ? 'scholarships' : 'scholarship';
    case 'matches':
    default:
      return plural ? 'scholarships' : 'scholarship';
  }
}

/** Порядок: сначала понятные дефолты, затем остальное; magic = рекомендации по скорингу. */
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'closest_deadline', label: 'Deadline soonest' },
  { value: 'most_recent', label: 'Newest' },
  { value: 'highest_amount', label: 'Amount high → low' },
  { value: 'lowest_amount', label: 'Amount low → high' },
  { value: 'best_match', label: 'Best recommendation' },
  { value: 'magic', label: 'Recommended' },
  { value: 'verified_first', label: 'Verified first' },
  { value: 'least_requirements', label: 'Fewest requirements' },
  { value: 'fewest_applicants', label: 'Least applicants' }
];

const SORT_TRIGGER_LABEL: Record<SortOption, string> = {
  best_match: 'Best recommendation',
  best_recommendation: 'Highest amount · newest',
  most_recent: 'Newest',
  closest_deadline: 'Deadline soonest',
  highest_amount: 'Amount high → low',
  magic: 'Recommended',
  lowest_amount: 'Amount low → high',
  least_requirements: 'Fewest requirements',
  fewest_applicants: 'Least applicants',
  verified_first: 'Verified first'
};

const CATEGORY_PANEL_GAP = 8;
const CATEGORY_PANEL_VPAD = 12;
const CATEGORY_PANEL_MIN_W = 288;
const CATEGORY_PANEL_MAX_W = 384;
const CATEGORY_PANEL_MAX_H = 400;

type CategoryPanelLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function measureCategoryPanel(el: HTMLElement): CategoryPanelLayout {
  const r = el.getBoundingClientRect();
  const width = Math.min(
    CATEGORY_PANEL_MAX_W,
    Math.max(CATEGORY_PANEL_MIN_W, r.width)
  );
  let left = r.left;
  left = Math.min(left, window.innerWidth - CATEGORY_PANEL_VPAD - width);
  left = Math.max(CATEGORY_PANEL_VPAD, left);
  const top = r.bottom + CATEGORY_PANEL_GAP;
  const maxHeight = Math.max(
    200,
    Math.min(
      CATEGORY_PANEL_MAX_H,
      window.innerHeight - top - CATEGORY_PANEL_VPAD
    )
  );
  return { top, left, width, maxHeight };
}

export default function ScholarshipsListHeader({
  query,
  onQueryChange,
  categoryCounts,
  appliedCategoryIds,
  onApplyCategories,
  sortBy,
  onSortChange,
  resultCount,
  showingFrom = null,
  showingTo = null,
  onOpenMoreFilters,
  pageTitle = 'Scholarship matches',
  introParagraph = null,
  omitHeadlineBlock = false,
  loadingCountText = 'Loading matches…',
  listTab,
  categoriesDisabled = false,
  moreFiltersActiveCount = 0,
  activeListingChips = [],
  onClearAllListingChips,
  isAuthenticated = true,
  hasSubscription = true,
  onGuestSortBlocked,
  onSubscriptionSortBlocked,
  onGuestLockedAction
}: ScholarshipsListHeaderProps) {
  /** Locks apply to guests only; authenticated users are fully unlocked. */
  const catalogLocked = !isAuthenticated;
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [draftCategories, setDraftCategories] = useState<
    Set<ScholarshipCategoryId>
  >(() => new Set());
  const [categoryPanelLayout, setCategoryPanelLayout] =
    useState<CategoryPanelLayout | null>(null);
  const [mounted, setMounted] = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCategoryPanelLayout = useCallback(() => {
    const wrap = categoriesRef.current;
    if (!wrap || !categoriesOpen) return;
    setCategoryPanelLayout(measureCategoryPanel(wrap));
  }, [categoriesOpen]);

  useLayoutEffect(() => {
    if (!categoriesOpen) {
      setCategoryPanelLayout(null);
      return;
    }
    updateCategoryPanelLayout();
  }, [categoriesOpen, updateCategoryPanelLayout]);

  useEffect(() => {
    if (!categoriesOpen) return;
    const onRe = () => updateCategoryPanelLayout();
    window.addEventListener('resize', onRe);
    window.addEventListener('scroll', onRe, true);
    return () => {
      window.removeEventListener('resize', onRe);
      window.removeEventListener('scroll', onRe, true);
    };
  }, [categoriesOpen, updateCategoryPanelLayout]);

  useEffect(() => {
    if (!categoriesOpen && !sortOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (categoriesRef.current?.contains(t)) return;
      if (categoryDropdownRef.current?.contains(t)) return;
      if (sortRef.current?.contains(t)) return;
      setCategoriesOpen(false);
      setSortOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [categoriesOpen, sortOpen]);

  useEffect(() => {
    if (!categoriesOpen && !sortOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCategoriesOpen(false);
      setSortOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [categoriesOpen, sortOpen]);

  const optionSelectedClass =
    'bg-gray-100 font-medium text-gray-900';
  const optionDefaultClass = 'text-gray-600';

  const filteredCategoryRows = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return SCHOLARSHIP_CATEGORY_ORDER.filter((id) => {
      if (!q) return true;
      return SCHOLARSHIP_CATEGORY_LABELS[id].toLowerCase().includes(q);
    });
  }, [categorySearch]);

  const toggleDraft = (id: ScholarshipCategoryId) => {
    setDraftCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFilterCount = appliedCategoryIds.size;

  const sortTriggerLabel = SORT_TRIGGER_LABEL[sortBy];

  const categoryDropdown =
    mounted &&
    categoriesOpen &&
    categoryPanelLayout &&
    createPortal(
      <div
        ref={categoryDropdownRef}
        role="dialog"
        aria-label="Filter by category"
        className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/5"
        style={{
          top: categoryPanelLayout.top,
          left: categoryPanelLayout.left,
          width: categoryPanelLayout.width,
          maxHeight: categoryPanelLayout.maxHeight
        }}
      >
        <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">
            Categories
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Include only selected categories in the list.
          </p>
        </div>
        <div className="shrink-0 px-4 py-3">
          <input
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Search categories"
            aria-label="Search categories"
            className={`w-full px-3 py-2.5 text-left text-sm text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`}
          />
        </div>
        <ul
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1"
          role="list"
        >
          {filteredCategoryRows.map((id) => (
            <li key={id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={draftCategories.has(id)}
                  onChange={() => toggleDraft(id)}
                  className="scholarship-filter-checkbox h-4 w-4 shrink-0"
                />
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                  {SCHOLARSHIP_CATEGORY_LABELS[id]}
                </span>
                <span className="shrink-0 tabular-nums text-sm font-medium text-zinc-500">
                  {categoryCounts[id] ?? 0}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            className="rounded-md text-sm font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-0"
            onClick={() => setDraftCategories(new Set())}
          >
            Clear
          </button>
          <button
            type="button"
            className={scholarshipCategoriesApplyButtonClass}
            onClick={() => {
              if (catalogLocked) {
                onGuestLockedAction?.();
                return;
              }
              onApplyCategories(new Set(draftCategories));
              setCategoriesOpen(false);
            }}
          >
            Apply
          </button>
        </div>
      </div>,
      document.body
    );

  return (
    <div
      className="relative z-[80] mb-4 space-y-5 sm:mb-5 sm:space-y-6"
    >
      {!omitHeadlineBlock ? (
        <>
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
            {pageTitle}
          </h1>

          {introParagraph?.trim() ? (
            <p className="max-w-3xl text-base leading-relaxed text-gray-400 sm:text-lg">
              {introParagraph.trim()}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex w-full min-w-0 flex-col gap-4 sm:overflow-visible">
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-500">
            {resultCount === null
              ? loadingCountText
              : resultCount === 0
                ? `Found 0 ${listingResultUnit(listTab, true)}`
                : showingFrom != null &&
                    showingTo != null &&
                    showingFrom >= 1 &&
                    showingTo >= showingFrom
                  ? `Showing ${showingFrom}–${showingTo} of ${resultCount} ${listingResultUnit(listTab, resultCount !== 1)}`
                  : `Found ${resultCount} ${listingResultUnit(listTab, resultCount !== 1)}`}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  value={query}
                  onChange={(e) => {
                    if (catalogLocked) return;
                    onQueryChange(e.target.value);
                  }}
                  onFocus={(e) => {
                    if (!catalogLocked) return;
                    e.currentTarget.blur();
                    onGuestLockedAction?.();
                  }}
                  onMouseDown={(e) => {
                    if (!catalogLocked) return;
                    e.preventDefault();
                    onGuestLockedAction?.();
                  }}
                  readOnly={catalogLocked}
                  placeholder="Search by keyword"
                  aria-label="Search by keyword"
                  title={
                    catalogLocked
                      ? 'Search by keyword after you start your free trial'
                      : undefined
                  }
                  className={`${CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS} ${
                    catalogLocked ? 'cursor-pointer bg-gray-50 pr-10' : ''
                  }`}
                />
                {catalogLocked ? (
                  <Lock
                    className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${scholarshipGuestLockIconClass}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div
                className="relative w-full shrink-0 sm:w-auto sm:min-w-[11rem]"
                ref={sortRef}
              >
                {listTab === 'best-recommendation' ? (
                  <div
                    className={`${CATALOG_CONTROL_BAR_BTN} w-full cursor-default justify-between sm:min-w-[11rem]`}
                    title="Largest awards first; when amounts tie, newest updates first."
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-gray-500">Sort:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {SORT_TRIGGER_LABEL.best_recommendation}
                      </span>
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriesOpen(false);
                        setSortOpen((o) => !o);
                      }}
                      aria-expanded={sortOpen}
                      aria-haspopup="listbox"
                      className={`${CATALOG_CONTROL_BAR_BTN} w-full justify-between sm:min-w-[11rem]`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-gray-500">Sort:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {sortTriggerLabel}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-500 transition ${sortOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {sortOpen ? (
                      <ul
                        role="listbox"
                        aria-label="Sort options"
                        className="absolute left-0 z-[200] mt-2 w-full min-w-[12rem] max-w-[min(calc(100vw-2rem),18rem)] overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg ring-1 ring-gray-900/5 sm:left-auto sm:right-0 sm:w-max"
                      >
                        {SORT_OPTIONS.map((opt) => {
                          const sortLocked =
                            catalogLocked &&
                            GUEST_LOCKED_SORT_OPTIONS.has(opt.value);
                          return (
                            <li
                              key={opt.value}
                              role="option"
                              aria-selected={sortBy === opt.value}
                            >
                              <button
                                type="button"
                                className={`flex w-full items-center gap-2 whitespace-nowrap px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 ${
                                  sortBy === opt.value
                                    ? optionSelectedClass
                                    : optionDefaultClass
                                }`}
                                onClick={() => {
                                  if (sortLocked) {
                                    onGuestSortBlocked?.();
                                    return;
                                  }
                                  onSortChange(opt.value);
                                  setSortOpen(false);
                                }}
                              >
                                {sortLocked ? (
                                  <Lock
                                    className={`h-3.5 w-3.5 shrink-0 ${scholarshipGuestLockIconClass}`}
                                    strokeWidth={2}
                                    aria-hidden
                                  />
                                ) : (
                                  <span className="w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="min-w-0">{opt.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  aria-label="Open more filters"
                  title={
                    catalogLocked
                      ? 'Apply filters after you start your free trial'
                      : undefined
                  }
                  onClick={() => {
                    setCategoriesOpen(false);
                    setSortOpen(false);
                    onOpenMoreFilters?.();
                  }}
                  className={CATALOG_CONTROL_BAR_BTN}
                >
                  <SlidersHorizontal
                    className="h-[18px] w-[18px] shrink-0 text-gray-600"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {catalogLocked ? (
                    <Lock
                      className={`h-3.5 w-3.5 shrink-0 ${scholarshipGuestLockIconClass}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                  Filters
                  {moreFiltersActiveCount > 0 ? (
                    <span className="tabular-nums text-gray-600">
                      ({moreFiltersActiveCount})
                    </span>
                  ) : null}
                </button>

                <div
                  className="relative min-w-0 sm:min-w-0 sm:shrink-0"
                  ref={categoriesRef}
                >
                  <button
                    type="button"
                    disabled={categoriesDisabled}
                    title={
                      catalogLocked
                        ? 'Apply categories after you start your free trial'
                        : undefined
                    }
                    onClick={() => {
                      if (categoriesDisabled) return;
                      setSortOpen(false);
                      setCategoriesOpen((o) => {
                        const next = !o;
                        if (next) {
                          setDraftCategories(new Set(appliedCategoryIds));
                          setCategorySearch('');
                        }
                        return next;
                      });
                    }}
                    aria-expanded={categoriesOpen}
                    aria-haspopup="dialog"
                    className={`${CATALOG_CONTROL_BAR_BTN} w-full sm:w-auto`}
                  >
                    <LayoutGrid className="h-[18px] w-[18px] text-gray-600" />
                    {catalogLocked ? (
                      <Lock
                        className={`h-3.5 w-3.5 shrink-0 ${scholarshipGuestLockIconClass}`}
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                    Categories
                    {activeFilterCount > 0 ? (
                      <span className="tabular-nums text-gray-600">
                        ({activeFilterCount})
                      </span>
                    ) : null}
                    <ChevronDown
                      className={`h-4 w-4 text-gray-500 transition ${categoriesOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeListingChips.length > 0 ? (
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {activeListingChips.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-1 text-xs font-medium text-zinc-800"
                >
                  <span className="min-w-0 truncate">{c.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${c.label}`}
                    onClick={c.onDismiss}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
            {onClearAllListingChips ? (
              <button
                type="button"
                onClick={onClearAllListingChips}
                className="shrink-0 text-xs font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
              >
                Clear all
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {categoryDropdown}
    </div>
  );
}
