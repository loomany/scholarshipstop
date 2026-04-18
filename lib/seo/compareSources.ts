import 'server-only';

export type CompareSourceLink = {
  label: string;
  url: string;
  type?: 'official' | 'government' | 'reference';
};

const BLOCKED_SOURCE_HOSTS = new Set([
  'bigfuture.collegeboard.org',
  'www.bigfuture.collegeboard.org',
  'bold.org',
  'www.bold.org'
]);

function normalizeHttpUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (BLOCKED_SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function dedupeSources(items: CompareSourceLink[]): CompareSourceLink[] {
  const seen = new Set<string>();
  const out: CompareSourceLink[] = [];
  for (const item of items) {
    const label = item.label?.trim();
    const url = normalizeHttpUrl(item.url);
    if (!label || !url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      label,
      url,
      type: item.type
    });
  }
  return out;
}

export function buildUniversityCompareSourceCandidates(args: {
  instAName: string;
  instAWebsiteUrl?: string | null;
  instBName: string;
  instBWebsiteUrl?: string | null;
}): CompareSourceLink[] {
  const sources: CompareSourceLink[] = [];
  const instAWebsite = normalizeHttpUrl(args.instAWebsiteUrl);
  const instBWebsite = normalizeHttpUrl(args.instBWebsiteUrl);

  if (instAWebsite) {
    sources.push({
      label: `${args.instAName} official website`,
      url: instAWebsite,
      type: 'official'
    });
  }
  if (instBWebsite) {
    sources.push({
      label: `${args.instBName} official website`,
      url: instBWebsite,
      type: 'official'
    });
  }

  sources.push(
    {
      label: 'Federal Student Aid (U.S. Department of Education)',
      url: 'https://studentaid.gov',
      type: 'government'
    },
    {
      label: 'College Scorecard (U.S. Department of Education)',
      url: 'https://collegescorecard.ed.gov/',
      type: 'government'
    },
    {
      label: 'NCES College Navigator',
      url: 'https://nces.ed.gov/collegenavigator/',
      type: 'government'
    },
    {
      label: 'Peterson’s College Search',
      url: 'https://www.petersons.com/college-search.aspx',
      type: 'reference'
    }
  );

  return dedupeSources(sources);
}

export function parseCompareSources(raw: unknown): CompareSourceLink[] {
  if (!Array.isArray(raw)) return [];
  const parsed: Array<CompareSourceLink | null> = raw.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    return {
      label: typeof row.label === 'string' ? row.label : '',
      url: typeof row.url === 'string' ? row.url : '',
      type:
        row.type === 'official' ||
        row.type === 'government' ||
        row.type === 'reference'
          ? row.type
          : undefined
    };
  });
  return dedupeSources(parsed.filter((item): item is CompareSourceLink => item !== null));
}
