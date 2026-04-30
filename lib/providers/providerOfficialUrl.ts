import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

function normalizeProviderOfficialUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

export { normalizeProviderOfficialUrl };

function isBlockedProviderOfficialHost(hostname: string): boolean {
  const h = hostname.replace(/^www\./i, '').toLowerCase();
  return (
    h === 'scholarshipamerica.org' ||
    h.endsWith('.scholarshipamerica.org') ||
    h === 'scholarsapply.org' ||
    h.endsWith('.scholarsapply.org') ||
    h === 'wistia.com' ||
    h.endsWith('.wistia.com') ||
    h === 'youtube.com' ||
    h.endsWith('.youtube.com') ||
    h === 'vimeo.com' ||
    h.endsWith('.vimeo.com') ||
    h === 'facebook.com' ||
    h.endsWith('.facebook.com') ||
    h === 'instagram.com' ||
    h.endsWith('.instagram.com') ||
    h === 'linkedin.com' ||
    h.endsWith('.linkedin.com') ||
    h === 'twitter.com' ||
    h.endsWith('.twitter.com') ||
    h === 'x.com' ||
    h.endsWith('.x.com') ||
    h === 'docs.google.com' ||
    h === 'forms.gle' ||
    h.endsWith('.formstack.com') ||
    h.endsWith('.jotform.com') ||
    h.endsWith('.typeform.com')
  );
}

function isSafeProviderOfficialUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeProviderOfficialUrl(raw);
  if (!normalized) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (isBlockedProviderOfficialHost(parsed.hostname)) return null;
  if (/\.(pdf|docx?|xlsx?)(?:$|[?#])/i.test(parsed.pathname)) return null;
  if (/(login|signin|apply|application|form|portal|media|video)/i.test(parsed.pathname)) {
    return null;
  }

  return normalized;
}

export async function fetchProviderOfficialUrlsBySlug(
  supabase: SupabaseClient<Database>,
  slugs: string[]
): Promise<Map<string, string>> {
  const uniqueSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)));
  const out = new Map<string, string>();
  if (uniqueSlugs.length === 0) return out;

  const chunkSize = 200;
  for (let i = 0; i < uniqueSlugs.length; i += chunkSize) {
    const chunk = uniqueSlugs.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('scholarships')
      .select('provider_slug, provider_url, is_active')
      .in('provider_slug', chunk)
      .not('provider_slug', 'is', null)
      .not('provider_url', 'is', null)
      .order('is_active', { ascending: false });

    if (error) throw error;

    for (const row of data ?? []) {
      const slug = row.provider_slug?.trim();
      if (!slug || out.has(slug)) continue;
      const url = isSafeProviderOfficialUrl(row.provider_url);
      if (!url) continue;
      out.set(slug, url);
    }
  }

  return out;
}

function addUniqueUrl(target: string[], value: string | null | undefined) {
  const url = normalizeProviderOfficialUrl(value);
  if (!url || target.includes(url)) return;
  target.push(url);
}

export async function fetchProviderSourceUrlsBySlug(
  supabase: SupabaseClient<Database>,
  slugs: string[]
): Promise<Map<string, string[]>> {
  const uniqueSlugs = Array.from(
    new Set(slugs.map((slug) => slug.trim()).filter(Boolean))
  );
  const out = new Map<string, string[]>();
  if (uniqueSlugs.length === 0) return out;

  const chunkSize = 200;
  for (let i = 0; i < uniqueSlugs.length; i += chunkSize) {
    const chunk = uniqueSlugs.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('scholarships')
      .select('provider_slug, provider_url, apply_url, url, is_active')
      .in('provider_slug', chunk)
      .not('provider_slug', 'is', null)
      .order('is_active', { ascending: false });

    if (error) throw error;

    for (const row of data ?? []) {
      const slug = row.provider_slug?.trim();
      if (!slug) continue;
      const urls = out.get(slug) ?? [];
      addUniqueUrl(urls, row.provider_url);
      addUniqueUrl(urls, row.apply_url);
      addUniqueUrl(urls, row.url);
      if (urls.length > 0) out.set(slug, urls.slice(0, 5));
    }
  }

  return out;
}
