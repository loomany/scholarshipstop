const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_HOST = 'scholarshiptop.com';
const INDEXNOW_KEY = '7f761cd602fc4e7595b2efdfb6a8cbca';
const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;

export type IndexNowSubmitResult = {
  ok: boolean;
  submitted: number;
  status: number | null;
  accepted: boolean;
  urls: string[];
};

function normalizeIndexNowUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || parsed.hostname !== INDEXNOW_HOST) {
      return null;
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeIndexNowUrls(urls: string[]): string[] {
  const normalized = urls
    .map((url) => normalizeIndexNowUrl(url))
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(normalized));
}

export async function submitToIndexNow(
  urls: string[]
): Promise<IndexNowSubmitResult> {
  const urlList = normalizeIndexNowUrls(urls);

  if (urlList.length === 0) {
    console.warn('[indexnow] no valid scholarshiptop.com URLs to submit');
    return {
      ok: true,
      submitted: 0,
      status: null,
      accepted: false,
      urls: []
    };
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList
    })
  });

  if (response.status === 200) {
    console.log('[indexnow] 200 OK', { submitted: urlList.length });
  } else if (response.status === 202) {
    console.log('[indexnow] 202 accepted', { submitted: urlList.length });
  } else if (response.status >= 400) {
    const body = await response.text().catch(() => '');
    console.error('[indexnow] error response', {
      status: response.status,
      submitted: urlList.length,
      body: body.slice(0, 500)
    });
  } else {
    console.log('[indexnow] response', {
      status: response.status,
      submitted: urlList.length
    });
  }

  return {
    ok: response.ok,
    submitted: urlList.length,
    status: response.status,
    accepted: response.status === 200 || response.status === 202,
    urls: urlList
  };
}

export function scholarshiptopIndexNowUrl(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return normalizeIndexNowUrl(trimmed);
  const pathname = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalizeIndexNowUrl(`${INDEXNOW_ORIGIN}${pathname}`);
}
