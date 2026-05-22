import { getTranslationSourceHash } from '@/lib/i18n/contentTranslationsServer';
import type { ProviderPilotSlug } from '@/lib/i18n/providerPilot/providerPilotSlugs';

export function buildProviderSourceHash(
  providerId: string,
  slug: ProviderPilotSlug
): string {
  return getTranslationSourceHash({
    pilot: 'stage5d-provider-manual',
    providerId,
    slug
  });
}
