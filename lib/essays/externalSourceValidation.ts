/** High-authority external URLs for programmatic essay guides (.edu, Wikipedia). */

export function isHighAuthorityHttpsUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString.trim());
    if (u.protocol !== 'https:') return false;
    return isHighAuthorityHost(u.hostname);
  } catch {
    return false;
  }
}

export function isHighAuthorityHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'wikipedia.org' || h.endsWith('.wikipedia.org')) return true;
  if (h.endsWith('.edu')) return true;
  return false;
}

export type EssaySourceItem = { title: string; url: string };

export async function filterReachableHighAuthoritySources(
  items: EssaySourceItem[],
  opts?: { max?: number }
): Promise<EssaySourceItem[]> {
  const max = opts?.max ?? 6;
  const out: EssaySourceItem[] = [];
  for (const it of items) {
    const title = it.title?.trim();
    const url = it.url?.trim();
    if (!title || !url || !isHighAuthorityHttpsUrl(url)) continue;
    const ok = await headOk(url);
    if (ok) {
      out.push({ title, url });
      if (out.length >= max) break;
    }
  }
  return out;
}

async function headOk(url: string): Promise<boolean> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ac.signal,
      headers: { 'User-Agent': 'ScholarshipTopBot/1.0' }
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ac.signal,
        headers: { 'User-Agent': 'ScholarshipTopBot/1.0' },
        cache: 'no-store'
      });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }
}
