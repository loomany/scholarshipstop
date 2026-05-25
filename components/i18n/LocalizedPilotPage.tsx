import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileCheck2, Search, ShieldCheck } from 'lucide-react';

import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import StaticScholarshipGuidePage from '@/components/content-hub/StaticScholarshipGuidePage';
import { StaticCompareGuidePage } from '@/components/compare/StaticCompareGuidePage';
import { StaticEssayGuidePage } from '@/components/essays/StaticEssayGuidePage';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';
import {
  localizedCompareGuide,
  localizedEssayGuide,
  localizedResourceGuide
} from '@/components/i18n/localizedGuideMappers';
import { LocalizedMarketingPage } from '@/components/i18n/LocalizedMarketingPage';
import { LocalizedResourceShellPage } from '@/components/i18n/LocalizedResourceShellPage';
import TrustPageTemplate from '@/components/trust/TrustPageTemplate';
import type { LocalizedPilotPage } from '@/lib/i18n/staticTranslations';
import type { TrustPageContent } from '@/lib/trust/trustPageContent';
import {
  hrefForLocalizedUiRequired,
  localizedScholarshipHubTabHref
} from '@/lib/i18n/localizedHref';
import { normalizeCanonicalPath } from '@/lib/i18n/paths';
import type { ScholarshipHubPathTabInput } from '@/app/scholarships/scholarshipHubPath';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

