import { buildResourcesRssItems } from '@/lib/rss/stage1Feeds';
import { rssHeadResponse, rssResponse } from '@/lib/rss/rssRoute';
import { RSS_REVALIDATE_SECONDS } from '@/lib/rss/rssXml';

export const revalidate = RSS_REVALIDATE_SECONDS;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await buildResourcesRssItems();
  return rssResponse({
    title: 'ScholarshipTop Resources RSS',
    description:
      'ScholarshipTop guides and resources for scholarship search, application planning, deadlines, essays, and international student funding.',
    path: '/rss/resources.xml',
    items
  });
}

export function HEAD() {
  return rssHeadResponse();
}
