import 'server-only';

import { matchProviderToSchool } from './schoolEnrichment';
import { loadProviderNonprofitEnrichmentRecords } from './loadStaticEnrichment';
import type { ProviderNonprofitEnrichment } from './types';

let byNameStateCache: Map<string, ProviderNonprofitEnrichment[]> | null = null;
let byEinCache: Map<string, ProviderNonprofitEnrichment> | null = null;

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\b(the)\b/g, ' ')
    .replace(/\b(incorporated|inc|llc|l l c|corp|corporation|co|company)\b\.?/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function nameStateKey(name: string, state: string): string {
  return `${normalizeName(name)}|${state.trim().toUpperCase()}`;
}

function ensureIndexes(): void {
  if (byNameStateCache && byEinCache) return;

  byNameStateCache = new Map();
  byEinCache = new Map();

  for (const row of loadProviderNonprofitEnrichmentRecords()) {
    const state = row.state?.trim().toUpperCase();
    if (!row.name || !state) continue;

    const key = nameStateKey(row.name, state);
    const matches = byNameStateCache.get(key) ?? [];
    matches.push(row);
    byNameStateCache.set(key, matches);

    const ein = row.ein?.replace(/\D/g, '');
    if (ein) byEinCache.set(ein, row);
  }
}

export function getProviderNonprofitByEin(
  ein: string | null | undefined
): ProviderNonprofitEnrichment | null {
  const key = ein?.replace(/\D/g, '');
  if (!key) return null;
  ensureIndexes();
  return byEinCache!.get(key) ?? null;
}

/** Strict normalized name + state lookup. Ambiguous names are hidden. */
export function getProviderNonprofitByNameState(
  name: string,
  state?: string | null
): ProviderNonprofitEnrichment | null {
  const stateCode = state?.trim().toUpperCase();
  if (!name.trim() || !stateCode) return null;

  ensureIndexes();
  const matches = byNameStateCache!.get(nameStateKey(name, stateCode));
  if (!matches?.length) return null;
  if (matches.length > 1) return null;
  return matches[0] ?? null;
}

/**
 * Display helper for provider pages. School/university providers continue to use
 * College Scorecard cards; nonprofit cards are a fallback for exact nonprofit matches.
 */
export function matchProviderToNonprofit(input: {
  displayName: string;
  hqState?: string | null;
}): ProviderNonprofitEnrichment | null {
  if (matchProviderToSchool(input)) return null;
  return getProviderNonprofitByNameState(input.displayName, input.hqState);
}
