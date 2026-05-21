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
import { ChevronDown, Globe, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CATALOG_CONTROL_BAR_BTN,
  SITE_SEARCH_INPUT_CHROME
} from '@/lib/constants/catalogControlBar';
import { buildProvidersHubHref } from '@/lib/providers/providersHubUrl';
import type { ProvidersHubCountryBucket } from '@/lib/providers/providersHubCountryFilter';
import { parseProvidersHubCountryParam } from '@/lib/providers/providersHubCountryFilter';

const PANEL_GAP = 8;
const PANEL_VPAD = 12;
const PANEL_MIN_W = 260;
const PANEL_MAX_W = 360;
const PANEL_MAX_H = 320;

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function measurePanel(el: HTMLElement): PanelLayout {
  const r = el.getBoundingClientRect();
  const width = Math.min(
    PANEL_MAX_W,
    Math.max(PANEL_MIN_W, r.width)
  );
  let left = r.left;
  left = Math.min(left, window.innerWidth - PANEL_VPAD - width);
  left = Math.max(PANEL_VPAD, left);
  const top = r.bottom + PANEL_GAP;
  const maxHeight = Math.max(
    160,
    Math.min(
      PANEL_MAX_H,
      window.innerHeight - top - PANEL_VPAD
    )
  );
  return { top, left, width, maxHeight };
}

const DEFAULT_COUNTRY_OPTIONS: {
  value: ProvidersHubCountryBucket;
  label: string;
}[] = [
  { value: 'all', label: 'All countries' },
  { value: 'us', label: 'United States' },
  { value: 'other', label: 'Other & international' }
];

type Props = {
  defaultQuery: string;
  /** Preserves `?state=` in the form when present (e.g. bookmarked URLs). */
  activeStateCode: string;
  activeCountry: ProvidersHubCountryBucket;
  /** GET form `action` — `/providers` or `/providers/{stateSlug}`. */
  listingBasePath?: string;
  /** When state is in the path, omit hidden `state` inputs. */
  stateEncodedInPath?: boolean;
  searchPlaceholder?: string;
  countryOptions?: { value: ProvidersHubCountryBucket; label: string }[];
  countriesDropdownLabel?: string;
  loadingSearchAria?: string;
};

