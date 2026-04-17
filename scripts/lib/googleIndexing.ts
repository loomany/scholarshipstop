import { getURL } from '@/utils/helpers';
import { enqueueGoogleIndexingUrls } from '@/lib/seo/googleIndexingQueue';

type ScriptGoogleIndexingKind = 'scholarship' | 'resource' | 'provider';

function scholarshipUrl(input: { id: string; slug?: string | null }): string {
  const slug = input.slug?.trim();
  return getURL(`/scholarships/${encodeURIComponent(slug || input.id)}`);
}

function resourceUrl(slug: string): string {
  return getURL(`/resources/${encodeURIComponent(slug.trim())}`);
}

function providerUrl(routeId: string): string {
  return getURL(`/providers/${encodeURIComponent(routeId.trim())}`);
}

export async function enqueueScholarshipUrlsForScript(
  rows: Array<{ id: string; slug?: string | null }>,
  source: string
): Promise<{ enqueued: number; total: number }> {
  const urls = rows
    .filter((row) => row.id?.trim())
    .map((row) => scholarshipUrl(row));
  if (urls.length === 0) {
    return { enqueued: 0, total: 0 };
  }
  const r = await enqueueGoogleIndexingUrls({
    urls,
    kind: 'scholarship',
    source
  });
  return { enqueued: r.enqueued, total: r.total };
}

export async function enqueueResourceUrlsForScript(
  slugs: string[],
  source: string
): Promise<{ enqueued: number; total: number }> {
  const urls = slugs
    .filter((slug) => slug.trim())
    .map((slug) => resourceUrl(slug));
  if (urls.length === 0) {
    return { enqueued: 0, total: 0 };
  }
  const r = await enqueueGoogleIndexingUrls({
    urls,
    kind: 'resource',
    source
  });
  return { enqueued: r.enqueued, total: r.total };
}

export async function enqueueProviderUrlsForScript(
  routeIds: string[],
  source: string
): Promise<{ enqueued: number; total: number }> {
  const urls = routeIds
    .filter((routeId) => routeId.trim())
    .map((routeId) => providerUrl(routeId));
  if (urls.length === 0) {
    return { enqueued: 0, total: 0 };
  }
  const r = await enqueueGoogleIndexingUrls({
    urls,
    kind: 'provider',
    source
  });
  return { enqueued: r.enqueued, total: r.total };
}