const copy = {
  es: {
    home: 'Inicio',
    language: 'Idioma',
    startHere: 'Empezar aquí',
    explore: 'Explorar',
    searchPlaceholder: 'Busca por elegibilidad, fecha, proveedor o tema',
    featured: 'Destacado',
    verified: 'Fuente y contexto',
    latest: 'Actualizado',
    methodology: 'Metodología de verificación',
    disclaimer: 'Aviso sobre ayuda financiera',
    corrections: 'Reportar corrección',
    continue: 'Continuar en ScholarshipTop',
    faq: 'Preguntas frecuentes',
    essay: {
      home: 'Inicio',
      essays: 'Ensayos',
      eyebrow: 'Guía de ensayos de ScholarshipTop',
      inOneSentence: 'En una frase',
      openEssayMentor: 'Abrir Essay Mentor',
      findScholarships: 'Buscar becas',
      practicalChecklist: 'Checklist práctico',
      examples: 'Ejemplos',
      doDont: 'Haz / Evita',
      do: 'Haz',
      dont: 'Evita',
      relatedPages: 'Páginas relacionadas de ScholarshipTop',
      faq: 'Preguntas frecuentes',
      disclaimer:
        'ScholarshipTop ofrece orientación para escribir y planificar, pero no garantiza elegibilidad, selección ni pago de una beca. Confirma siempre las reglas finales en la página oficial del proveedor.'
    },
    compare: {
      home: 'Inicio',
      compare: 'Comparar',
      backToCompare: 'Volver a comparar',
      eyebrow: 'Comparación de ScholarshipTop',
      shortAnswer: 'Respuesta breve',
      quickComparison: 'Comparación rápida',
      factor: 'Factor',
      choosePrefix: 'Elige',
      chooseWhenSuffix: 'cuando',
      decisionChecklist: 'Checklist de decisión',
      continueSearch: 'Continúa tu búsqueda de becas',
      findScholarships: 'Buscar becas',
      faq: 'Preguntas frecuentes',
      disclaimer:
        'Los detalles, requisitos y términos de los proveedores pueden cambiar. Confirma siempre los requisitos finales en la página oficial del proveedor o institución antes de aplicar.'
    },
    trust: {
      backHome: 'Volver al inicio',
      methodology: 'Metodología de verificación',
      studentFirstRule: 'Regla centrada en estudiantes',
      studentFirstHeadline:
        'Confirma cada requisito final en la página oficial del proveedor antes de aplicar.',
      studentFirstBody:
        'ScholarshipTop ayuda a buscar y planificar. Los proveedores oficiales controlan elegibilidad final, fechas, selección y pago.',
      relatedTrustPages: 'Páginas de confianza relacionadas',
      quickReminder: 'Recordatorio rápido',
      quickReminderBody:
        'Las recomendaciones no garantizan elegibilidad, selección ni pago.',
      disclaimer: 'Leer aviso'
    },
    resource: {
      home: 'Inicio',
      resources: 'Recursos',
      eyebrow: 'Guía de ScholarshipTop',
      findScholarships: 'Buscar becas',
      verificationMethodology: 'Metodología de verificación',
      practicalChecklist: 'Checklist práctico',
      examples: 'Ejemplos',
      relatedPages: 'Páginas relacionadas de ScholarshipTop',
      faq: 'Preguntas frecuentes',
      disclaimer:
        'ScholarshipTop no concede becas directamente. Confirma siempre requisitos, fechas y pasos en la página oficial del proveedor.'
    },
    resourceShell: {
      home: 'Inicio',
      resources: 'Recursos',
      language: 'Idioma',
      backToHome: 'Volver al inicio',
      continueReading: 'Seguir leyendo',
      relatedGuides: 'Guías relacionadas',
      ctaTitle: 'Encuentra becas que encajen contigo',
      ctaDescription: 'Explora becas según tu perfil y solicita más rápido.',
      ctaButton: 'Buscar becas'
    },
    legal: {
      backToHome: 'Volver al inicio'
    },
    marketing: {
      primaryCta: 'Encontrar becas',
      secondaryCta: 'Explorar becas',
      faqHeading: 'Preguntas frecuentes'
    }
  },
  fr: {
    home: 'Accueil',
    language: 'Langue',
    startHere: 'Commencer ici',
    explore: 'Explorer',
    searchPlaceholder: 'Cherchez par admissibilité, date, fournisseur ou sujet',
    featured: 'À la une',
    verified: 'Source et contexte',
    latest: 'Mis à jour',
    methodology: 'Méthode de vérification',
    disclaimer: 'Avertissement sur l’aide financière',
    corrections: 'Signaler une correction',
    continue: 'Continuer sur ScholarshipTop',
    faq: 'Questions fréquentes',
    essay: {
      home: 'Accueil',
      essays: 'Rédaction',
      eyebrow: 'Guide de rédaction ScholarshipTop',
      inOneSentence: 'En une phrase',
      openEssayMentor: 'Ouvrir Essay Mentor',
      findScholarships: 'Trouver des bourses',
      practicalChecklist: 'Checklist pratique',
      examples: 'Exemples',
      doDont: 'À faire / À éviter',
      do: 'À faire',
      dont: 'À éviter',
      relatedPages: 'Pages ScholarshipTop liées',
      faq: 'Questions fréquentes',
      disclaimer:
        'ScholarshipTop fournit une aide à la rédaction et à la planification, mais ne garantit ni admissibilité, ni sélection, ni paiement. Vérifiez toujours les règles finales sur la page officielle du fournisseur.'
    },
    compare: {
      home: 'Accueil',
      compare: 'Comparer',
      backToCompare: 'Retour à Comparer',
      eyebrow: 'Comparaison ScholarshipTop',
      shortAnswer: 'Réponse courte',
      quickComparison: 'Comparaison rapide',
      factor: 'Facteur',
      choosePrefix: 'Choisissez',
      chooseWhenSuffix: 'si',
      decisionChecklist: 'Checklist de décision',
      continueSearch: 'Continuez votre recherche de bourses',
      findScholarships: 'Trouver des bourses',
      faq: 'Questions fréquentes',
      disclaimer:
        'Les détails, critères et termes des fournisseurs peuvent changer. Vérifiez toujours les exigences finales sur la page officielle du fournisseur ou de l’établissement avant de postuler.'
    },
    trust: {
      backHome: 'Retour à l’accueil',
      methodology: 'Méthode de vérification',
      studentFirstRule: 'Règle centrée sur l’étudiant',
      studentFirstHeadline:
        'Vérifiez chaque exigence finale sur la page officielle du fournisseur avant de postuler.',
      studentFirstBody:
        'ScholarshipTop aide les étudiants à chercher et planifier. Les fournisseurs officiels contrôlent l’admissibilité finale, les dates, la sélection et le paiement.',
      relatedTrustPages: 'Pages de confiance liées',
      quickReminder: 'Rappel rapide',
      quickReminderBody:
        'Les recommandations ne garantissent ni admissibilité, ni sélection, ni paiement.',
      disclaimer: 'Lire l’avertissement'
    },
    resource: {
      home: 'Accueil',
      resources: 'Ressources',
      eyebrow: 'Guide ScholarshipTop',
      findScholarships: 'Trouver des bourses',
      verificationMethodology: 'Méthode de vérification',
      practicalChecklist: 'Checklist pratique',
      examples: 'Exemples',
      relatedPages: 'Pages ScholarshipTop liées',
      faq: 'Questions fréquentes',
      disclaimer:
        'ScholarshipTop n’attribue pas de bourses directement. Vérifiez toujours les exigences, dates et étapes sur la page officielle du fournisseur.'
    },
    resourceShell: {
      home: 'Accueil',
      resources: 'Ressources',
      language: 'Langue',
      backToHome: 'Retour à l’accueil',
      continueReading: 'Pour aller plus loin',
      relatedGuides: 'Guides connexes',
      ctaTitle: 'Trouvez des bourses adaptées',
      ctaDescription: 'Parcourez des bourses selon votre profil et postulez plus vite.',
      ctaButton: 'Trouver des bourses'
    },
    legal: {
      backToHome: 'Retour à l’accueil'
    },
    marketing: {
      primaryCta: 'Trouver des bourses',
      secondaryCta: 'Explorer les bourses',
      faqHeading: 'Questions fréquentes'
    }
  }
} as const;

