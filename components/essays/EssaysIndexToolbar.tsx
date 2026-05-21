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

import clsx from 'clsx';

import {
  CATALOG_CONTROL_BAR_BTN,
  CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS
} from '@/lib/constants/catalogControlBar';
import { scholarshipCategoriesApplyButtonClass } from '@/lib/constants/scholarshipActionUi';
import {
  buildEssaysIndexHref,
  parseEssaysIndexSearchParams,
  type EssayCategoryToolbarOption,
  type EssaysIndexQueryState
} from '@/lib/essays/essaysIndexFilters';
import { ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';

import { EssaysIndexResultSummary } from '@/components/essays/EssaysIndexResultSummary';

const CATEGORY_PANEL_GAP = 8;
const CATEGORY_PANEL_VPAD = 12;
const CATEGORY_PANEL_MIN_W = 288;
const CATEGORY_PANEL_MAX_W = 384;
const CATEGORY_PANEL_MAX_H = 400;

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function measurePanel(el: HTMLElement): PanelLayout {
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

function stateFromSearchParams(sp: URLSearchParams): EssaysIndexQueryState {
  const record: Record<string, string | undefined> = {
    q: sp.get('q') ?? undefined,
    cat: sp.get('cat') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    page: sp.get('page') ?? undefined
  };
  return parseEssaysIndexSearchParams(record);
}

import { getHubToolbarUiCopy } from '@/lib/i18n/hubUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type EssaysIndexToolbarProps = {
  categoryOptions: EssayCategoryToolbarOption[];
  resultCount: number;
  showingFrom: number;
  showingTo: number;
  locale?: LocalizedUiLocale;
  /** Merged onto the root wrapper (e.g. `mt-0` beside hero video). */
  className?: string;
};

export default function EssaysIndexToolbar({
  categoryOptions,
  resultCount,
  showingFrom,
  showingTo,
  locale,
  className
}: EssaysIndexToolbarProps) {
  const toolbar = getHubToolbarUiCopy(locale ?? 'en');
  const router = useRouter();
  const sp = useSearchParams();
  const applied = useMemo(() => stateFromSearchParams(sp), [sp]);

  const [searchDraft, setSearchDraft] = useState(applied.q);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftCategoryKey, setDraftCategoryKey] = useState<string | null>(
    applied.categoryKey
  );
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
    (patch: Partial<EssaysIndexQueryState> & { resetPage?: boolean }) => {
      const next: EssaysIndexQueryState = {
        q: patch.q !== undefined ? patch.q : applied.q,
        categoryKey:
          patch.categoryKey !== undefined ? patch.categoryKey : applied.categoryKey,
        sort: patch.sort !== undefined ? patch.sort : applied.sort,
        page: patch.resetPage
          ? 1
          : patch.page !== undefined
            ? patch.page
            : applied.page
      };
      const href = buildEssaysIndexHref(next.page, next, ESSAYS_SECTION_PATH);
      router.replace(href, { scroll: false });
    },
    [applied, router]
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
    setDraftCategoryKey(applied.categoryKey);
  }, [categoriesOpen, applied.categoryKey]);

  const filtersActiveCount = applied.sort !== 'latest' ? 1 : 0;
  const categoryTriggerCount = applied.categoryKey ? 1 : 0;

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
            Narrow guides by the linked scholarship category. Clear below to show
            all.
          </p>
        </div>
        <ul
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1"
          role="list"
        >
          <li>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50">
              <input
                type="radio"
                name="essay-index-category"
                checked={draftCategoryKey === null}
                onChange={() => setDraftCategoryKey(null)}
                className="scholarship-deadline-radio mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                All topics
              </span>
            </label>
          </li>
          {categoryOptions.map((opt) => (
            <li key={opt.key}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50">
                <input
                  type="radio"
                  name="essay-index-category"
                  checked={draftCategoryKey === opt.key}
                  onChange={() => setDraftCategoryKey(opt.key)}
                  className="scholarship-deadline-radio mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800">
                  {opt.label}
                </span>
                <span className="shrink-0 tabular-nums text-sm font-medium text-zinc-500">
                  {opt.count}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            className="rounded-md text-sm font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-0"
            onClick={() => setDraftCategoryKey(null)}
          >
            Clear
          </button>
          <button
            type="button"
            className={scholarshipCategoriesApplyButtonClass}
            onClick={() => {
              replaceState({
                categoryKey: draftCategoryKey,
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
        <ul role="listbox" aria-label="Sort guides" className="py-1">
          {(
            [
              { value: 'latest' as const, label: 'Latest first' },
              { value: 'oldest' as const, label: 'Oldest first' }
            ] as const
          ).map((opt) => (
            <li key={opt.value} role="option">
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 ${
                  applied.sort === opt.value
                    ? optionSelectedClass
                    : optionDefaultClass
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
    <div
      className={clsx(
        'relative z-[70] mt-6 max-w-3xl space-y-2',
        className
      )}
    >
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
              placeholder={toolbar.searchByKeyword}
              aria-label={toolbar.searchByKeywordAria}
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
                  setFiltersOpen((o) => !o);
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

            <div className="relative min-w-0 sm:min-w-0" ref={categoriesRef}>
              <button
                type="button"
                aria-expanded={categoriesOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setFiltersOpen(false);
                  setCategoriesOpen((o) => !o);
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
          </div>
        </div>
      </div>

      <EssaysIndexResultSummary
        resultCount={resultCount}
        showingFrom={showingFrom}
        showingTo={showingTo}
        className="hidden lg:block"
      />

      {categoryDropdown}
      {filtersDropdown}
    </div>
  );
}