export function ProvidersHubToolbar({
  defaultQuery,
  activeStateCode,
  activeCountry,
  listingBasePath = '/providers',
  stateEncodedInPath = false,
  searchPlaceholder = 'Search by provider name, state, or your request...',
  countryOptions = DEFAULT_COUNTRY_OPTIONS,
  countriesDropdownLabel = 'Countries',
  loadingSearchAria = 'Loading search'
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [qDraft, setQDraft] = useState(defaultQuery);
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [countriesPanelLayout, setCountriesPanelLayout] =
    useState<PanelLayout | null>(null);
  const [mounted, setMounted] = useState(false);

  const countriesRef = useRef<HTMLDivElement>(null);
  const countriesDropdownRef = useRef<HTMLDivElement>(null);

  const urlCountry = useMemo(
    () => parseProvidersHubCountryParam(sp.get('country') ?? undefined),
    [sp]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQDraft(defaultQuery);
  }, [defaultQuery]);

  const replaceListing = useCallback(
    (patch: {
      q?: string;
      /** Pass `null` to clear state from the URL. */
      state?: string | null;
      country?: ProvidersHubCountryBucket;
      resetPage?: boolean;
    }) => {
      const q =
        patch.q !== undefined ? patch.q : (sp.get('q') ?? '').trim();
      const country =
        patch.country !== undefined ? patch.country : urlCountry;

      let stateForHref: string | undefined;
      if (country === 'other') {
        stateForHref = undefined;
      } else if ('state' in patch) {
        const t = (patch.state ?? '').trim().toUpperCase();
        stateForHref = t.length === 2 ? t : undefined;
      } else {
        const t = (activeStateCode || '').trim().toUpperCase();
        stateForHref = t.length === 2 ? t : undefined;
      }

      const page =
        patch.resetPage === true
          ? 1
          : Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
      const href = buildProvidersHubHref({
        q: q || undefined,
        state: stateForHref,
        country,
        page: page > 1 ? page : 1
      });
      router.replace(href, { scroll: false });
    },
    [activeStateCode, router, sp, urlCountry]
  );

  const updateCountriesLayout = useCallback(() => {
    const wrap = countriesRef.current;
    if (!wrap || !countriesOpen) return;
    setCountriesPanelLayout(measurePanel(wrap));
  }, [countriesOpen]);

  useLayoutEffect(() => {
    if (!countriesOpen) {
      setCountriesPanelLayout(null);
      return;
    }
    updateCountriesLayout();
  }, [countriesOpen, updateCountriesLayout]);

  useEffect(() => {
    if (!countriesOpen) return;
    const onRe = () => updateCountriesLayout();
    window.addEventListener('resize', onRe);
    window.addEventListener('scroll', onRe, true);
    return () => {
      window.removeEventListener('resize', onRe);
      window.removeEventListener('scroll', onRe, true);
    };
  }, [countriesOpen, updateCountriesLayout]);

  useEffect(() => {
    if (!countriesOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (countriesRef.current?.contains(t)) return;
      if (countriesDropdownRef.current?.contains(t)) return;
      setCountriesOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [countriesOpen]);

  useEffect(() => {
    if (!countriesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCountriesOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [countriesOpen]);

  const optionSelectedClass = 'bg-gray-100 font-medium text-gray-900';
  const optionDefaultClass = 'text-gray-600';

  const countriesDropdown =
    mounted &&
    countriesOpen &&
    countriesPanelLayout &&
    createPortal(
      <div
        ref={countriesDropdownRef}
        role="dialog"
        aria-label={countriesDropdownLabel}
        className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-sm ring-1 ring-zinc-900/5"
        style={{
          top: countriesPanelLayout.top,
          left: countriesPanelLayout.left,
          width: countriesPanelLayout.width,
          maxHeight: countriesPanelLayout.maxHeight
        }}
      >
        <ul role="listbox" aria-label="Filter by country" className="py-1">
          {countryOptions.map((opt) => (
            <li key={opt.value} role="option">
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 ${
                  activeCountry === opt.value
                    ? optionSelectedClass
                    : optionDefaultClass
                }`}
                onClick={() => {
                  replaceListing({
                    country: opt.value,
                    ...(opt.value === 'other' ? { state: null } : {}),
                    resetPage: true
                  });
                  setCountriesOpen(false);
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
    <div className="relative z-[70] w-full space-y-2">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form action={listingBasePath} method="get" role="search" className="w-full">
          {activeStateCode && activeCountry !== 'other' && !stateEncodedInPath ? (
            <input type="hidden" name="state" value={activeStateCode} />
          ) : null}
          {activeCountry !== 'all' ? (
            <input
              type="hidden"
              name="country"
              value={activeCountry === 'us' ? 'us' : 'other'}
            />
          ) : null}
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="providers-toolbar-q" className="sr-only">
                {searchPlaceholder}
              </label>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                id="providers-toolbar-q"
                name="q"
                type="search"
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className={`w-full py-3.5 pl-12 pr-4 text-left text-base text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`}
              />
            </div>
            <div
              className="relative min-w-0 sm:min-w-0 sm:w-auto sm:shrink-0"
              ref={countriesRef}
            >
              <button
                type="button"
                aria-expanded={countriesOpen}
                aria-haspopup="dialog"
                onClick={() => setCountriesOpen((o) => !o)}
                className={`${CATALOG_CONTROL_BAR_BTN} w-full sm:w-auto`}
              >
                <Globe
                  className="h-[18px] w-[18px] shrink-0 text-gray-600"
                  strokeWidth={2}
                  aria-hidden
                />
                {countriesDropdownLabel}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-500 transition ${countriesOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
            </div>
          </div>
        </form>
      </div>
      {countriesDropdown}
    </div>
  );
}
