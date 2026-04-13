/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true
  },
  /** Old site / CMS paths that still appear in Search Console → canonical home. */
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/home/', destination: '/', permanent: true },
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
