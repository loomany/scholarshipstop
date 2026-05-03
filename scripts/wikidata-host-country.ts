/**
 * Lightweight Wikidata lookups (wbsearchentities + wbgetentities) to infer organization country ISO 3166-1 alpha-2.
 *
 * Uses public https://wikidata.org/w/api.php — set a descriptive User-Agent (Wikimedia policy).
 *
 * Env:
 *   WIKIDATA_ENABLED — «1», «true», «yes», unset = on; «0», «false», «no» = off
 *   WIKIDATA_GAP_MS — pause between outbound requests (default 450)
 *   WIKIDATA_USER_AGENT — custom UA string for all requests
 *   WIKIDATA_SEARCH_LIMIT — max search hits to inspect (default 8, max 20)
 */

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

export type WikidataOrgInput = {
  provider_name: string | null;
  official_source_name: string | null;
};

/** Uppercase Alpha-2 or null when unknown / errors (caller may log). */
export function wikidataLookupEnabled(cliNoWikidata: boolean): boolean {
  if (cliNoWikidata) return false;
  const raw = process.env.WIKIDATA_ENABLED?.trim().toLowerCase();
  if (!raw?.length) return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return !(raw !== '1' && raw !== 'true' && raw !== 'yes' && raw !== 'on');
}

export function wikidataGapMs(): number {
  const raw = process.env.WIKIDATA_GAP_MS?.trim();
  if (!raw?.length) return 450;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 50 ? Math.min(n, 10_000) : 450;
}

function userAgent(): string {
  const u = process.env.WIKIDATA_USER_AGENT?.trim();
  return (
    u ||
    'ScholarshipHostClassifier/1.0 (resume host-country batch; https://scholarshiptop.com; contact via site)'
  );
}

async function pauseGap(): Promise<void> {
  const ms = wikidataGapMs();
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

function sanitizeSearchQuery(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const s = raw
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  if (s.length < 5) return null;
  const lower = s.toLowerCase();
  if (
    /^(scholarship|grant|award|financial aid)$/i.test(s) ||
    /^apply (now|today)/i.test(s) ||
    /scholarships? for/i.test(lower)
  ) {
    return null;
  }
  return s;
}

function uniqueQueries(input: WikidataOrgInput): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const cand of [
    sanitizeSearchQuery(input.provider_name),
    sanitizeSearchQuery(input.official_source_name)
  ]) {
    if (!cand) continue;
    const k = cand.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    list.push(cand);
  }
  return list;
}

async function wikiApi(params: Record<string, string>): Promise<unknown> {
  await pauseGap();
  const url = new URL(WIKIDATA_API);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set('format', 'json');
  const res = await fetch(url.href, {
    redirect: 'follow',
    headers: { Accept: 'application/json', 'User-Agent': userAgent() }
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Wikidata: ответ не JSON (HTTP ${res.status})`);
  }
  const errBody = json as { error?: { info?: string; code?: string } };
  if (errBody.error) {
    throw new Error(`Wikidata API: ${errBody.error.info ?? errBody.error.code ?? 'error'}`);
  }
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  return json;
}

type WbClaims = Record<string, WbClaim[]>;
type WbClaim = {
  mainsnak?: {
    snaktype?: string;
    datavalue?: { type?: string; value?: { id?: string } | string };
  };
};
type EntityJson = {
  claims?: WbClaims;
};

function extractP17CountryQid(entity: EntityJson): string | null {
  const claims = entity.claims?.P17;
  if (!Array.isArray(claims)) return null;
  for (const c of claims) {
    const sn = c.mainsnak;
    if (!sn || sn.snaktype !== 'value' || sn.datavalue?.type !== 'wikibase-entityid') continue;
    const id = sn.datavalue.value as { id?: string };
    if (typeof id?.id === 'string') return id.id;
  }
  return null;
}

function extractP297Iso(entity: EntityJson): string | null {
  const claims = entity.claims?.P297;
  if (!Array.isArray(claims)) return null;
  for (const c of claims) {
    const sn = c.mainsnak;
    if (!sn || sn.snaktype !== 'value') continue;
    const v = sn.datavalue?.value;
    if (typeof v === 'string' && /^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  }
  return null;
}

function searchLimit(): number {
  const raw = process.env.WIKIDATA_SEARCH_LIMIT?.trim();
  if (!raw) return 8;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(20, Math.max(1, n)) : 8;
}

async function searchEntityIds(term: string): Promise<string[]> {
  const json = (await wikiApi({
    action: 'wbsearchentities',
    search: term,
    language: 'en',
    uselang: 'en',
    type: 'item',
    limit: String(searchLimit())
  })) as { search?: Array<{ id: string }> };
  const list = json.search ?? [];
  return list.map((s) => s.id).filter((id): id is string => typeof id === 'string' && /^Q\d+/.test(id));
}

async function fetchEntities(ids: string[]): Promise<Map<string, EntityJson>> {
  const map = new Map<string, EntityJson>();
  if (ids.length === 0) return map;
  const chunk = 40;
  for (let offset = 0; offset < ids.length; offset += chunk) {
    const slice = ids.slice(offset, offset + chunk).join('|');
    const json = (await wikiApi({
      action: 'wbgetentities',
      ids: slice,
      props: 'claims',
      languages: 'en'
    })) as { entities?: Record<string, EntityJson | { missing?: '' }> };
    const ent = json.entities ?? {};
    for (const q of Object.keys(ent)) {
      const row = ent[q];
      if (row && !('missing' in row)) map.set(q, row as EntityJson);
    }
  }
  return map;
}

async function resolveIsoFromCountryQs(countryQs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const uniq = [...new Set(countryQs)].filter((q) => /^Q\d+/.test(q));
  const chunkMap = await fetchEntities(uniq);
  for (const q of uniq) {
    const iso = extractP297Iso(chunkMap.get(q) ?? {});
    if (iso) out.set(q, iso);
  }
  return out;
}

/** Best-effort: org name → country ISO Alpha-2. Returns null when nothing reliable. */
export async function resolveHostCountryViaWikidata(input: WikidataOrgInput): Promise<string | null> {
  const queries = uniqueQueries(input);
  if (queries.length === 0) return null;

  for (const q of queries) {
    let ids: string[] = [];
    try {
      ids = await searchEntityIds(q);
    } catch (e) {
      console.warn('Wikidata search:', (e as Error).message ?? e);
      continue;
    }
    if (ids.length === 0) continue;

    let orgEntities: Map<string, EntityJson>;
    try {
      orgEntities = await fetchEntities(ids);
    } catch (e) {
      console.warn('Wikidata wbgetentities (org):', (e as Error).message ?? e);
      continue;
    }

    const cqSet = new Set<string>();
    for (const oid of ids) {
      const ent = orgEntities.get(oid);
      const cq = ent ? extractP17CountryQid(ent) : null;
      if (cq) cqSet.add(cq);
    }
    if (cqSet.size === 0) continue;

    let isoByCountry: Map<string, string>;
    try {
      isoByCountry = await resolveIsoFromCountryQs([...cqSet]);
    } catch (e) {
      console.warn('Wikidata country ISO:', (e as Error).message ?? e);
      continue;
    }

    /** Same order as Wikidata search — first org with usable P17 + P297 wins */
    for (const oid of ids) {
      const ent = orgEntities.get(oid);
      const cq = ent ? extractP17CountryQid(ent) : null;
      if (!cq) continue;
      const iso = isoByCountry.get(cq);
      if (iso) return iso;
    }
  }
  return null;
}
