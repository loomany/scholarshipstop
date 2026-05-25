import { NextResponse } from 'next/server';

import {
  buildSitemapIndexDocuments,
  renderSitemapIndexXml,
  SITEMAP_REVALIDATE_SECONDS
} from '@/lib/seo/sitemaps';

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

export async function GET() {
  const documents = await buildSitemapIndexDocuments();
  const body = renderSitemapIndexXml(documents);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': `public, max-age=300, s-maxage=${SITEMAP_REVALIDATE_SECONDS}`
    }
  });
}
