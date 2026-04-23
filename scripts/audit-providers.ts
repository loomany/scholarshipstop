/**
 * Data quality audit: parser email list + Supabase providers/scholarships.
 *
 *   dotenv -e .env.local -- npx tsx scripts/audit-providers.ts
 *   dotenv -e .env.local -- npx tsx scripts/audit-providers.ts --csv scripts/output/providers-audit.csv
 *
 * Env:
 *   PROVIDER_OUTREACH_LIST — optional path to newline-separated emails (default: scripts/output/provider-partnerships-emails-clean.txt)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';
import {
  createServiceClient,
  loadProviderOutreachEmailMap,
  type ProviderOutreachLookup
} from './provider-outreach-lookup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_LIST = path.join(
  __dirname,
  'output',
  'provider-partnerships-emails-clean.txt'
);

/** ASCII-ish outreach email: no spaces, no Cyrillic, single @, plausible domain. */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function hasCyrillic(s: string): boolean {
  return /[\u0400-\u04FF]/.test(s);
}

function isValidListEmail(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t || !t.includes('@')) return false;
  if (/\s/.test(t)) return false;
  if (hasCyrillic(t)) return false;
  return EMAIL_REGEX.test(t);
}

/** URL-safe slug: lowercase letters, digits, single hyphens between segments. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ProviderRow = Pick<
  Database['public']['Tables']['providers']['Row'],
  'id' | 'slug' | 'display_name' | 'official_url'
>;

type DbFlags =
  | 'LONG_NAME'
  | 'ALL_CAPS'
  | 'MISSING_URL'
  | 'BAD_URL_SCHEME'
  | 'EMPTY_PROFILE'
  | 'BAD_SLUG'
  | 'DUPLICATE_EMAIL';

type ProviderAudit = {
  id: string;
  slug: string;
  display_name: string;
  official_url: string | null;
  activeScholarshipCount: number;
  flags: Set<DbFlags>;
};

type FileLineResult = {
  raw: string;
  normalized: string;
  valid: boolean;
};

type MatchKind = 'exact' | 'domain' | 'none';

function parseArgs(argv: string[]) {
  const csvIdx = argv.indexOf('--csv');
  const csvPath =
    csvIdx >= 0 && argv[csvIdx + 1] ? argv[csvIdx + 1]!.trim() : null;
  return { csvPath };
}

function loadParserList(listPath: string): FileLineResult[] {
  if (!fs.existsSync(listPath)) {
    console.error('List file not found:', listPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(listPath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const normalized = line.trim().toLowerCase();
      const valid = normalized.length > 0 && isValidListEmail(normalized);
      return { raw: line.trim(), normalized, valid };
    })
    .filter((r) => r.normalized.length > 0);
}

function lookupByDomain(
  listEmail: string,
  map: Map<string, ProviderOutreachLookup>
): ProviderOutreachLookup | null {
  const host = listEmail.split('@')[1];
  if (!host) return null;
  for (const [supportEmail, lookup] of map) {
    if (supportEmail.split('@')[1] === host) return lookup;
  }
  return null;
}

function resolveFileEmailToLookup(
  normalizedEmail: string,
  outreachMap: Map<string, ProviderOutreachLookup>
): { lookup: ProviderOutreachLookup | null; match: MatchKind } {
  if (outreachMap.has(normalizedEmail)) {
    return { lookup: outreachMap.get(normalizedEmail)!, match: 'exact' };
  }
  const byDomain = lookupByDomain(normalizedEmail, outreachMap);
  if (byDomain) {
    return { lookup: byDomain, match: 'domain' };
  }
  return { lookup: null, match: 'none' };
}

async function fetchAllProviders(
  supabase: SupabaseClient<Database>
): Promise<ProviderRow[]> {
  const out: ProviderRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('providers')
      .select('id, slug, display_name, official_url')
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('[audit-providers] providers fetch:', error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    out.push(...(data as ProviderRow[]));
  }
  return out;
}

type ScholarshipLean = {
  provider_slug: string | null;
  support_email: string | null;
  is_active: boolean | null;
};

async function fetchAllScholarshipsLean(
  supabase: SupabaseClient<Database>
): Promise<ScholarshipLean[]> {
  const out: ScholarshipLean[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('provider_slug, support_email, is_active')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('[audit-providers] scholarships fetch:', error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    for (const row of data) {
      out.push({
        provider_slug: row.provider_slug,
        support_email: row.support_email,
        is_active: row.is_active
      });
    }
  }
  return out;
}

function buildSlugStats(rows: ScholarshipLean[]) {
  const slugActiveCount = new Map<string, number>();
  const emailToSlugs = new Map<string, Set<string>>();

  for (const row of rows) {
    const slug = row.provider_slug?.trim();
    if (!slug) continue;

    if (row.is_active === true) {
      slugActiveCount.set(slug, (slugActiveCount.get(slug) ?? 0) + 1);
    }

    const em = row.support_email?.trim().toLowerCase();
    if (!em || !em.includes('@')) continue;
    if (!emailToSlugs.has(em)) emailToSlugs.set(em, new Set());
    emailToSlugs.get(em)!.add(slug);
  }

  const emailsWithMultiSlug = new Set<string>();
  for (const [email, slugs] of emailToSlugs) {
    if (slugs.size > 1) emailsWithMultiSlug.add(email);
  }

  return { slugActiveCount, emailsWithMultiSlug };
}

function collectSlugsTouchedByDuplicateEmails(
  rows: ScholarshipLean[],
  emailsWithMultiSlug: Set<string>
): Set<string> {
  const slugSet = new Set<string>();
  for (const row of rows) {
    const em = row.support_email?.trim().toLowerCase();
    const slug = row.provider_slug?.trim();
    if (!em || !slug) continue;
    if (emailsWithMultiSlug.has(em)) slugSet.add(slug);
  }
  return slugSet;
}

function auditProviderRow(
  p: ProviderRow,
  activeCount: number,
  slugHasDuplicateEmail: boolean
): ProviderAudit {
  const flags = new Set<DbFlags>();
  const name = (p.display_name ?? '').trim();
  const slug = (p.slug ?? '').trim();

  if (name.length > 50) flags.add('LONG_NAME');
  if (
    name.length > 0 &&
    name === name.toUpperCase() &&
    /[A-Za-z]/.test(name)
  ) {
    flags.add('ALL_CAPS');
  }

  const url = p.official_url?.trim() ?? null;
  if (!url || url.length === 0) {
    flags.add('MISSING_URL');
  } else if (!/^https?:\/\//i.test(url)) {
    flags.add('BAD_URL_SCHEME');
  }

  if (activeCount === 0) flags.add('EMPTY_PROFILE');

  const slugNorm = slug.toLowerCase();
  if (!slug || !SLUG_REGEX.test(slugNorm)) flags.add('BAD_SLUG');

  if (slugHasDuplicateEmail) flags.add('DUPLICATE_EMAIL');

  return {
    id: p.id,
    slug,
    display_name: name,
    official_url: p.official_url,
    activeScholarshipCount: activeCount,
    flags
  };
}

function printSummaryBlock(title: string, rows: Record<string, string | number>[]) {
  console.log(`\n── ${title} ──`);
  console.table(rows);
}

function csvCell(s: string): string {
  const t = String(s).replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return `"${t}"`;
}

async function main() {
  const { csvPath } = parseArgs(process.argv);
  const listPath =
    process.env.PROVIDER_OUTREACH_LIST?.trim() || DEFAULT_LIST;

  const supabase = createServiceClient();
  if (!supabase) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.'
    );
    process.exit(1);
  }

  console.log('[audit-providers] Parser list:', listPath);
  const fileLines = loadParserList(listPath);
  const normalizedLines = fileLines.map((f) => f.normalized);
  const uniqueSet = new Set(normalizedLines);
  const invalidEmails = fileLines.filter((f) => !f.valid);
  const freq = new Map<string, number>();
  for (const e of normalizedLines) {
    freq.set(e, (freq.get(e) ?? 0) + 1);
  }
  const duplicateInFile = [...freq.entries()]
    .filter(([, c]) => c > 1)
    .map(([e]) => e);

  console.log('[audit-providers] Loading Supabase…');
  const [providers, scholarshipRows, outreachMap] = await Promise.all([
    fetchAllProviders(supabase),
    fetchAllScholarshipsLean(supabase),
    loadProviderOutreachEmailMap()
  ]);

  if (!outreachMap) {
    console.error(
      '[audit-providers] Could not build outreach map (scholarships query failed).'
    );
    process.exit(1);
  }

  const { slugActiveCount, emailsWithMultiSlug } =
    buildSlugStats(scholarshipRows);
  const slugsFromDuplicateEmails = collectSlugsTouchedByDuplicateEmails(
    scholarshipRows,
    emailsWithMultiSlug
  );

  const audits: ProviderAudit[] = [];
  for (const p of providers) {
    const slug = p.slug?.trim() ?? '';
    const active = slugActiveCount.get(slug) ?? 0;
    const dup = slugsFromDuplicateEmails.has(slug);
    audits.push(auditProviderRow(p, active, dup));
  }

  const emptyProfileSlugs = new Set(
    audits.filter((a) => a.flags.has('EMPTY_PROFILE')).map((a) => a.slug)
  );

  let matchExact = 0;
  let matchDomain = 0;
  let noMatchValid = 0;
  const emptyProfileFileEmails: string[] = [];

  for (const line of fileLines) {
    if (!line.valid) continue;
    const { lookup, match } = resolveFileEmailToLookup(
      line.normalized,
      outreachMap
    );
    if (match === 'none') {
      noMatchValid++;
      continue;
    }
    if (match === 'exact') matchExact++;
    else matchDomain++;

    if (lookup && emptyProfileSlugs.has(lookup.slug)) {
      emptyProfileFileEmails.push(line.normalized);
    }
  }

  const validFileLines = fileLines.filter((f) => f.valid).length;
  const matchedCount = matchExact + matchDomain;
  const matchRatePct =
    validFileLines > 0
      ? ((matchedCount / validFileLines) * 100).toFixed(1)
      : '0.0';

  const criticalSet = new Set(emptyProfileFileEmails);
  const needsAttentionProviders = audits.filter((a) => a.flags.size > 0);

  printSummaryBlock('Summary', [
    {
      metric: 'Addresses in file (non-empty lines)',
      value: fileLines.length
    },
    {
      metric: 'Unique addresses in file',
      value: uniqueSet.size
    },
    {
      metric: 'Invalid email lines (regex / spaces / Cyrillic)',
      value: invalidEmails.length
    },
    {
      metric: 'Emails duplicated inside file (count>1)',
      value: duplicateInFile.length
    },
    { metric: 'Providers in DB', value: providers.length },
    {
      metric: 'Valid file emails matched (exact + domain)',
      value: matchedCount
    },
    { metric: 'Match rate (% of valid file emails)', value: matchRatePct },
    {
      metric: '… exact support_email match',
      value: matchExact
    },
    { metric: '… domain-only match', value: matchDomain },
    {
      metric: 'Valid file emails with no DB outreach match',
      value: noMatchValid
    },
    {
      metric: 'CRITICAL: valid file emails → EMPTY_PROFILE provider',
      value: criticalSet.size
    },
    {
      metric: 'Providers with any DB flag',
      value: needsAttentionProviders.length
    }
  ]);

  if (duplicateInFile.length > 0) {
    console.log(
      '\n── Parser: emails appearing more than once in the file ──'
    );
    console.log(duplicateInFile.sort().join('\n'));
  }

  if (invalidEmails.length > 0) {
    console.log('\n── Parser: invalid email lines (first 50) ──');
    for (const inv of invalidEmails.slice(0, 50)) {
      console.log(' ', inv.raw);
    }
    if (invalidEmails.length > 50) {
      console.log(`  … and ${invalidEmails.length - 50} more`);
    }
  }

  if (criticalSet.size > 0) {
    console.log(
      '\n── CRITICAL — remove or fix before send (file email matched EMPTY_PROFILE slug) ──'
    );
    console.log([...criticalSet].sort().join('\n'));
  }

  if (needsAttentionProviders.length > 0) {
    console.log('\n── DB: providers with flags ──');
    const tableRows = needsAttentionProviders.map((a) => ({
      id: a.id,
      slug: a.slug.length > 48 ? a.slug.slice(0, 45) + '…' : a.slug,
      active: a.activeScholarshipCount,
      flags: [...a.flags].sort().join(', ')
    }));
    console.table(tableRows);
  }

  if (csvPath) {
    const lines: string[] = [];
    lines.push(
      'kind,id,slug,display_name,active_scholarships,official_url,flags,file_email,match_kind'
    );
    for (const a of needsAttentionProviders) {
      lines.push(
        [
          'provider',
          csvCell(a.id),
          csvCell(a.slug),
          csvCell(a.display_name),
          String(a.activeScholarshipCount),
          csvCell(a.official_url ?? ''),
          csvCell([...a.flags].sort().join('|')),
          csvCell(''),
          csvCell('')
        ].join(',')
      );
    }
    for (const em of [...criticalSet].sort()) {
      const { lookup, match } = resolveFileEmailToLookup(em, outreachMap);
      lines.push(
        [
          'critical_file_email',
          csvCell(''),
          csvCell(lookup?.slug ?? ''),
          csvCell(''),
          lookup ? String(slugActiveCount.get(lookup.slug) ?? 0) : csvCell(''),
          csvCell(''),
          csvCell('EMPTY_PROFILE_MATCH'),
          csvCell(em),
          csvCell(match)
        ].join(',')
      );
    }
    for (const inv of invalidEmails) {
      lines.push(
        [
          'invalid_file_line',
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell('INVALID_EMAIL'),
          csvCell(inv.raw),
          csvCell('')
        ].join(',')
      );
    }
    for (const d of duplicateInFile.sort()) {
      lines.push(
        [
          'duplicate_in_file',
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell('DUPLICATE_IN_FILE'),
          csvCell(d),
          csvCell('')
        ].join(',')
      );
    }
    fs.mkdirSync(path.dirname(path.resolve(csvPath)), { recursive: true });
    fs.writeFileSync(path.resolve(csvPath), lines.join('\n'), 'utf8');
    console.log('\n[audit-providers] Wrote CSV:', path.resolve(csvPath));
  }

  console.log('\n[audit-providers] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
