import { buildMasterRssItems } from '@/lib/rss/stage1Feeds';
import { rssHeadResponse, rssResponse } from '@/lib/rss/rssRoute';
import { RSS_REVALIDATE_SECONDS } from '@/lib/rss/rssXml';

export const revalidate = RSS_REVALIDATE_SECONDS;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await buildMasterRssItems();
  return rssResponse({
    title: 'ScholarshipTop RSS',
    description:
      'Curated ScholarshipTop resources, essay guides, comparison guides, and scholarship category pages for students planning applications.',
    path: '/rss.xml',
    items
  });
}

export function HEAD() {
  return rssHeadResponse();
}
