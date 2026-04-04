import type { Scholarship } from '../app/scholarships/scholarshipsData';

type ListPayload = {
  scholarships?: unknown;
  total?: unknown;
};

const PAGE_LIMIT = 50;

/**
 * Loads the full catalog from `/api/scholarships` (paginated `{ scholarships, total }`)
 * or a legacy endpoint that returns a bare `Scholarship[]`.
 */
export async function fetchScholarshipsCatalogFromUrl(
  url: string
): Promise<Scholarship[]> {
  let page = 1;
  let total = Infinity;
  const out: Scholarship[] = [];

  while (out.length < total) {
    const u = new URL(url);
    u.searchParams.set('limit', String(PAGE_LIMIT));
    u.searchParams.set('page', String(page));
    const res = await fetch(u.toString());
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    const raw = (await res.json()) as unknown;

    if (page === 1 && Array.isArray(raw)) {
      return raw as Scholarship[];
    }

    const j = raw as ListPayload;
    const rows = j.scholarships;
    if (!Array.isArray(rows)) {
      throw new Error('expected Scholarship[] or { scholarships, total }');
    }
    if (typeof j.total === 'number' && Number.isFinite(j.total)) {
      total = j.total;
    }

    out.push(...(rows as Scholarship[]));
    if (rows.length === 0 || rows.length < PAGE_LIMIT) break;
    page += 1;
  }

  return out;
}
