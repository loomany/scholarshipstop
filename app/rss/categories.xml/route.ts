import { buildCategoriesRssItems } from '@/lib/rss/stage1Feeds';
import { rssHeadResponse, rssResponse } from '@/lib/rss/rssRoute';
import { RSS_REVALIDATE_SECONDS } from '@/lib/rss/rssXml';

export const revalidate = RSS_REVALIDATE_SECONDS;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = buildCategoriesRssItems();
  return rssResponse({
    title: 'ScholarshipTop Scholarship Categories RSS',
    description:
      'ScholarshipTop category pages for STEM, education, medical, arts, law, community, and other scholarship fields.',
    path: '/rss/categories.xml',
    items
  });
}

export function HEAD() {
  return rssHeadResponse();
}
