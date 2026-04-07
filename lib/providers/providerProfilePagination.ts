export const PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE = 9;

export function parseProviderProfilePageParam(
  raw: string | string[] | undefined
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? '1'), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/** Pagination links scroll to the scholarships block via hash. */
export function buildProviderProfileScholarshipsHref(
  providerRouteId: string,
  page: number
): string {
  const id = encodeURIComponent(providerRouteId);
  const base = `/providers/${id}`;
  const hash = '#provider-scholarships';
  if (page <= 1) return `${base}${hash}`;
  return `${base}?page=${page}${hash}`;
}
