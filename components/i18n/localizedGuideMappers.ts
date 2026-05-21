import type { StaticCompareGuide } from '@/lib/compare/staticCompareGuides';
import type { StaticEssayGuide } from '@/lib/essays/staticEssayGuides';
import type { StaticScholarshipGuide } from '@/lib/resources/staticScholarshipGuides';
import type { LocalizedPilotPage } from '@/lib/i18n/staticTranslations';

export function localizedEssayGuide(page: LocalizedPilotPage): StaticEssayGuide {
  const slug = page.canonicalPath.split('/').filter(Boolean).pop() ?? 'guide';
  return {
    slug,
    title: page.title,
    description: page.metaDescription,
    h1: page.h1,
    intro: page.intro,
    oneSentence: page.oneSentence ?? page.intro,
    updatedAt: page.updatedAt,
    sections: page.sections.map((section) => ({
      title: section.title,
      body: section.body,
      bullets: section.bullets ?? []
    })),
    checklist: page.checklist ?? [],
    doDont: page.doDont ?? [],
    examples: page.examples ?? [],
    links: page.links,
    faq: page.faq
  };
}

export function localizedResourceGuide(page: LocalizedPilotPage): StaticScholarshipGuide {
  const slug = page.canonicalPath.split('/').filter(Boolean).pop() ?? 'guide';
  return {
    slug,
    title: page.title,
    description: page.metaDescription,
    intro: page.intro,
    sections: page.sections.map((section) => ({
      title: section.title,
      body: section.body,
      bullets: section.bullets ?? []
    })),
    checklist: page.checklist ?? [],
    examples: page.examples ?? [],
    links: page.links,
    faq: page.faq
  };
}

export function localizedCompareGuide(page: LocalizedPilotPage): StaticCompareGuide {
  const slug = page.canonicalPath.split('/').filter(Boolean).pop() ?? 'comparison';
  return {
    slug,
    title: page.title,
    description: page.metaDescription,
    h1: page.h1,
    shortAnswer: page.oneSentence ?? page.intro,
    updatedAt: page.updatedAt,
    columns: [page.table?.columns[1] ?? 'Option A', page.table?.columns[2] ?? 'Option B'],
    rows: page.table?.rows ?? [],
    chooseLeft: page.chooseLeft ?? [],
    chooseRight: page.chooseRight ?? [],
    checklist: page.checklist ?? [],
    links: page.links,
    faq: page.faq
  };
}
