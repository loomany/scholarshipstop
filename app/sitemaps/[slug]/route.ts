import { NextResponse } from 'next/server';

import {
  getSitemapDocumentBySlug,
  renderSitemapUrlSetXml,
  SITEMAP_REVALIDATE_SECONDS
} from '@/lib/seo/sitemaps';

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

const XML_UTF8 = 'text/xml; charset=utf-8';

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const slug = params?.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'Sitemap not found' }, { status: 404 });
  }

  const document = await getSitemapDocumentBySlug(slug);
  if (!document) {
    return NextResponse.json({ error: 'Sitemap not found' }, { status: 404 });
  }

  const body = renderSitemapUrlSetXml(document.entries);

  return new NextResponse(body, {
    headers: {
      'Content-Type': XML_UTF8,
      'Cache-Control': `public, max-age=300, s-maxage=${SITEMAP_REVALIDATE_SECONDS}`
    }
  });
}
