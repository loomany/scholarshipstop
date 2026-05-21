'use client';

import {
  memo,
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
  Globe2,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

import {
  SCHOLARSHIP_CATEGORY_ORDER,
  type ScholarshipCategoryId
} from '@/app/scholarships/scholarshipCategories';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getLocalizedCategoryLabel,
  getLocalizedCountryLabel
} from '@/lib/i18n/taxonomyLabels';
import {
  CATALOG_CONTROL_BAR_BTN,
  CATALOG_CONTROL_BAR_BTN_COMPACT,
  CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS,
  SITE_SEARCH_INPUT_CHROME
} from '@/lib/constants/catalogControlBar';
import { scholarshipCategoriesApplyButtonClass } from '@/lib/constants/scholarshipActionUi';
import { type SortOption } from '@/app/scholarships/scholarshipSort';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import {
  getScholarshipsHubUiCopy,
  type ScholarshipsHubUiCopy
} from '@/lib/i18n/scholarshipsHubUiCopy';
import {
  getScholarshipsFilterPanelsUiCopy,
  type ScholarshipsFilterPanelsUiCopy
} from '@/lib/i18n/scholarshipsFilterPanelsUiCopy';

export type { SortOption };

type ScholarshipsListHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  /** Counts по base dataset текущей вкладки (не глобальный каталог). */
  categoryCounts: Record<ScholarshipCategoryId, number>;
  countryCounts?: CountryCountRow[];
  countryCountsLoading?: boolean;
  unspecifiedApplicantCountryCount?: number;
  appliedCountryCodes?: Set<string>;
  appliedIncludeUnspecifiedCountry?: boolean;
  onApplyCountries?: (next: Set<string>, includeUnspecified: boolean) => void;
  /** Host / program-location country counts (`host_country_codes`). */
  hostCountryCounts?: CountryCountRow[];
  hostCountryCountsLoading?: boolean;
  unspecifiedHostCountryCount?: number;
  appliedHostCountryCodes?: Set<string>;
  appliedIncludeUnspecifiedHostCountry?: boolean;
  onApplyHostCountries?: (next: Set<string>, includeUnspecifiedHost: boolean) => void;
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
  /** Retained for call-site compatibility; catalog controls are always interactive. */
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  onGuestSortBlocked?: () => void;
  onGuestLockedAction?: () => void;
  catalogListingLocked?: boolean;
  savedFilterPresetButtons?: { id: string; name: string; active?: boolean }[];
  onSavedFilterPresetSelect?: (id: string) => void;
  /** Short line before preset chips (e.g. “Saved in this section”). */
  savedFilterBarHint?: string;
  /** Avoid stacking margin with a following block (e.g. Best recommendation wizard). */
  suppressBottomMargin?: boolean;
  /** Center the “Showing … / Found …” summary line (e.g. best hub). */
  centerResultSummary?: boolean;
  uiCopy?: ScholarshipsHubUiCopy;
  filterPanelsCopy?: ScholarshipsFilterPanelsUiCopy;
  /** Locale for visible category/country filter labels (IDs unchanged). */
  uiLocale?: LocalizedUiLocale;
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

type CountryCountRow = { code: string; label: string; count: number };

function displayCountryCountRow(
  country: CountryCountRow,
  locale: LocalizedUiLocale
): CountryCountRow {
  const code = country.code.trim().toUpperCase();
  const label = country.label.trim();
  if (label && label.toUpperCase() !== code) {
    return {
      ...country,
      code,
      label: getLocalizedCountryLabel(code, locale, label)
    };
  }
  return {
    ...country,
    code,
    label: getLocalizedCountryLabel(code, locale, label) || code
  };
}

/** ISO2 codes for compact filter bar badges (e.g. `US, GB` or `US, GB +2`). */
function formatIsoCodesForFilterBadge(
  codes: Iterable<string>,
  maxVisible = 5
): string {
  const sorted = [...codes]
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c))
    .sort((a, b) => a.localeCompare(b));
  if (sorted.length === 0) return '';
  if (sorted.length <= maxVisible) return sorted.join(', ');
  return `${sorted.slice(0, maxVisible).join(', ')} +${sorted.length - maxVisible}`;
}

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

