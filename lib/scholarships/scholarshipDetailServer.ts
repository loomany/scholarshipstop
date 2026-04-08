import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { fetchScholarshipBySlugOrId } from '@/lib/scholarships/supabase';

export function redactPremiumScholarshipFields(
  scholarship: Scholarship
): Scholarship {
  return {
    ...scholarship,
    premiumFieldsRedacted: true,
    applyLink: undefined,
    providerUrl: undefined,
    supportEmail: null,
    supportPhone: null
  };
}

export async function getScholarshipDetailServer(
  rawParam: string
): Promise<Scholarship | null> {
  try {
    return await fetchScholarshipBySlugOrId(rawParam);
  } catch {
    return null;
  }
}
