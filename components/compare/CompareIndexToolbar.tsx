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
import { ChevronDown, LayoutGrid, Search, SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CATALOG_CONTROL_BAR_BTN,
  CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS
} from '@/lib/constants/catalogControlBar';
import { scholarshipCategoriesApplyButtonClass } from '@/lib/constants/scholarshipActionUi';
import {
  buildCompareIndexHref,
  parseCompareIndexSearchParams,
  type CompareIndexCategory,
  type CompareIndexQueryState,
  type CompareIndexSort
} from '@/lib/seo/compareIndexFilters';

const PANEL_GAP = 8;
const PANEL_VPAD = 12;
const PANEL_MIN_W = 288;
const PANEL_MAX_W = 384;
const PANEL_MAX_H = 400;

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type CompareIndexToolbarProps = {
  categoryCounts?: Record<'universities' | 'states', number>;
  resultCount: number;
  showingFrom: number;
  showingTo: number;
  basePath?: string;
  showCategories?: boolean;
  fixedCategory?: CompareIndexCategory;
  searchPlaceholder?: string;
  resultLabel?: string;
};

function measurePanel(el: HTMLElement): PanelLayout {
  const r = el.getBoundingClientRect();
  const width = Math.min(PANEL_MAX_W, Math.max(PANEL_MIN_W, r.width));
  let left = r.left;
  left = Math.min(left, window.innerWidth - PANEL_VPAD - width);
  left = Math.max(PANEL_VPAD, left);
  const top = r.bottom + PANEL_GAP;
  const maxHeight = Math.max(
    200,
    Math.min(PANEL_MAX_H, window.innerHeight - top - PANEL_VPAD)
  );
  return { top, left, width, maxHeight };
}

function stateFromSearchParams(sp: URLSearchParams): CompareIndexQueryState {
  return parseCompareIndexSearchParams({
    q: sp.get('q') ?? undefined,
    cat: sp.get('cat') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    page: sp.get('page') ?? undefined
  });
}

const CATEGORY_OPTIONS: {
  id: CompareIndexCategory;
  label: string;
  countKey?: 'universities' | 'states';
}[] = [
  { id: 'all', label: 'All comparisons' },
  { id: 'universities', label: 'University battles', countKey: 'universities' },
  { id: 'states', label: 'State wars', countKey: 'states' }
];

const SORT_OPTIONS: { value: CompareIndexSort; label: string }[] = [
  { value: 'latest', label: 'Latest first' },
  { value: 'title', label: 'Title A-Z' }
];

