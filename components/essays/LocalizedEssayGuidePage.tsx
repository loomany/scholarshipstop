import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { EssayGuideCardImage } from '@/components/essays/EssayGuideCardImage';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { ESSAYS_PAGE_TITLE, ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';
import type { EssayDetailRow } from '@/lib/essays/essaysServer';
import { getEnglishFallbackNotice } from '@/lib/i18n/englishFallbackNotice';
import type { LocalizedEssayPageCopy } from '@/lib/i18n/essayPilot/essayDetailTranslationGate';
import type { LocalizedEssayResolveMode } from '@/lib/i18n/essayPilot/resolveLocalizedEssayGuide';
import { getResourceDetailUiCopy } from '@/lib/i18n/resourceDetailUiCopy';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

type Props = {
  locale: Stage2PilotLocale;
  slug: string;
  essay: EssayDetailRow;
  copy: LocalizedEssayPageCopy;
  mode?: LocalizedEssayResolveMode;
};

export default function LocalizedEssayGuidePage({
  locale,
  slug: _slug,
  essay,
  copy,
  mode = 'translated'
}: Props) {
  const isEnglishFallback = mode === 'englishFallback';
  const ui = getResourceDetailUiCopy(locale);
  const essaysHubHref = hrefForLocalizedUiRequired(locale, ESSAYS_SECTION_PATH);
  const title = copy.headline || copy.metaTitle;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <nav className="mb-6 text-sm text-gray-600" aria-label={ui.breadcrumbAria}>
        <Link href={hrefForLocalizedUiRequired(locale, '/')} className="hover:text-indigo-700">
          {ui.homeLabel}
        </Link>
        <span className="mx-2">/</span>
        <Link href={essaysHubHref} className="hover:text-indigo-700">
          {ESSAYS_PAGE_TITLE}
        </Link>
      </nav>

      {isEnglishFallback ? (
        <p
          className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950"
          role="status"
        >
          {getEnglishFallbackNotice(locale)}
        </p>
      ) : null}

      {essay.hero_image_url ? (
        <EssayGuideCardImage
          src={essay.hero_image_url}
          alt={title}
          aspectClassName="aspect-[2/1]"
          className="mb-8 w-full rounded-xl"
        />
      ) : null}

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>

      {copy.intro ? (
        <p className="mt-4 text-lg leading-relaxed text-gray-700">{copy.intro}</p>
      ) : null}

      <div
        className="prose prose-indigo mt-8 max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: copy.bodyHtml }}
      />

      {copy.faq.length > 0 ? (
        <div className="mt-10">
          <SiteFaqAccordion items={copy.faq} />
        </div>
      ) : null}

      <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        {copy.disclaimer}
      </p>

      <div className="mt-10">
        <Link
          href={essaysHubHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          {locale === 'es' ? 'Ver más guías de ensayos' : 'Voir plus de guides d’essais'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
