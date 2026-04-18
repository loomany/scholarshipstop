import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';

/**
 * Route-level loading for `/scholarships` and nested scholarship URLs while RSC streams.
 */
export default function ScholarshipsCatchAllLoading() {
  return (
    <SiteBrandLoading
      label="Loading scholarships…"
      className="min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-5rem)]"
    />
  );
}