export default function CompareIndexToolbar({
  categoryCounts = { universities: 0, states: 0 },
  resultCount,
  showingFrom,
  showingTo,
  basePath = '/compare',
  showCategories = true,
  fixedCategory,
  searchPlaceholder = 'Search comparisons',
  resultLabel = 'comparisons'
}: CompareIndexToolbarProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const applied = useMemo(() => stateFromSearchParams(sp), [sp]);

  const [searchDraft, setSearchDraft] = useState(applied.q);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftCategory, setDraftCategory] =
    useState<CompareIndexCategory>(applied.category);
  const [categoryPanelLayout, setCategoryPanelLayout] =
    useState<PanelLayout | null>(null);
  const [filtersPanelLayout, setFiltersPanelLayout] =
    useState<PanelLayout | null>(null);
  const [mounted, setMounted] = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSearchDraft(applied.q);
  }, [applied.q]);

  const replaceState = useCallback(
    (patch: Partial<CompareIndexQueryState> & { resetPage?: boolean }) => {
      const next: CompareIndexQueryState = {
        q: patch.q !== undefined ? patch.q : applied.q,
        category:
          fixedCategory ??
          (patch.category !== undefined ? patch.category : applied.category),
        sort: patch.sort !== undefined ? patch.sort : applied.sort,
        page: patch.resetPage
          ? 1
          : patch.page !== undefined
            ? patch.page
            : applied.page
      };
      const href = buildCompareIndexHref(next.page, {
        q: next.q,
        category: next.category,
        sort: next.sort
      }, basePath);
      router.replace(href, { scroll: false });
    },
    [applied, basePath, fixedCategory, router]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = searchDraft.trim();
      if (trimmed === applied.q.trim()) return;
      replaceState({ q: trimmed, resetPage: true });
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchDraft, applied.q, replaceState]);

  const updateCategoryPanelLayout = useCallback(() => {
    const wrap = categoriesRef.current;
    if (!wrap || !categoriesOpen) return;
    setCategoryPanelLayout(measurePanel(wrap));
  }, [categoriesOpen]);

  const updateFiltersPanelLayout = useCallback(() => {
    const wrap = filtersRef.current;
    if (!wrap || !filtersOpen) return;
    setFiltersPanelLayout(measurePanel(wrap));
  }, [filtersOpen]);

  useLayoutEffect(() => {
    if (!categoriesOpen) {
      setCategoryPanelLayout(null);
      return;
    }
    updateCategoryPanelLayout();
  }, [categoriesOpen, updateCategoryPanelLayout]);

  useLayoutEffect(() => {
    if (!filtersOpen) {
      setFiltersPanelLayout(null);
      return;
    }
    updateFiltersPanelLayout();
  }, [filtersOpen, updateFiltersPanelLayout]);

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
    if (!filtersOpen) return;
    const onRe = () => updateFiltersPanelLayout();
    window.addEventListener('resize', onRe);
    window.addEventListener('scroll', onRe, true);
    return () => {
      window.removeEventListener('resize', onRe);
      window.removeEventListener('scroll', onRe, true);
    };
  }, [filtersOpen, updateFiltersPanelLayout]);

  useEffect(() => {
    if (!categoriesOpen && !filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (categoriesRef.current?.contains(t)) return;
      if (categoryDropdownRef.current?.contains(t)) return;
      if (filtersRef.current?.contains(t)) return;
      if (filtersDropdownRef.current?.contains(t)) return;
      setCategoriesOpen(false);
      setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [categoriesOpen, filtersOpen]);

  useEffect(() => {
    if (!categoriesOpen && !filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCategoriesOpen(false);
      setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [categoriesOpen, filtersOpen]);

  useEffect(() => {
    if (!categoriesOpen) return;
    setDraftCategory(applied.category);
  }, [categoriesOpen, applied.category]);

  const effectiveCategory = fixedCategory ?? applied.category;
  const filtersActiveCount = applied.sort !== 'latest' ? 1 : 0;
  const categoryTriggerCount = effectiveCategory !== 'all' ? 1 : 0;
  const optionSelectedClass = 'bg-gray-100 font-medium text-gray-900';
  const optionDefaultClass = 'text-gray-600';

  const categoryDropdown =
    mounted &&
    categoriesOpen &&
    categoryPanelLayout &&
    createPortal(
      <div
        ref={categoryDropdownRef}
        role="dialog"
        aria-label="Categories"
        className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/5"
        style={{
          top: categoryPanelLayout.top,
          left: categoryPanelLayout.left,
          width: categoryPanelLayout.width,
          maxHeight: categoryPanelLayout.maxHeight
        }}
      >
        <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">Categories</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Choose which comparison collection to browse.
          </p>
        </div>
        <ul
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1"
          role="list"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <li key={option.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50">
                <input
                  type="radio"
                  name="compare-category"
                  checked={draftCategory === option.id}
                  onChange={() => setDraftCategory(option.id)}
                  className="scholarship-deadline-radio mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                  {option.label}
                </span>
                {option.countKey ? (
                  <span className="shrink-0 tabular-nums text-sm font-medium text-zinc-500">
                    {categoryCounts[option.countKey] ?? 0}
                  </span>
                ) : (
                  <span className="shrink-0 tabular-nums text-sm font-medium text-zinc-500">
                    {categoryCounts.universities + categoryCounts.states}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            className="rounded-md text-sm font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-0"
            onClick={() => setDraftCategory('all')}
          >
            Clear
          </button>
          <button
            type="button"
            className={scholarshipCategoriesApplyButtonClass}
            onClick={() => {
              replaceState({
                category: draftCategory,
                resetPage: true
              });
              setCategoriesOpen(false);
            }}
          >
            Apply
          </button>
        </div>
      </div>,
      document.body
    );

  const filtersDropdown =
    mounted &&
    filtersOpen &&
    filtersPanelLayout &&
    createPortal(
      <div
        ref={filtersDropdownRef}
        role="dialog"
        aria-label="Filters"
        className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-sm ring-1 ring-zinc-900/5"
        style={{
          top: filtersPanelLayout.top,
          left: filtersPanelLayout.left,
          width: filtersPanelLayout.width,
          maxHeight: filtersPanelLayout.maxHeight
        }}
      >
        <div className="border-b border-zinc-100 px-4 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Sort
          </p>
        </div>
        <ul role="listbox" aria-label="Sort comparisons" className="py-1">
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.value} role="option">
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 ${
                  applied.sort === opt.value ? optionSelectedClass : optionDefaultClass
                }`}
                onClick={() => {
                  replaceState({ sort: opt.value, resetPage: true });
                  setFiltersOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>,
      document.body
    );

  return (
    <div className="relative z-[70] mt-6 max-w-3xl space-y-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
              strokeWidth={2}
              aria-hidden
            />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS}
            />
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto sm:shrink-0">
            <div className="relative min-w-0 sm:min-w-0" ref={filtersRef}>
              <button
                type="button"
                aria-label="Open filters"
                aria-expanded={filtersOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setCategoriesOpen(false);
                  setFiltersOpen((open) => !open);
                }}
                className={`${CATALOG_CONTROL_BAR_BTN} w-full sm:w-auto`}
              >
                <SlidersHorizontal
                  className="h-[18px] w-[18px] shrink-0 text-gray-600"
                  strokeWidth={2}
                  aria-hidden
                />
                Filters
                {filtersActiveCount > 0 ? (
                  <span className="tabular-nums text-gray-600">
                    ({filtersActiveCount})
                  </span>
                ) : null}
              </button>
            </div>
            {showCategories ? (
              <div className="relative min-w-0 sm:min-w-0" ref={categoriesRef}>
                <button
                  type="button"
                  aria-expanded={categoriesOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setFiltersOpen(false);
                    setCategoriesOpen((open) => !open);
                  }}
                  className={`${CATALOG_CONTROL_BAR_BTN} w-full sm:w-auto`}
                >
                  <LayoutGrid className="h-[18px] w-[18px] text-gray-600" />
                  Categories
                  {categoryTriggerCount > 0 ? (
                    <span className="tabular-nums text-gray-600">
                      ({categoryTriggerCount})
                    </span>
                  ) : null}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition ${categoriesOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {resultCount > 0 ? (
        <p className="text-sm text-gray-500">
          {showingFrom >= 1 && showingTo >= showingFrom
            ? `Showing ${showingFrom}–${showingTo} of ${resultCount} ${resultLabel}`
            : `Found ${resultCount} ${resultLabel}`}
        </p>
      ) : null}

      {showCategories ? categoryDropdown : null}
      {filtersDropdown}
    </div>
  );
}