function hrefForPage(page: LocalizedPilotPage, href: string): string {
  const normalized = normalizeCanonicalPath(href);
  if (normalized.startsWith('/scholarships/hub/')) {
    const segment = normalized.slice('/scholarships/hub/'.length);
    return localizedScholarshipHubTabHref(page.locale, segment as ScholarshipHubPathTabInput);
  }
  return hrefForLocalizedUiRequired(page.locale, href);
}

function urlForPage(page: LocalizedPilotPage, path: string): string {
  return getLocalizedCanonical(path, page.locale);
}

function absoluteUrlForVisibleHref(page: LocalizedPilotPage, href: string): string {
  return new URL(hrefForPage(page, href), 'https://scholarshiptop.com').toString();
}

function parentHref(page: LocalizedPilotPage): string {
  if (page.kind === 'essay') return hrefForPage(page, '/essays');
  if (page.kind === 'compare') return hrefForPage(page, '/compare');
  return hrefForPage(page, '/');
}

function parentLabel(page: LocalizedPilotPage): string {
  if (page.kind === 'essay') return copy[page.locale].essay.essays;
  if (page.kind === 'compare') return copy[page.locale].compare.compare;
  return copy[page.locale].home;
}

function buildBreadcrumbSchema(page: LocalizedPilotPage) {
  const pageUrl = getLocalizedCanonical(page.canonicalPath, page.locale);
  const items: Array<Record<string, unknown>> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: copy[page.locale].home,
      item: getLocalizedCanonical('/', page.locale)
    }
  ];
  if (page.canonicalPath !== '/') {
    const parentPath =
      page.kind === 'essay' ? '/essays' : page.kind === 'compare' ? '/compare' : '/';
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: parentLabel(page),
      item: getLocalizedCanonical(parentPath, page.locale)
    });
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: page.h1,
      item: pageUrl
    });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  };
}

function buildPageSchema(page: LocalizedPilotPage) {
  const pageUrl = getLocalizedCanonical(page.canonicalPath, page.locale);
  const type =
    page.kind === 'essay' || page.kind === 'compare' ? 'Article' : 'WebPage';
  return {
    '@context': 'https://schema.org',
    '@type': type,
    inLanguage: page.locale,
    mainEntityOfPage: pageUrl,
    headline: page.h1,
    name: page.h1,
    description: page.metaDescription,
    url: pageUrl,
    datePublished: page.updatedAt,
    dateModified: page.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: 'https://scholarshiptop.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: 'https://scholarshiptop.com'
    }
  };
}

function buildFaqSchema(page: LocalizedPilotPage) {
  if (page.faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: page.locale,
    mainEntity: page.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}

function buildCollectionSchema(page: LocalizedPilotPage) {
  if (page.kind !== 'hub' && page.kind !== 'home') return null;
  const cards = page.cards ?? [];
  if (cards.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    inLanguage: page.locale,
    name: page.h1,
    description: page.metaDescription,
    url: getLocalizedCanonical(page.canonicalPath, page.locale),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: cards.length,
      itemListElement: cards.map((card, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: card.title,
        ...(card.href ? { url: absoluteUrlForVisibleHref(page, card.href) } : {})
      }))
    }
  };
}

function JsonLdForPilotPage({ page }: { page: LocalizedPilotPage }) {
  const faqSchema = buildFaqSchema(page);
  const collectionSchema = buildCollectionSchema(page);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbSchema(page))
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPageSchema(page))
        }}
      />
      {collectionSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      ) : null}
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
    </>
  );
}

