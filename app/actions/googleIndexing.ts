'use server';

import {
  enqueueGoogleIndexingUrls,
  flushGoogleIndexingQueue,
  providerIndexingUrl,
  resourceIndexingUrl,
  scholarshipIndexingUrl
} from '@/lib/seo/googleIndexingQueue';

export async function enqueueScholarshipIndexing(input: {
  id: string;
  slug?: string | null;
  source?: string;
}) {
  return enqueueGoogleIndexingUrls({
    kind: 'scholarship',
    urls: [scholarshipIndexingUrl(input)],
    source: input.source ?? 'server-action:scholarship'
  });
}

export async function enqueueResourceIndexing(input: {
  slug: string;
  source?: string;
}) {
  return enqueueGoogleIndexingUrls({
    kind: 'resource',
    urls: [resourceIndexingUrl(input.slug)],
    source: input.source ?? 'server-action:resource'
  });
}

export async function enqueueProviderIndexing(input: {
  providerRouteId: string;
  source?: string;
}) {
  return enqueueGoogleIndexingUrls({
    kind: 'provider',
    urls: [providerIndexingUrl(input.providerRouteId)],
    source: input.source ?? 'server-action:provider'
  });
}

export async function flushQueuedGoogleIndexing(limit = 50) {
  return flushGoogleIndexingQueue(limit);
}
