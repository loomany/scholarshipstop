import { buildEssaysRssItems } from '@/lib/rss/stage1Feeds';
import { rssHeadResponse, rssResponse } from '@/lib/rss/rssRoute';
import { RSS_REVALIDATE_SECONDS } from '@/lib/rss/rssXml';

export const revalidate = RSS_REVALIDATE_SECONDS;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await buildEssaysRssItems();
  return rssResponse({
    title: 'ScholarshipTop Essay Guides RSS',
    description:
      'ScholarshipTop scholarship essay guides, examples, checklists, and prompt-specific writing support for stronger applications.',
    path: '/rss/essays.xml',
    items
  });
}

export function HEAD() {
  return rssHeadResponse();
}
