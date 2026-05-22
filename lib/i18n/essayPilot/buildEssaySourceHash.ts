import { getTranslationSourceHash } from '@/lib/i18n/contentTranslationsServer';
import type { EssayPilotSlug } from '@/lib/i18n/essayPilot/essayPilotSlugs';

export function buildEssaySourceHash(essayId: string, slug: EssayPilotSlug): string {
  return getTranslationSourceHash({
    pilot: 'stage5f-essay-manual',
    essayId,
    slug
  });
}
