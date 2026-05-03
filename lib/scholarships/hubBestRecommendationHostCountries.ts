import { parseHubListingCountryCodesParam } from '@/app/scholarships/scholarshipListUrl';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import { dedupeHostCountryCodesForDisplay } from '@/lib/scholarships/countryEligibility/countries';

function sanitizeIso2List(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return dedupeHostCountryCodesForDisplay(raw);
}

/** Hub POST: route SEO hosts + URL `host_cc` + optional guest transient preferred destinations. */
export function hubBestRecommendationMergeHostPosting(args: {
  tab: ScholarshipListTabId;
  /** Guest hub session — transient quiz hosts may merge when no hub `host_cc` / SEO route hosts are set. */
  hubTreatAsGuest: boolean;
  routeScopeHosts: string[] | null | undefined;
  searchParamsString: string;
  transientPreferredHosts: string[] | null | undefined;
}): {
  hostCountryCodes: string[];
  /** Only guest Best quiz infer — server clears on Best relax retries. Signed-in merges profile separately. */
  bestRecommendationRelaxableQuizHostCountries: boolean;
} {
  const route = sanitizeIso2List(args.routeScopeHosts ?? []);
  const fromUrl = parseHubListingCountryCodesParam(
    new URLSearchParams(args.searchParamsString).get('host_cc')
  );
  const base = sanitizeIso2List([...route, ...fromUrl]);
  if (
    args.tab !== 'best-recommendation' ||
    !args.hubTreatAsGuest ||
    base.length > 0
  ) {
    return {
      hostCountryCodes: base,
      bestRecommendationRelaxableQuizHostCountries: false
    };
  }
  const transient = sanitizeIso2List(args.transientPreferredHosts ?? []);
  if (transient.length === 0) {
    return {
      hostCountryCodes: [],
      bestRecommendationRelaxableQuizHostCountries: false
    };
  }
  return {
    hostCountryCodes: transient,
    bestRecommendationRelaxableQuizHostCountries: true
  };
}
