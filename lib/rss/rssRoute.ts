import { NextResponse } from 'next/server';

import {
  RSS_CONTENT_TYPE,
  RSS_REVALIDATE_SECONDS,
  SITE_ORIGIN,
  renderRssFeed,
  type RssItem
} from './rssXml';

type RssRouteOptions = {
  title: string;
  description: string;
  path: string;
  items: RssItem[];
};

export function rssResponse(options: RssRouteOptions): NextResponse {
  const feedUrl = `${SITE_ORIGIN}${options.path}`;
  const body = renderRssFeed({
    title: options.title,
    description: options.description,
    link: SITE_ORIGIN,
    feedUrl,
    items: options.items
  });

  return new NextResponse(body, {
    headers: {
      'Content-Type': RSS_CONTENT_TYPE,
      'Cache-Control': `public, max-age=300, s-maxage=${RSS_REVALIDATE_SECONDS}`
    }
  });
}

export function rssHeadResponse(): NextResponse {
  return new NextResponse(null, {
    headers: {
      'Content-Type': RSS_CONTENT_TYPE,
      'Cache-Control': `public, max-age=300, s-maxage=${RSS_REVALIDATE_SECONDS}`
    }
  });
}
