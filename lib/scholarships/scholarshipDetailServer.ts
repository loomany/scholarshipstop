import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { fetchScholarshipBySlugOrId } from '@/lib/scholarships/supabase';

export async function getScholarshipDetailServer(
  rawParam: string
): Promise<Scholarship | null> {
  try {
    return await fetchScholarshipBySlugOrId(rawParam);
  } catch {
    return null;
  }
}
