import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';

/**
 * Shared listing toolbar styles — keep aligned with `ScholarshipsListHeader`
 * (catalog / matches) and resource index toolbar.
 */
export const CATALOG_CONTROL_BAR_BTN =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Tighter catalog chips (e.g. Filters + country/host + Categories on one row).
 * Allows slight shrink so `truncate` on labels can recover space.
 */
export const CATALOG_CONTROL_BAR_BTN_COMPACT =
  'inline-flex h-9 min-w-0 shrink items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Shared border + focus glow for site-wide search/filter text fields.
 * Compose with layout classes (`h-*`, `pl-*`, `text-sm`, etc.).
 */
export const SITE_SEARCH_INPUT_CHROME = `rounded-2xl border border-zinc-200 bg-white shadow-sm outline-none transition placeholder:text-zinc-400 ${SITE_INPUT_FOCUS_CLASS}`;

/** Full-width keyword search with leading icon (`left-3` → `pl-10` in markup). */
export const CATALOG_SEARCH_BY_KEYWORD_INPUT_CLASS = `h-11 w-full py-0 pl-10 pr-4 text-left text-sm text-zinc-900 ${SITE_SEARCH_INPUT_CHROME}`;