function localizedTrustContent(page: LocalizedPilotPage): TrustPageContent {
  return {
    title: page.title,
    description: page.metaDescription,
    eyebrow: page.eyebrow,
    h1: page.h1,
    intro: page.intro,
    cards: page.cards?.map((card) => ({
      title: card.title,
      body: card.body
    })),
    sections: page.sections,
    faq: page.faq,
    links: page.links.map((link) => ({
      href: link.href,
      label: link.label,
      body:
        page.locale === 'es'
          ? 'Abrir esta página relacionada de transparencia y confianza.'
          : 'Ouvrir cette page connexe sur la confiance et la transparence.'
    })),
    cta:
      page.links.find((link) => link.href === '/scholarships') ??
      page.links[0] ??
      undefined
  };
}

function SectionCards({ page }: { page: LocalizedPilotPage }) {
  const cards = page.cards ?? [];
  if (cards.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const href = card.href ? hrefForPage(page, card.href) : null;
        const body = (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-950">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{card.body}</p>
            {href ? (
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                {copy[page.locale].explore}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
          </>
        );
        return href ? (
          <Link
            key={card.title}
            href={href}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            {body}
          </Link>
        ) : (
          <article
            key={card.title}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            {body}
          </article>
        );
      })}
    </div>
  );
}

