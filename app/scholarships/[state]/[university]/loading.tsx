import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';

export default function UniversityScholarshipsLoading() {
  return (
    <SiteBrandLoading
      label="Loading scholarships…"
      outerClassName="min-h-screen bg-[#F3F7FA]"
      className="min-h-[calc(100dvh-4rem)]"
    />
  );
}
