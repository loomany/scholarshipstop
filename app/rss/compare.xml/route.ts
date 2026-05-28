import { buildCompareRssItems } from '@/lib/rss/stage1Feeds';
import { rssHeadResponse, rssResponse } from '@/lib/rss/rssRoute';
import { RSS_REVALIDATE_SECONDS } from '@/lib/rss/rssXml';

export const revalidate = RSS_REVALIDATE_SECONDS;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = buildCompareRssItems();
  return rssResponse({
    title: 'ScholarshipTop Comparison Guides RSS',
    description:
      'ScholarshipTop comparison guides for scholarships, grants, award types, and application planning decisions.',
    path: '/rss/compare.xml',
    items
  });
}

export function HEAD() {
  return rssHeadResponse();
}