function HeroSearchMock({ page }: { page: LocalizedPilotPage }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
        <Search className="h-4 w-4 text-orange-500" aria-hidden />
        <span>{copy[page.locale].searchPlaceholder}</span>
      </div>
      <div className="mt-4 grid gap-3">
        {(page.cards ?? []).slice(0, 3).map((card, index) => (
          <div
            key={card.title}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">
                  {index === 0 ? copy[page.locale].featured : copy[page.locale].verified}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-950">
                  {card.title}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                {copy[page.locale].latest}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
              {card.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocalizedHome({ page }: { page: LocalizedPilotPage }) {
  const c = copy[page.locale];
  return (
    <main className="bg-white text-zinc-900 antialiased">
      <JsonLdForPilotPage page={page} />
      <section className="border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50 px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.98fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
                {page.eyebrow}
              </span>
              <LanguageSwitcher pathname={page.localizedPath} label={c.language} />
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {page.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600 sm:text-xl">
              {page.intro}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={hrefForPage(page, '/scholarships')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
              >
                {page.links[0]?.label ?? c.explore}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={hrefForPage(page, '/scholarship-verification-methodology')}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                {c.methodology}
              </Link>
            </div>
          </div>
          <HeroSearchMock page={page} />
        </div>
      </section>

      <section className="border-b border-zinc-100 bg-zinc-50 px-4 py-8 sm:px-6 lg:py-10">
        <div className="mx-auto w-full max-w-7xl">
          <SectionCards page={page} />
        </div>
      </section>

      <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6 lg:py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {c.verified}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              {page.sections[0]?.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              {page.sections[0]?.body}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(page.sections[0]?.bullets ?? []).map((bullet) => (
              <div key={bullet} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <FileCheck2 className="h-5 w-5 text-orange-500" aria-hidden />
                <p className="mt-3 text-sm font-semibold leading-6 text-zinc-800">
                  {bullet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LocalizedSections page={page} startIndex={1} />
    </main>
  );
}

function LocalizedSections({
  page,
  startIndex = 0
}: {
  page: LocalizedPilotPage;
  startIndex?: number;
}) {
  return (
    <section className="bg-zinc-50 px-4 py-10 sm:px-6 lg:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        {page.sections.slice(startIndex).map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7"
          >
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
              {section.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-zinc-600">
              {section.body}
            </p>
            {section.bullets?.length ? (
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-zinc-700 sm:grid-cols-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function LocalizedHub({ page }: { page: LocalizedPilotPage }) {
  const c = copy[page.locale];
  const isScholarships = page.canonicalPath === '/scholarships';
  const isEssays = page.canonicalPath === '/essays';
  const isProviders = page.canonicalPath === '/providers';
  const isCompare = page.canonicalPath === '/compare';
  return (
    <main className="bg-white text-zinc-900 antialiased">
      <JsonLdForPilotPage page={page} />
      <section className="border-b border-zinc-100 bg-zinc-50 px-4 pb-8 pt-6 sm:px-6 lg:pb-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
              <Link href={hrefForPage(page, '/')} className="font-medium text-zinc-600 hover:text-zinc-950">
                {c.home}
              </Link>
            </nav>
            <LanguageSwitcher pathname={page.localizedPath} label={c.language} />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                {page.eyebrow}
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
                {page.h1}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
                {page.intro}
              </p>
            </div>
            <HeroSearchMock page={page} />
          </div>
        </div>
      </section>

      {isScholarships ? <CatalogStyleBand page={page} /> : null}
      {isEssays ? <EssayCommandCenterBand page={page} /> : null}
      {isProviders ? <ProviderDirectoryBand page={page} /> : null}
      {isCompare ? <CompareEvergreenBand page={page} /> : null}
      {!isScholarships && !isEssays && !isProviders && !isCompare ? (
        <section className="px-4 py-10 sm:px-6 lg:py-12">
          <div className="mx-auto w-full max-w-7xl">
            <SectionCards page={page} />
          </div>
        </section>
      ) : null}
      <LocalizedSections page={page} />
      <FooterCta page={page} />
    </main>
  );
}

function CatalogStyleBand({ page }: { page: LocalizedPilotPage }) {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-500">
              <Search className="h-4 w-4 text-orange-500" aria-hidden />
              <span>{copy[page.locale].searchPlaceholder}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(page.sections[0]?.bullets ?? []).slice(0, 4).map((tip) => (
                <span
                  key={tip}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                >
                  {tip}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <SectionCards page={page} />
          </div>
        </div>
      </div>
    </section>
  );
}

function EssayCommandCenterBand({ page }: { page: LocalizedPilotPage }) {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
          {copy[page.locale].startHere}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SectionCards page={page} />
        </div>
      </div>
    </section>
  );
}

function ProviderDirectoryBand({ page }: { page: LocalizedPilotPage }) {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-3">
        {(page.cards ?? []).map((card) => (
          <article key={card.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-orange-500" aria-hidden />
            <h2 className="mt-3 text-lg font-bold tracking-tight text-zinc-950">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{card.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {copy[page.locale].verified}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                {copy[page.locale].latest}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompareEvergreenBand({ page }: { page: LocalizedPilotPage }) {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <SectionCards page={page} />
      </div>
    </section>
  );
}

function FooterCta({ page }: { page: LocalizedPilotPage }) {
  if (page.links.length === 0) return null;
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:py-12">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-orange-200 bg-orange-50/70 p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-orange-950">
          {copy[page.locale].continue}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {page.links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={hrefForPage(page, link.href)}
              className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-orange-900">{page.disclaimer}</p>
      </div>
    </section>
  );
}

export function LocalizedPilotPageView({
  page,
  emergencyFallback = false
}: {
  page: LocalizedPilotPage;
  emergencyFallback?: boolean;
}) {
  if (page.kind === 'essay') {
    return (
      <StaticEssayGuidePage
        guide={localizedEssayGuide(page)}
        locale={page.locale}
        copy={copy[page.locale].essay}
        hrefForPath={(href) => hrefForPage(page, href)}
        urlForPath={(path) => urlForPage(page, path)}
      />
    );
  }

  if (page.kind === 'compare') {
    return (
      <StaticCompareGuidePage
        guide={localizedCompareGuide(page)}
        locale={page.locale}
        copy={copy[page.locale].compare}
        hrefForPath={(href) => hrefForPage(page, href)}
        urlForPath={(path) => urlForPage(page, path)}
      />
    );
  }

  if (page.kind === 'trust') {
    return (
      <>
        <JsonLdForPilotPage page={page} />
        <TrustPageTemplate
          page={localizedTrustContent(page)}
          copy={copy[page.locale].trust}
          hrefForPath={(href) => hrefForPage(page, href)}
        />
      </>
    );
  }

  if (page.kind === 'resource') {
    return (
      <>
        <JsonLdForPilotPage page={page} />
        <StaticScholarshipGuidePage
          guide={localizedResourceGuide(page)}
          locale={page.locale}
          copy={copy[page.locale].resource}
          hrefForPath={(href) => hrefForPage(page, href)}
          urlForPath={(path) => urlForPage(page, path)}
        />
      </>
    );
  }

  if (page.kind === 'resourceShell') {
    return (
      <>
        <JsonLdForPilotPage page={page} />
        <LocalizedResourceShellPage
          page={page}
          labels={copy[page.locale].resourceShell}
        />
      </>
    );
  }

  if (page.kind === 'legal') {
    return (
      <>
        <JsonLdForPilotPage page={page} />
        <LegalDocumentPage
          page={page}
          backToHomeLabel={copy[page.locale].legal.backToHome}
          hrefForPath={(path) => hrefForPage(page, path)}
        />
      </>
    );
  }

  if (page.kind === 'marketing') {
    return (
      <>
        <JsonLdForPilotPage page={page} />
        <LocalizedMarketingPage page={page} labels={copy[page.locale].marketing} />
      </>
    );
  }

  if (emergencyFallback) {
    if (page.kind === 'home') {
      return <LocalizedHome page={page} />;
    }
    return <LocalizedHub page={page} />;
  }

  return null;
}
