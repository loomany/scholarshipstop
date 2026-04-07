export const PROVIDERS_HUB_PAGE_SIZE = 9;

export function parseProvidersHubPageParam(
  raw: string | string[] | undefined
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? '1'), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/**
 * Build `/providers` URLs preserving `q`, `state`, and `page` query params.
 */
export function buildProvidersHubHref(options: {
  q?: string | null;
  state?: string | null;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  const q = options.q?.trim();
  const state = options.state?.trim().toUpperCase();
  if (q) sp.set('q', q);
  if (state && state.length === 2) sp.set('state', state);
  if (options.page != null && options.page > 1) {
    sp.set('page', String(options.page));
  }
  const s = sp.toString();
  return s ? `/providers?${s}` : '/providers';
}
