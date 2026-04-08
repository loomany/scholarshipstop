import { NextResponse } from 'next/server';

import {
  buildSitemapDocuments,
  renderSitemapIndexXml,
  SITEMAP_REVALIDATE_SECONDS
} from '@/lib/seo/sitemaps';

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

export async function GET() {
  const documents = await buildSitemapDocuments();
  const body = renderSitemapIndexXml(documents);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=300, s-maxage=${SITEMAP_REVALIDATE_SECONDS}`
    }
  });
}
