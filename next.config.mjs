/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true
  },
  /**
   * Child sitemap URLs use `/sitemaps/{name}.xml` (see `lib/seo/sitemaps.ts`).
   * A dynamic folder named `[slug].xml` is unreliable in some deployments; we serve
   * `/sitemaps/[slug]` and rewrite `*.xml` here so public URLs stay stable.
   */
  async rewrites() {
    return [
      { source: '/sitemaps/:slug.xml', destination: '/sitemaps/:slug' }
    ];
  },
  /**
   * Old site / CMS paths that still appear in Search Console.
   * Legacy WP `/pay-for-college/*` has no App Router pages — was returning 404.
   */
  /**
   * Yandex (and similar) HTML-file verification requires an exact body match.
   * Cloudflare Web Analytics skips auto-injecting beacon.min.js when no-transform is set.
   * @see https://developers.cloudflare.com/web-analytics/get-started/
   */
  async headers() {
    return [
      {
        source: '/yandex_a42f95878903e0dc.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, no-transform, max-age=0'
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/home/', destination: '/', permanent: true },

      {
        source: '/pay-for-college/bigfuture-scholarships',
        destination: '/scholarships/hub/matches',
        permanent: true
      },
      {
        source: '/pay-for-college/bigfuture-scholarships/',
        destination: '/scholarships/hub/matches',
        permanent: true
      },
      {
        source: '/pay-for-college/college-costs',
        destination: '/compare',
        permanent: true
      },
      {
        source: '/pay-for-college/college-costs/',
        destination: '/compare',
        permanent: true
      },
      {
        source: '/pay-for-college',
        destination: '/resources',
        permanent: true
      },
      {
        source: '/pay-for-college/',
        destination: '/resources',
        permanent: true
      },
      {
        source: '/pay-for-college/:path*',
        destination: '/resources',
        permanent: true
      },
      {
        source:
          '/study-in-canada-vanier-canadian-scholarships-for-international-students-2019',
        destination: '/scholarships/vanier-canada-graduate-scholarships',
        permanent: true
      },
      {
        source:
          '/study-in-canada-vanier-canadian-scholarships-for-international-students-2019/',
        destination: '/scholarships/vanier-canada-graduate-scholarships',
        permanent: true
      },
      {
        source:
          '/central-bank-of-nigeria-collaborative-programme-for-postgraduates-cbn-cpp-2019',
        destination:
          '/scholarships/central-bank-of-nigeria-collaborative-programme-for-postgraduates-cbn-cpp',
        permanent: true
      },
      {
        source:
          '/central-bank-of-nigeria-collaborative-programme-for-postgraduates-cbn-cpp-2019/',
        destination:
          '/scholarships/central-bank-of-nigeria-collaborative-programme-for-postgraduates-cbn-cpp',
        permanent: true
      },
      {
        source:
          '/sports-scholarships-for-international-students-at-newcastle-university-in-uk-2019',
        destination:
          '/scholarships/sports-scholarships-for-international-students-at-newcastle-university-in-uk',
        permanent: true
      },
      {
        source:
          '/sports-scholarships-for-international-students-at-newcastle-university-in-uk-2019/',
        destination:
          '/scholarships/sports-scholarships-for-international-students-at-newcastle-university-in-uk',
        permanent: true
      }
    ];
  }
};

export default nextConfig;