function ScholarshipsListHeader({
  query,
  onQueryChange,
  categoryCounts,
  countryCounts = [],
  countryCountsLoading = false,
  unspecifiedApplicantCountryCount = 0,
  appliedCountryCodes = new Set(),
  appliedIncludeUnspecifiedCountry = false,
  onApplyCountries,
  hostCountryCounts = [],
  hostCountryCountsLoading = false,
  unspecifiedHostCountryCount = 0,
  appliedHostCountryCodes = new Set(),
  appliedIncludeUnspecifiedHostCountry = false,
  onApplyHostCountries,
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
  isAuthenticated: _isAuthenticated = true,
  hasSubscription: _hasSubscription = true,
  onGuestSortBlocked: _onGuestSortBlocked,
  onGuestLockedAction: _onGuestLockedAction,
  catalogListingLocked: _catalogListingLocked,
  savedFilterPresetButtons = [],
  onSavedFilterPresetSelect,
  savedFilterBarHint,
  suppressBottomMargin = false,
  centerResultSummary = false,
  uiCopy,
  filterPanelsCopy,
  uiLocale = 'en'
}: ScholarshipsListHeaderProps) {
  const ui = uiCopy ?? getScholarshipsHubUiCopy(uiLocale);
  const fp = filterPanelsCopy ?? getScholarshipsFilterPanelsUiCopy(uiLocale);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [draftCategories, setDraftCategories] = useState<
    Set<ScholarshipCategoryId>
  >(() => new Set());
  const [draftCountryCodes, setDraftCountryCodes] = useState<Set<string>>(
    () => new Set()
  );
  const [draftIncludeUnspecifiedCountry, setDraftIncludeUnspecifiedCountry] =
    useState(false);
  const [draftHostCountryCodes, setDraftHostCountryCodes] = useState<
    Set<string>
  >(() => new Set());
  const [draftIncludeUnspecifiedHost, setDraftIncludeUnspecifiedHost] =
    useState(false);
  const [categoryPanelLayout, setCategoryPanelLayout] =
    useState<CategoryPanelLayout | null>(null);
  const [mounted, setMounted] = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const countriesRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
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
    if (!categoriesOpen && !countriesOpen && !destinationOpen && !sortOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (categoriesRef.current?.contains(t)) return;
      if (countriesRef.current?.contains(t)) return;
      if (destinationRef.current?.contains(t)) return;
      if (categoryDropdownRef.current?.contains(t)) return;
      if (sortRef.current?.contains(t)) return;
      setCategoriesOpen(false);
      setCountriesOpen(false);
      setDestinationOpen(false);
      setSortOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [categoriesOpen, countriesOpen, destinationOpen, sortOpen]);

  useEffect(() => {
    if (!categoriesOpen && !countriesOpen && !destinationOpen && !sortOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCategoriesOpen(false);
      setCountriesOpen(false);
      setDestinationOpen(false);
      setSortOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [categoriesOpen, countriesOpen, destinationOpen, sortOpen]);

  const optionSelectedClass =
    'bg-gray-100 font-medium text-gray-900';
  const optionDefaultClass = 'text-gray-600';

  const filteredCategoryRows = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return SCHOLARSHIP_CATEGORY_ORDER.filter((id) => {
      if (!q) return true;
      return getLocalizedCategoryLabel(id, uiLocale)
        .toLowerCase()
        .includes(q);
    });
  }, [categorySearch, uiLocale]);

  const countrySortSelection = countriesOpen
    ? draftCountryCodes
    : appliedCountryCodes;

  const filteredCountryRows = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    return countryCounts
      .map((row) => displayCountryCountRow(row, uiLocale))
      .filter((country) => {
        if (!q) return true;
        return (
          country.label.toLowerCase().includes(q) ||
          country.code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aSelected = countrySortSelection.has(a.code) ? 1 : 0;
        const bSelected = countrySortSelection.has(b.code) ? 1 : 0;
        return bSelected - aSelected || b.count - a.count || a.label.localeCompare(b.label);
      });
  }, [countrySortSelection, countryCounts, countrySearch, uiLocale]);

  const hostSortSelection = destinationOpen
    ? draftHostCountryCodes
    : appliedHostCountryCodes;

  const filteredHostRows = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    return hostCountryCounts
      .map((row) => displayCountryCountRow(row, uiLocale))
      .filter((country) => {
        if (!q) return true;
        return (
          country.label.toLowerCase().includes(q) ||
          country.code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aSelected = hostSortSelection.has(a.code) ? 1 : 0;
        const bSelected = hostSortSelection.has(b.code) ? 1 : 0;
        return (
          bSelected - aSelected || b.count - a.count || a.label.localeCompare(b.label)
        );
      });
  }, [destinationSearch, hostCountryCounts, hostSortSelection, uiLocale]);

  /** Study destination: rows with scholarships in the current filtered list (for “Select all”). */
  const selectableFilteredHostCodes = useMemo(
    () => filteredHostRows.filter((c) => c.count > 0).map((c) => c.code),
    [filteredHostRows]
  );

  const allFilteredSelectableHostsSelected = useMemo(() => {
    if (selectableFilteredHostCodes.length === 0) return true;
    return selectableFilteredHostCodes.every((code) =>
      draftHostCountryCodes.has(code)
    );
  }, [draftHostCountryCodes, selectableFilteredHostCodes]);

  const showUnspecifiedHostRow = useMemo(() => {
    if (
      unspecifiedHostCountryCount <= 0 &&
      !appliedIncludeUnspecifiedHostCountry
    ) {
      return false;
    }
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      'open / not country-specific'.includes(q) ||
      'unspecified'.includes(q) ||
      q.includes('not specif') ||
      q.includes('study') ||
      q.includes('destination')
    );
  }, [
    appliedIncludeUnspecifiedHostCountry,
    destinationSearch,
    unspecifiedHostCountryCount
  ]);

  const showUnspecifiedCountryRow = useMemo(() => {
    if (
      unspecifiedApplicantCountryCount <= 0 &&
      !appliedIncludeUnspecifiedCountry
    ) {
      return false;
    }
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      'open / not country-specific'.includes(q) ||
      'unspecified'.includes(q) ||
      q.includes('not specif') ||
      q.includes('citizenship')
    );
  }, [
    appliedIncludeUnspecifiedCountry,
    countrySearch,
    unspecifiedApplicantCountryCount
  ]);

  const toggleDraft = (id: ScholarshipCategoryId) => {
    setDraftCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFilterCount = appliedCategoryIds.size;
  const activeCountryCount = appliedCountryCodes.size;
  const showCountryBadge =
    activeCountryCount > 0 || appliedIncludeUnspecifiedCountry;
  const countryBadgeCaption =
    activeCountryCount === 0 && appliedIncludeUnspecifiedCountry
      ? ui.notSpecified
      : activeCountryCount > 0
        ? formatIsoCodesForFilterBadge(appliedCountryCodes)
        : '';

  const activeHostCountryCount = appliedHostCountryCodes.size;
  const showHostCountryBadge =
    activeHostCountryCount > 0 || appliedIncludeUnspecifiedHostCountry;
  const hostCountryBadgeCaption =
    activeHostCountryCount === 0 && appliedIncludeUnspecifiedHostCountry
      ? ui.notSpecified
      : activeHostCountryCount > 0
        ? formatIsoCodesForFilterBadge(appliedHostCountryCodes)
        : '';

  const sortTriggerLabel = ui.sortTriggerLabels[sortBy];

  const categoryDropdown =
    mounted &&
    categoriesOpen &&
    categoryPanelLayout &&
    createPortal(
      <div
        ref={categoryDropdownRef}
        role="dialog"
        aria-label={ui.filterByCategoryAria}
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
            {ui.categories}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {ui.categoriesPanelIncludeOnly}
          </p>
        </div>
        <div className="shrink-0 px-4 py-3">
          <input
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder={ui.searchCategories}
            aria-label={ui.searchCategories}
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
                  {getLocalizedCategoryLabel(id, uiLocale)}
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
            {ui.clearCategories}
          </button>
          <button
            type="button"
            className={`${scholarshipCategoriesApplyButtonClass} inline-flex items-center justify-center gap-1.5`}
            onClick={() => {
              onApplyCategories(new Set(draftCategories));
              setCategoriesOpen(false);
            }}
          >
            {ui.applyCategories}
          </button>
        </div>
      </div>,
      document.body
    );

  return (
    <div
      className={
        suppressBottomMargin
          ? 'relative z-[80] mb-0 space-y-5 sm:space-y-6'
          : 'relative z-[80] mb-4 space-y-5 sm:mb-5 sm:space-y-6'
      }
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
        <div
          className={`rounded-2xl bg-white p-4 shadow-sm ${
            suppressBottomMargin ? 'mb-0' : 'mb-4'
          }`}
        >
          <p
            className={`mb-3 text-sm font-medium text-gray-500 ${
              centerResultSummary ? 'text-center' : ''
            }`}
          >
            {resultCount === null
              ? loadingCountText
              : resultCount === 0
                ? ui.foundZero(ui.listingResultUnit(listTab, true))
                : showingFrom != null &&
                    showingTo != null &&
                    showingFrom >= 1 &&
                    showingTo >= showingFrom
                  ? ui.showingRange(
                      showingFrom,
                      showingTo,
                      resultCount,
                      ui.listingResultUnit(listTab, resultCount !== 1)
                    )
                  : ui.foundCount(
                      resultCount,
                      ui.listingResultUnit(listTab, resultCount !== 1)
                    )}
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
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={ui.searchByKeyword}
                  aria-label={ui.searchByKeywordAria}
                  className={CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS}
                />
              </div>
              <div
                className="relative w-full shrink-0 sm:w-auto sm:min-w-[11rem]"
                ref={sortRef}
              >
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriesOpen(false);
                      setCountriesOpen(false);
                      setDestinationOpen(false);
                      setSortOpen((o) => !o);
                    }}
                    aria-expanded={sortOpen}
                    aria-haspopup="listbox"
                    className={`${CATALOG_CONTROL_BAR_BTN} w-full justify-between sm:min-w-[11rem]`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                      <span className="shrink-0 text-gray-500">{ui.sortLabel}</span>
                      <span className="min-w-0 truncate font-medium text-gray-900">
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
                      aria-label={ui.sortOptionsAria}
                      className="absolute left-0 z-[200] mt-2 w-full min-w-[12rem] max-w-[min(calc(100vw-2rem),18rem)] overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg ring-1 ring-gray-900/5 sm:left-auto sm:right-0 sm:w-max"
                    >
                      {ui.sortOptions.map((opt) => (
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
                              onSortChange(opt.value);
                              setSortOpen(false);
                            }}
                          >
                            <span className="w-3.5 shrink-0" aria-hidden />
                            <span className="min-w-0">{opt.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                {/*
                  Do not use overflow-x-auto here: it creates a scrollport that clips
                  `absolute` country/location popovers so only the footer shows.
                */}
                <div className="grid w-full min-w-0 grid-cols-2 items-center gap-3 sm:flex sm:flex-nowrap sm:gap-2 sm:overflow-visible">
                <button
                  type="button"
                  aria-label={ui.filtersAria}
                  onClick={() => {
                    setCategoriesOpen(false);
                    setCountriesOpen(false);
                    setDestinationOpen(false);
                    setSortOpen(false);
                    onOpenMoreFilters?.();
                  }}
                  className={`${CATALOG_CONTROL_BAR_BTN_COMPACT} order-1 w-full sm:order-none sm:w-auto sm:max-w-[min(100%,11rem)]`}
                >
                  <SlidersHorizontal
                    className="h-4 w-4 shrink-0 text-gray-600"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {ui.filters}
                  {moreFiltersActiveCount > 0 ? (
                    <span className="tabular-nums text-gray-600">
                      ({moreFiltersActiveCount})
                    </span>
                  ) : null}
                </button>

                {onApplyCountries ? (
                <div
                  className={`relative order-3 min-w-0 sm:order-2 sm:col-span-1 sm:min-w-0 sm:shrink ${
                    onApplyHostCountries
                      ? 'col-span-1 w-full sm:w-auto'
                      : 'col-span-2 justify-self-center'
                  }`}
                  ref={countriesRef}
                >
                  <button
                    type="button"
                    disabled={!onApplyCountries}
                    title={ui.imFromTitle}
                    onClick={() => {
                      if (!onApplyCountries) return;
                      setSortOpen(false);
                      setCategoriesOpen(false);
                      setDestinationOpen(false);
                      setCountriesOpen((open) => {
                        const next = !open;
                        if (next) {
                          setDraftCountryCodes(new Set(appliedCountryCodes));
                          setDraftIncludeUnspecifiedCountry(
                            appliedIncludeUnspecifiedCountry
                          );
                          setCountrySearch('');
                        }
                        return next;
                      });
                    }}
                    aria-expanded={countriesOpen}
                    aria-haspopup="dialog"
                    className={`${CATALOG_CONTROL_BAR_BTN_COMPACT} w-full max-w-full sm:w-auto sm:max-w-[min(100%,12.5rem)]`}
                  >
                    <Globe2 className="h-4 w-4 shrink-0 text-gray-600" />
                    <span className="min-w-0 truncate">{ui.imFrom}</span>
                    {showCountryBadge && countryBadgeCaption ? (
                      <span className="font-medium tabular-nums tracking-wide text-gray-600">
                        ({countryBadgeCaption})
                      </span>
                    ) : null}
                    <ChevronDown
                      className={`h-4 w-4 text-gray-500 transition ${countriesOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {countriesOpen ? (
                    <div
                      role="dialog"
                      aria-label={fp.filterByCitizenshipAria}
                      className="absolute top-[calc(100%+0.5rem)] z-[80] flex max-h-[min(32rem,min(85dvh,calc(100svh-7rem)))] w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/5 left-1/2 -translate-x-1/2 max-sm:left-0 max-sm:right-auto max-sm:translate-x-0 sm:left-0 sm:translate-x-0"
                    >
                      <div className="border-b border-zinc-100 px-4 py-3">
                        <h2 className="text-base font-semibold text-zinc-900">
                          {ui.imFrom}
                        </h2>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                          {fp.imFromPanelBody}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <input
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder={ui.searchCountry}
                          aria-label={ui.searchCountry}
                          className={`w-full px-3 py-2.5 text-left text-sm text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`}
                        />
                      </div>
                      <ul
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1 sm:max-h-72"
                        role="list"
                      >
                        {countryCountsLoading ? (
                          <li className="space-y-2 px-3 py-3" aria-live="polite">
                            <p className="text-sm font-medium text-zinc-600">
                              {fp.loadingCountryFilters}
                            </p>
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="flex animate-pulse items-center gap-3 rounded-xl py-2"
                              >
                                <span className="h-4 w-4 rounded border border-zinc-200 bg-zinc-100" />
                                <span className="h-4 flex-1 rounded-full bg-zinc-100" />
                                <span className="h-5 w-8 rounded-full bg-zinc-100" />
                              </div>
                            ))}
                          </li>
                        ) : showUnspecifiedCountryRow || filteredCountryRows.length > 0 ? (
                          <>
                            {showUnspecifiedCountryRow ? (
                              <li>
                                <label
                                  className={`group flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/80 px-3 py-3 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.42)] ring-1 ring-emerald-100/70 transition ${
                                    unspecifiedApplicantCountryCount <= 0 &&
                                    !draftIncludeUnspecifiedCountry
                                      ? 'cursor-not-allowed opacity-50'
                                      : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_34px_-22px_rgba(16,185,129,0.5)]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={draftIncludeUnspecifiedCountry}
                                    onChange={() =>
                                      setDraftIncludeUnspecifiedCountry((prev) => {
                                        const next = !prev;
                                        if (
                                          next &&
                                          unspecifiedApplicantCountryCount <= 0
                                        ) {
                                          return prev;
                                        }
                                        if (next) setDraftCountryCodes(new Set());
                                        return next;
                                      })
                                    }
                                    className="scholarship-filter-checkbox h-4 w-4 shrink-0"
                                  />
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-[0_6px_18px_-12px_rgba(16,185,129,0.5)] transition group-hover:border-emerald-300 group-hover:text-emerald-800">
                                    <Globe2 className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-center">
                                      <span className="inline-block whitespace-nowrap text-sm font-semibold leading-snug text-emerald-950">
                                        {fp.citizenshipNotSpecified}
                                      </span>
                                    </span>
                                    <span className="mt-1 block text-left text-[11px] leading-[1.35] text-emerald-600/85">
                                      {fp.citizenshipNotSpecifiedBody}
                                    </span>
                                  </span>
                                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-800 ring-1 ring-emerald-200">
                                    {unspecifiedApplicantCountryCount.toLocaleString()}
                                  </span>
                                </label>
                              </li>
                            ) : null}
                            {filteredCountryRows.map((country) => {
                              const countryDisabled =
                                country.count <= 0 &&
                                !draftCountryCodes.has(country.code);
                              return (
                            <li key={country.code}>
                              <label
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                                  countryDisabled
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-zinc-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={draftCountryCodes.has(country.code)}
                                  onChange={() => {
                                    setDraftCountryCodes((prev) => {
                                      if (prev.has(country.code)) return new Set();
                                      if (country.count <= 0) return prev;
                                      return new Set([country.code]);
                                    });
                                    setDraftIncludeUnspecifiedCountry(false);
                                  }}
                                  className="scholarship-filter-checkbox h-4 w-4 shrink-0"
                                />
                                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                                  {country.label}
                                </span>
                                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
                                  {country.count.toLocaleString()}
                                </span>
                              </label>
                            </li>
                            );
                            })}
                          </>
                        ) : (
                          <li className="px-3 py-6 text-center text-sm text-zinc-500">
                            {fp.noDedicatedMatches}
                          </li>
                        )}
                      </ul>
                      <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          className="self-start text-sm font-medium text-zinc-500 transition hover:text-zinc-800 sm:self-auto"
                          onClick={() => {
                            setDraftCountryCodes(new Set());
                            setDraftIncludeUnspecifiedCountry(false);
                          }}
                        >
                          {ui.clear}
                        </button>
                        <button
                          type="button"
                          className={`${scholarshipCategoriesApplyButtonClass} inline-flex w-full min-w-0 items-center justify-center gap-1.5 sm:w-auto`}
                          onClick={() => {
                            onApplyCountries?.(
                              new Set(draftCountryCodes),
                              draftIncludeUnspecifiedCountry
                            );
                            setCountriesOpen(false);
                          }}
                        >
                          {fp.showScholarships}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                ) : null}

                {onApplyHostCountries ? (
                  <div
                    className={`relative order-4 min-w-0 sm:order-3 sm:col-span-1 sm:min-w-0 sm:shrink ${
                      onApplyCountries
                        ? 'col-span-1 w-full sm:w-auto'
                        : 'col-span-2 justify-self-center'
                    }`}
                    ref={destinationRef}
                  >
                    <button
                      type="button"
                      disabled={!onApplyHostCountries}
                      title={ui.studyInTitle}
                      onClick={() => {
                        setSortOpen(false);
                        setCategoriesOpen(false);
                        setCountriesOpen(false);
                        setDestinationOpen((open) => {
                          const next = !open;
                          if (next) {
                            setDraftHostCountryCodes(new Set(appliedHostCountryCodes));
                            setDraftIncludeUnspecifiedHost(
                              appliedIncludeUnspecifiedHostCountry
                            );
                            setDestinationSearch('');
                          }
                          return next;
                        });
                      }}
                      aria-expanded={destinationOpen}
                      aria-haspopup="dialog"
                      className={`${CATALOG_CONTROL_BAR_BTN_COMPACT} w-full max-w-full sm:w-auto sm:max-w-[min(100%,12.5rem)]`}
                    >
                      <Globe2 className="h-4 w-4 shrink-0 text-gray-600" />
                      <span className="min-w-0 truncate">
                        {ui.studyIn}
                        {showHostCountryBadge && hostCountryBadgeCaption ? (
                          <span className="font-medium tabular-nums tracking-wide text-gray-600">
                            {' '}
                            ({hostCountryBadgeCaption})
                          </span>
                        ) : null}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-500 transition ${destinationOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {destinationOpen ? (
                      <div
                        role="dialog"
                        aria-label={fp.filterByStudyDestinationAria}
                        className="absolute top-[calc(100%+0.5rem)] z-[80] flex max-h-[min(32rem,min(85dvh,calc(100svh-7rem)))] w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/5 left-1/2 -translate-x-1/2 max-sm:left-auto max-sm:right-0 max-sm:translate-x-0 sm:left-0 sm:translate-x-0"
                      >
                        <div className="border-b border-zinc-100 px-4 py-3">
                          <h2 className="text-base font-semibold text-zinc-900">
                            {ui.studyIn}
                          </h2>
                          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                            {fp.studyDestinationBody}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <input
                            value={destinationSearch}
                            onChange={(e) => setDestinationSearch(e.target.value)}
                            placeholder={ui.searchCountries}
                            aria-label={ui.searchCountries}
                            className={`w-full px-3 py-2.5 text-left text-sm text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`}
                          />
                        </div>
                        <ul
                          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1 sm:max-h-72"
                          role="list"
                        >
                          {hostCountryCountsLoading ? (
                            <li className="space-y-2 px-3 py-3" aria-live="polite">
                              <p className="text-sm font-medium text-zinc-600">
                                {fp.loadingLocationFilters}
                              </p>
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="flex animate-pulse items-center gap-3 rounded-xl py-2"
                                >
                                  <span className="h-4 w-4 rounded border border-zinc-200 bg-zinc-100" />
                                  <span className="h-4 flex-1 rounded-full bg-zinc-100" />
                                  <span className="h-5 w-8 rounded-full bg-zinc-100" />
                                </div>
                              ))}
                            </li>
                          ) : showUnspecifiedHostRow || filteredHostRows.length > 0 ? (
                            <>
                              {showUnspecifiedHostRow ? (
                                <li>
                                  <label
                                    className={`group flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/80 px-3 py-3 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.42)] ring-1 ring-emerald-100/70 transition ${
                                      unspecifiedHostCountryCount <= 0 &&
                                      !draftIncludeUnspecifiedHost
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_34px_-22px_rgba(16,185,129,0.5)]'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={draftIncludeUnspecifiedHost}
                                      onChange={() =>
                                        setDraftIncludeUnspecifiedHost((prev) => {
                                          const next = !prev;
                                          if (
                                            next &&
                                            unspecifiedHostCountryCount <= 0
                                          ) {
                                            return prev;
                                          }
                                          if (next) setDraftHostCountryCodes(new Set());
                                          return next;
                                        })
                                      }
                                      className="scholarship-filter-checkbox h-4 w-4 shrink-0"
                                    />
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-[0_6px_18px_-12px_rgba(16,185,129,0.5)] transition group-hover:border-emerald-300 group-hover:text-emerald-800">
                                      <Globe2 className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-center">
                                        <span className="inline-block whitespace-nowrap text-sm font-semibold leading-snug text-emerald-950">
                                          {fp.anyUnspecifiedLocation}
                                        </span>
                                      </span>
                                      <span className="mt-1 block text-left text-xs leading-relaxed text-emerald-600/85">
                                        {fp.anyUnspecifiedLocationBody}
                                      </span>
                                    </span>
                                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-800 ring-1 ring-emerald-200">
                                      {unspecifiedHostCountryCount.toLocaleString()}
                                    </span>
                                  </label>
                                </li>
                              ) : null}
                              {filteredHostRows.map((country) => {
                              const hostOptionDisabled =
                                country.count <= 0 &&
                                !draftHostCountryCodes.has(country.code);
                              return (
                              <li key={country.code}>
                                <label
                                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                                    hostOptionDisabled
                                      ? 'cursor-not-allowed opacity-50'
                                      : 'cursor-pointer hover:bg-zinc-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={draftHostCountryCodes.has(country.code)}
                                    onChange={() => {
                                      setDraftHostCountryCodes((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(country.code)) {
                                          next.delete(country.code);
                                          return next;
                                        }
                                        if (country.count <= 0) return prev;
                                        next.add(country.code);
                                        return next;
                                      });
                                      setDraftIncludeUnspecifiedHost(false);
                                    }}
                                    className="scholarship-filter-checkbox h-4 w-4 shrink-0"
                                  />
                                  <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                                    {country.label}
                                  </span>
                                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
                                    {country.count.toLocaleString()}
                                  </span>
                                </label>
                              </li>
                            );
                            })}
                            </>
                          ) : (
                            <li className="px-3 py-6 text-center text-sm text-zinc-500">
                              {fp.noLocationData}
                            </li>
                          )}
                        </ul>
                        <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <button
                              type="button"
                              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
                              onClick={() => {
                                setDraftHostCountryCodes(new Set());
                                setDraftIncludeUnspecifiedHost(false);
                              }}
                            >
                              {ui.clear}
                            </button>
                            <button
                              type="button"
                              disabled={
                                hostCountryCountsLoading ||
                                selectableFilteredHostCodes.length === 0 ||
                                allFilteredSelectableHostsSelected
                              }
                              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-500"
                              onClick={() => {
                                setDraftHostCountryCodes((prev) => {
                                  const next = new Set(prev);
                                  for (const code of selectableFilteredHostCodes) {
                                    next.add(code);
                                  }
                                  return next;
                                });
                                setDraftIncludeUnspecifiedHost(false);
                              }}
                            >
                              {fp.selectAll}
                            </button>
                          </div>
                          <button
                            type="button"
                            className={`${scholarshipCategoriesApplyButtonClass} inline-flex w-full min-w-0 shrink-0 items-center justify-center gap-1.5 sm:w-auto`}
                            onClick={() => {
                              onApplyHostCountries?.(
                                new Set(draftHostCountryCodes),
                                draftIncludeUnspecifiedHost
                              );
                              setDestinationOpen(false);
                            }}
                          >
                            {fp.showScholarships}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className="relative order-2 min-w-0 justify-self-stretch sm:order-4 sm:min-w-0 sm:w-auto sm:shrink-0"
                  ref={categoriesRef}
                >
                  <button
                    type="button"
                    disabled={categoriesDisabled}
                    onClick={() => {
                      if (categoriesDisabled) return;
                      setSortOpen(false);
                      setCountriesOpen(false);
                      setDestinationOpen(false);
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
                    {ui.categories}
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
              {savedFilterPresetButtons.length > 0 ? (
                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                  <span className="text-xs font-medium text-zinc-400">
                    {savedFilterBarHint?.trim() || ui.savedFiltersDefault}
                  </span>
                  {savedFilterPresetButtons.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSavedFilterPresetSelect?.(preset.id)}
                      className={`max-w-[12rem] truncate rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        preset.active
                          ? 'border-[#FF7A1A] bg-[#FF7A1A] text-white shadow-sm'
                          : 'border-orange-200 bg-orange-50 text-[#D95F00] hover:border-orange-300 hover:bg-orange-100'
                      }`}
                      title={preset.name}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              ) : null}
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
                {ui.clearAll}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {categoryDropdown}
    </div>
  );
}

export default memo(ScholarshipsListHeader);
