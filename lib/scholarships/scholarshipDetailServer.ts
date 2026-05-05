import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { fetchScholarshipBySlugOrId } from '@/lib/scholarships/supabase';

export function redactPremiumScholarshipFields(
  scholarship: Scholarship
): Scholarship {
  return {
    ...scholarship,
    premiumFieldsRedacted: true,
    applyLink: undefined,
    listingUrl: undefined,
    hasOfficialApplicationDestination:
      scholarship.hasOfficialApplicationDestination,
    providerUrl: undefined,
    socialLinks: undefined,
    supportEmailRedacted: Boolean(scholarship.supportEmail?.trim()),
    supportPhoneRedacted: Boolean(scholarship.supportPhone?.trim()),
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
