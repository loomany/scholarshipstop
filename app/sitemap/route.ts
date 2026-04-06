import { NextResponse } from 'next/server';

import { sitemapBaseUrl } from '@/lib/seo/sitemaps';

type SitemapSection = 'core' | 'resources' | 'categories' | 'seo' | 'scholarships';

const SECTIONS: SitemapSection[] = [
  'core',
  'resources',
  'categories',
  'seo',
  'scholarships'
];

export async function GET() {
  const base = sitemapBaseUrl();
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...SECTIONS.map(
      (section) =>
        `<sitemap><loc>${base}/sitemap/${section}</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>`
    ),
    '</sitemapindex>'
  ].join('');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}

