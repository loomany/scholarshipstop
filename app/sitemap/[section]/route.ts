import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';

import { buildSitemapBuckets, sitemapBaseUrl } from '@/lib/seo/sitemaps';

/** Align with `app/sitemap.ts` so drip-feed limits refresh roughly hourly at the CDN. */
export const revalidate = 3600;

type SitemapSection = 'core' | 'resources' | 'categories' | 'seo' | 'scholarships';

const VALID_SECTIONS: SitemapSection[] = [
  'core',
  'resources',
  'categories',
  'seo',
  'scholarships'
];

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET(
  _request: Request,
  { params }: { params: { section: string } }
) {
  const section = params.section as SitemapSection;
  if (!VALID_SECTIONS.includes(section)) {
    notFound();
  }

  const base = sitemapBaseUrl();
  const buckets = await buildSitemapBuckets();
  const entries = buckets[section];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const lastModified =
        entry.lastModified instanceof Date
          ? entry.lastModified.toISOString()
          : entry.lastModified
            ? new Date(entry.lastModified).toISOString()
            : new Date().toISOString();
      const url = entry.url.startsWith('http') ? entry.url : `${base}${entry.url}`;
      return `<url><loc>${escapeXml(url)}</loc><lastmod>${lastModified}</lastmod></url>`;
    }),
    '</urlset>'
  ].join('');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}

