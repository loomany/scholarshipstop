import ResourceGuideShell from '@/components/content-hub/resourceGuides/ResourceGuideShell';
import { RESOURCES_SECTION_PATH } from '@/lib/content-hub/resourcesSection';
import type { LocalizedPilotPage, LocalizedProseBlock } from '@/lib/i18n/staticTranslations';
import { resourceGuideCardHref } from '@/lib/content-hub/resourceGuidePages';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';

type LocalizedResourceShellPageProps = {
  page: LocalizedPilotPage;
  labels: {
    home: string;
    resources: string;
    backToHome: string;
    continueReading: string;
    relatedGuides: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaButton: string;
  };
};

function ProseBlocks({ blocks }: { blocks: LocalizedProseBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === 'p') {
          return <p key={index}>{block.text}</p>;
        }
        if (block.type === 'h2') {
          return <h2 key={index}>{block.text}</h2>;
        }
        return (
          <ul key={index}>
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

export function LocalizedResourceShellPage({
  page,
  labels
}: LocalizedResourceShellPageProps) {
  const hrefForPath = (path: string) =>
    hrefForLocalizedUiRequired(page.locale, path);

  return (
    <>
      <ResourceGuideShell
        title={page.h1}
        subtitle={page.subtitle ?? page.intro}
        faq={page.faq}
        endReading={(page.endReading ?? [])
          .map((link) => {
            const href = hrefForPath(link.href);
            return href ? { href, title: link.title, blurb: link.blurb } : null;
          })
          .filter((link): link is { href: string; title: string; blurb: string } =>
            link != null
          )}
        homeHref={hrefForPath('/')}
        resourcesHref={hrefForPath(RESOURCES_SECTION_PATH)}
        backToHomeLabel={labels.backToHome}
        resourcesNavLabel={labels.resources}
        continueReadingLabel={labels.continueReading}
        relatedGuidesLabel={labels.relatedGuides}
        ctaTitle={labels.ctaTitle}
        ctaDescription={labels.ctaDescription}
        ctaButtonText={labels.ctaButton}
        cardHrefForSlug={(slug) => hrefForPath(resourceGuideCardHref(slug))}
      >
        <ProseBlocks blocks={page.proseBlocks ?? []} />
      </ResourceGuideShell>
    </>
  );
}
