'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  BadgeDollarSign,
  BookOpen,
  Building2,
  ChevronDown,
  GitCompareArrows,
  Handshake,
  Info,
  LayoutGrid,
  Menu,
  Search,
  Sparkles,
  X
} from 'lucide-react';

import Logo from '@/components/icons/Logo';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import IqLanguageSwitcher from '@/components/iq/IqLanguageSwitcher';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';
import { getIqLocalizedHref } from '@/lib/iq/i18n/iqLocalizedHref';
import {
  getIqLocaleFromPathname,
  isIqProductBrowserPathname
} from '@/lib/iq/i18n/iqPaths';
import MobileDrawerNavIcon from '@/components/ui/Navbar/MobileDrawerNavIcon';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import {
  RESOURCES_SECTION_LABEL,
  RESOURCES_SECTION_PATH
} from '@/lib/content-hub/resourcesSection';
import { ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';
import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';
import type { NavbarInitialAuth } from '@/lib/nav/getNavbarInitialAuth';
import { stripLocalePrefix } from '@/lib/i18n/paths';
import {
  getStage2LanguageSwitcherItems,
  hrefForLocalizedUiRequired,
  localizedPilotHref,
  localizedSubscriptionHref
} from '@/lib/i18n/localizedHref';
import { resolveNavLocaleFromPathname } from '@/lib/i18n/resolveNavLocale';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import type { SupportedLocale } from '@/lib/i18n/types';
import NavbarUserSlot from './NavbarUserSlot';
import s from './Navbar.module.css';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';

type NavlinksProps = {
  initialNavbarAuth?: NavbarInitialAuth;
  initialLocale?: SupportedLocale;
  isIqSubdomainHost?: boolean;
  iqLocale?: IqLocale;
};

const IQ_TEST_HOME_HREF = 'https://iq.scholarshiptop.com/';

const ABOUT_SUBLINKS = [
  { href: '/help', label: 'Help' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/faq', label: 'FAQ' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/for-organizations', label: 'For Organizations' },
  { href: IQ_TEST_HOME_HREF, label: 'IQ Test' }
] as const;

function isExternalAboutHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

/** Hidden from About nav UI; entries remain in {@link ABOUT_SUBLINKS}. */
const ABOUT_NAV_UI_HIDDEN = new Set<string>(
  isIqSitePromoVisible() ? [] : [IQ_TEST_HOME_HREF]
);

const MOBILE_ABOUT_EXCLUDED = new Set<string>([
  '/for-organizations',
  ...ABOUT_NAV_UI_HIDDEN
]);

/** Hidden from mobile drawer menu; desktop header language switcher unchanged. */
const SHOW_MOBILE_DRAWER_LANGUAGE_SWITCHER = false;

function filterAboutSublinks(
  items: ReadonlyArray<{ href: string; label: string }>,
  hidden: Set<string>
) {
  return items.filter(({ href }) => !hidden.has(href));
}

const ESSAY_MENTOR_PATH = '/essay';
const VERSUS_HUB_PATH = '/compare';

const VERSUS_SUBLINKS = [
  {
    href: '/compare/universities',
    label: 'Universities',
    description: 'School-vs-school scholarship and essay comparisons.'
  },
  {
    href: '/compare/states',
    label: 'States',
    description: 'State scholarship climate battles across the U.S.'
  }
] as const;

const LOCALIZED_NAV_COPY: Record<
  'en' | Stage2PilotLocale,
  {
    about: string;
    findScholarships: string;
    providers: string;
    compare: string;
    resources: string;
    essayGuides: string;
    pricing: string;
    iqTest: string;
    forOrganizations: string;
    openMenu: string;
    closeMenu: string;
    language: string;
    mainNavigation: string;
    siteMenu: string;
    aboutMenu: string;
    compareMenu: string;
    essayMenu: string;
    collapseAbout: string;
    expandAbout: string;
    collapseCompare: string;
    expandCompare: string;
    collapseEssays: string;
    expandEssays: string;
    essayGuidesLinks: string;
    guidesAndMentor: string;
  }
> = {
  en: {
    about: 'About',
    findScholarships: 'Find Scholarships',
    providers: 'Providers',
    compare: 'Compare',
    resources: RESOURCES_SECTION_LABEL,
    essayGuides: 'Essay Guides',
    pricing: 'Pricing',
    iqTest: 'IQ Test',
    forOrganizations: 'For Organizations',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    language: 'Language',
    mainNavigation: 'Main navigation',
    siteMenu: 'Site menu',
    aboutMenu: 'About menu',
    compareMenu: 'Compare menu',
    essayMenu: 'Essay Guides menu',
    collapseAbout: 'Collapse About submenu',
    expandAbout: 'Expand About submenu',
    collapseCompare: 'Collapse Compare submenu',
    expandCompare: 'Expand Compare submenu',
    collapseEssays: 'Collapse Essay Guides submenu',
    expandEssays: 'Expand Essay Guides submenu',
    essayGuidesLinks: 'Essay Guides links',
    guidesAndMentor: 'Guides and AI mentor'
  },
  es: {
    about: 'Acerca de',
    findScholarships: 'Buscar becas',
    providers: 'Proveedores',
    compare: 'Comparar',
    resources: 'Recursos',
    essayGuides: 'Ensayos',
    pricing: 'Precios',
    iqTest: 'Prueba IQ',
    forOrganizations: 'Organizaciones',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    language: 'Idioma',
    mainNavigation: 'Navegación principal',
    siteMenu: 'Menú del sitio',
    aboutMenu: 'Menú de confianza',
    compareMenu: 'Menú de comparaciones',
    essayMenu: 'Menú de ensayos',
    collapseAbout: 'Contraer menú Acerca de',
    expandAbout: 'Expandir menú Acerca de',
    collapseCompare: 'Contraer menú Comparar',
    expandCompare: 'Expandir menú Comparar',
    collapseEssays: 'Contraer menú Ensayos',
    expandEssays: 'Expandir menú Ensayos',
    essayGuidesLinks: 'Enlaces de ensayos',
    guidesAndMentor: 'Guías y mentor IA'
  },
  fr: {
    about: 'À propos',
    findScholarships: 'Chercher des bourses',
    providers: 'Fournisseurs',
    compare: 'Comparer',
    resources: 'Ressources',
    essayGuides: "Guides d'essai",
    pricing: 'Tarifs',
    iqTest: 'Test IQ',
    forOrganizations: 'Organisations',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    language: 'Langue',
    mainNavigation: 'Navigation principale',
    siteMenu: 'Menu du site',
    aboutMenu: 'Menu confiance',
    compareMenu: 'Menu comparaisons',
    essayMenu: 'Menu rédaction',
    collapseAbout: 'Réduire le menu À propos',
    expandAbout: 'Développer le menu À propos',
    collapseCompare: 'Réduire le menu Comparer',
    expandCompare: 'Développer le menu Comparer',
    collapseEssays: 'Réduire le menu Rédaction',
    expandEssays: 'Développer le menu Rédaction',
    essayGuidesLinks: 'Liens guides d’essai',
    guidesAndMentor: 'Guides et mentor IA'
  }
};

/** Same canonical targets as {@link ABOUT_SUBLINKS} — labels only differ by locale. */
const LOCALIZED_ABOUT_SUBLINKS: Record<
  Stage2PilotLocale,
  Array<{ href: string; label: string }>
> = {
  es: [
    { href: '/help', label: 'Ayuda' },
    { href: '/privacy-policy', label: 'Política de privacidad' },
    { href: '/terms', label: 'Términos' },
    { href: '/faq', label: 'FAQ' },
    { href: '/refund-policy', label: 'Política de reembolso' },
    { href: '/for-organizations', label: 'Para organizaciones' },
    { href: IQ_TEST_HOME_HREF, label: 'Prueba IQ' }
  ],
  fr: [
    { href: '/help', label: 'Aide' },
    { href: '/privacy-policy', label: 'Politique de confidentialité' },
    { href: '/terms', label: 'Conditions' },
    { href: '/faq', label: 'FAQ' },
    { href: '/refund-policy', label: 'Politique de remboursement' },
    { href: '/for-organizations', label: 'Pour les organisations' },
    { href: IQ_TEST_HOME_HREF, label: 'Test IQ' }
  ]
};

const LOCALIZED_COMPARE_SUBLINKS: Record<
  Stage2PilotLocale,
  Array<{ href: string; label: string; description: string }>
> = {
  es: [
    {
      href: '/compare/universities',
      label: 'Universidades',
      description:
        'Comparaciones becas y ensayos entre universidades publicadas.'
    },
    {
      href: '/compare/states',
      label: 'Estados',
      description: 'Comparaciones del mercado de becas por estado en EE. UU.'
    }
  ],
  fr: [
    {
      href: '/compare/universities',
      label: 'Universités',
      description:
        'Comparaisons de bourses et d’essais entre universités publiées.'
    },
    {
      href: '/compare/states',
      label: 'États',
      description: 'Comparaisons du marché des bourses par État aux États-Unis.'
    }
  ]
};

type EssayGuideSublink = {
  href: string;
  title: string;
  description: string;
  kicker: string;
  featured?: boolean;
};

const LOCALIZED_ESSAYS_GUIDE_SUBLINKS: Record<
  Stage2PilotLocale,
  EssayGuideSublink[]
> = {
  es: [
    {
      href: ESSAYS_SECTION_PATH,
      title: 'Biblioteca de guías',
      description: 'Ejemplos, checklist y guías por prompt para becas.',
      kicker: 'Guías'
    },
    {
      href: ESSAY_MENTOR_PATH,
      title: 'Essay Mentor',
      description: 'Herramienta guiada para estructurar tus ideas antes de escribir.',
      kicker: 'Studio',
      featured: true
    }
  ],
  fr: [
    {
      href: ESSAYS_SECTION_PATH,
      title: 'Bibliothèque de guides',
      description: 'Exemples, checklist et guides par consigne pour les bourses.',
      kicker: 'Guides'
    },
    {
      href: ESSAY_MENTOR_PATH,
      title: 'Essay Mentor',
      description: 'Outil guidé pour structurer vos idées avant d’écrire.',
      kicker: 'Studio',
      featured: true
    }
  ]
};

/** Подменю Essay Guides: хаб статей и инструмент ментора (не путать с `/essays`). */
const ESSAYS_GUIDE_SUBLINKS: {
  href: string;
  title: string;
  description: string;
  kicker: string;
  featured?: boolean;
}[] = [
  {
    href: ESSAYS_SECTION_PATH,
    title: 'Article library',
    description: 'Prompts, outlines, and revision playbooks—built for scholarships.',
    kicker: 'Guides'
  },
  {
    href: ESSAY_MENTOR_PATH,
    title: 'AI Essay Mentor',
    description:
      'A premium guided interview—your answers become a structured draft, auto-saved.',
    kicker: 'Studio',
    featured: true
  }
];

function sublinkActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navlinks({
  initialNavbarAuth = null,
  initialLocale = 'en',
  isIqSubdomainHost = false,
  iqLocale
}: NavlinksProps) {
  const pathname = usePathname() ?? '';
  const locale = resolveNavLocaleFromPathname(pathname);
  const navCopy = LOCALIZED_NAV_COPY[locale];
  const languageSwitcherItems = useMemo(
    () =>
      getStage2LanguageSwitcherItems({
        pathname: pathname || pilotNavHref('/'),
        currentLocale: locale
      }),
    [pathname, locale]
  );
  const showLanguageSwitcher = languageSwitcherItems.length > 0;
  const canonicalPathname = stripLocalePrefix(pathname);
  const pilotNavHref = useCallback(
    (href: string) =>
      locale === 'en'
        ? href
        : (localizedPilotHref(locale, href) ??
          hrefForLocalizedUiRequired(locale, href)),
    [locale]
  );
  const subscriptionHref = localizedSubscriptionHref(locale);
  /**
   * “Find Scholarships”: on EN go straight to the canonical hub URL so the user
   * does not see `/scholarships` for a moment before client-side normalization.
   * ES/FR keep their localized hub root (translations live at `/es/scholarships`,
   * `/fr/scholarships`; the hub query still defaults to Best recommendation).
   */
  const findScholarshipsHref =
    locale === 'en'
      ? SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF
      : pilotNavHref('/scholarships');
  const aboutSublinks =
    locale === 'en' ? ABOUT_SUBLINKS : LOCALIZED_ABOUT_SUBLINKS[locale];
  const visibleAboutSublinks = filterAboutSublinks(
    aboutSublinks,
    ABOUT_NAV_UI_HIDDEN
  );
  const mobileAboutSublinks = filterAboutSublinks(
    aboutSublinks,
    MOBILE_ABOUT_EXCLUDED
  );
  const resolveAboutSublinkHref = useCallback(
    (href: string) =>
      isExternalAboutHref(href) ? href : pilotNavHref(href),
    [pilotNavHref]
  );
  const versusSublinks =
    locale === 'en' ? VERSUS_SUBLINKS : LOCALIZED_COMPARE_SUBLINKS[locale];
  const essayGuideSublinks = (
    locale === 'en'
      ? ESSAYS_GUIDE_SUBLINKS
      : LOCALIZED_ESSAYS_GUIDE_SUBLINKS[locale]
  ).filter(
    (item) => locale === 'en' || localizedPilotHref(locale, item.href) != null
  );
  const headerNavLink = useCallback(
    (active?: boolean) =>
      clsx(
        nav.dark,
        locale === 'fr' && nav.darkLocaleCompact,
        active && nav.darkActive
      ),
    [locale]
  );
  const isIqSubdomain =
    isIqSubdomainHost ||
    (typeof window !== 'undefined' &&
      window.location.hostname.toLowerCase() === 'iq.scholarshiptop.com');
  const isIqProductPage = isIqProductBrowserPathname(pathname ?? '/', {
    onIqSubdomain: isIqSubdomain
  });
  const activeIqLocale =
    iqLocale ?? getIqLocaleFromPathname(pathname ?? '/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [essaysExpanded, setEssaysExpanded] = useState(false);
  const [versusExpanded, setVersusExpanded] = useState(false);
  /** After choosing a desktop Essay Guides item, hide the flyout until pointer leaves the trigger. */
  const [suppressEssayGuidesFlyout, setSuppressEssayGuidesFlyout] =
    useState(false);
  const menuId = useId();

  const aboutSectionActive = useMemo(() => {
    if (canonicalPathname === '/about' || canonicalPathname.startsWith('/about/')) return true;
    return aboutSublinks.some((l) => sublinkActive(l.href, canonicalPathname));
  }, [canonicalPathname, aboutSublinks]);

  const resourcesSectionActive = useMemo(
    () =>
      canonicalPathname === RESOURCES_SECTION_PATH ||
      canonicalPathname.startsWith(`${RESOURCES_SECTION_PATH}/`),
    [canonicalPathname]
  );

  const essaysSectionActive = useMemo(
    () =>
      canonicalPathname === ESSAYS_SECTION_PATH ||
      canonicalPathname.startsWith(`${ESSAYS_SECTION_PATH}/`),
    [canonicalPathname]
  );

  const essayMentorActive = useMemo(() => {
    if (canonicalPathname === ESSAY_MENTOR_PATH) return true;
    if (!canonicalPathname.startsWith(`${ESSAY_MENTOR_PATH}/`)) return false;
    return !canonicalPathname.startsWith(`${ESSAYS_SECTION_PATH}`);
  }, [canonicalPathname]);

  const essayGuidesNavActive = useMemo(
    () => essaysSectionActive || essayMentorActive,
    [essaysSectionActive, essayMentorActive]
  );

  const scholarshipsActive = useMemo(
    () =>
      canonicalPathname === '/scholarships' ||
      canonicalPathname.startsWith('/scholarships/'),
    [canonicalPathname]
  );

  const providersActive = useMemo(
    () =>
      canonicalPathname === '/providers' ||
      canonicalPathname.startsWith('/providers/'),
    [canonicalPathname]
  );

  const pricingActive = useMemo(
    () =>
      canonicalPathname === '/subscription' ||
      canonicalPathname.startsWith('/subscription/'),
    [canonicalPathname]
  );

  const forOrganizationsActive = useMemo(
    () =>
      canonicalPathname === '/for-organizations' ||
      canonicalPathname.startsWith('/for-organizations/'),
    [canonicalPathname]
  );

  const versusActive = useMemo(
    () =>
      canonicalPathname === VERSUS_HUB_PATH ||
      canonicalPathname.startsWith(`${VERSUS_HUB_PATH}/`),
    [canonicalPathname]
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const iqHomeHref = isIqSubdomain
    ? getIqLocalizedHref('/', activeIqLocale, { onIqSubdomain: true })
    : '/iq';

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    setSuppressEssayGuidesFlyout(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKey);

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      setAboutExpanded(aboutSectionActive);
      setEssaysExpanded(essayGuidesNavActive);
      setVersusExpanded(versusActive);
    }
  }, [menuOpen, aboutSectionActive, essayGuidesNavActive, versusActive]);

  if (isIqProductPage) {
    return (
      <div className="relative flex min-h-16 items-center justify-between gap-3 py-2.5 md:min-h-20 md:py-3">
        <Link
          href={iqHomeHref}
          onClick={(event) => {
            if (window.location.pathname !== iqHomeHref) return;
            event.preventDefault();
            window.location.assign(iqHomeHref);
          }}
          className={`${s.logo} relative z-[1] shrink-0`}
          aria-label="ScholarshipTop IQ — Home"
        >
          <Logo variant="header" />
        </Link>

        <IqLanguageSwitcher onIqSubdomain={isIqSubdomain} />
      </div>
    );
  }

  return (
    <>
      <div className="relative flex flex-row items-center justify-between gap-3 py-3 md:py-4">
        <div className="relative z-0 flex min-w-0 min-h-[2.5rem] flex-1 items-center gap-2 sm:gap-3 md:min-h-[2.75rem]">
          <button
            type="button"
            className="relative z-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:hidden md:h-11 md:w-11"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? navCopy.closeMenu : navCopy.openMenu}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <X className="h-6 w-6" strokeWidth={2} aria-hidden />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
            )}
          </button>
          <Link
            href={pilotNavHref('/')}
            className={`${s.logo} relative z-[1] shrink-0`}
            aria-label="ScholarshipTop — Home"
          >
            <Logo variant="header" />
          </Link>
          <nav
            className={clsx(
              s.inlineNav,
              locale === 'fr' && s.inlineNavLocaleCompact
            )}
            aria-label={navCopy.mainNavigation}
          >
            <div className="group/about relative">
              <Link
                href={pilotNavHref('/about')}
                className={headerNavLink(aboutSectionActive)}
                aria-haspopup="menu"
              >
                {navCopy.about}
              </Link>
              <div
                className="pointer-events-none invisible absolute left-0 top-full z-[110] pt-2 opacity-0 transition-[opacity,visibility] duration-150 ease-out group-hover/about:pointer-events-auto group-hover/about:visible group-hover/about:opacity-100 group-focus-within/about:pointer-events-auto group-focus-within/about:visible group-focus-within/about:opacity-100"
                role="presentation"
              >
                <div
                  className="min-w-[240px] max-w-[280px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                  aria-label={navCopy.aboutMenu}
                >
                  {visibleAboutSublinks.map(({ href, label }) => {
                    const active = sublinkActive(href, canonicalPathname);
                    return (
                      <Link
                        key={href}
                        href={resolveAboutSublinkHref(href)}
                        className={clsx(
                          nav.lightPanel,
                          active && nav.lightPanelActive
                        )}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <Link
              href={findScholarshipsHref}
              className={headerNavLink(scholarshipsActive)}
            >
              {navCopy.findScholarships}
            </Link>
            <Link
              href={pilotNavHref('/providers')}
              className={headerNavLink(providersActive)}
            >
              {navCopy.providers}
            </Link>
            <div className="group/versus relative">
              <Link
                href={pilotNavHref(VERSUS_HUB_PATH)}
                className={headerNavLink(versusActive)}
                aria-haspopup="menu"
              >
                {navCopy.compare}
              </Link>
              <div
                className="pointer-events-none invisible absolute left-0 top-full z-[110] pt-2 opacity-0 transition-[opacity,visibility] duration-150 ease-out group-hover/versus:pointer-events-auto group-hover/versus:visible group-hover/versus:opacity-100 group-focus-within/versus:pointer-events-auto group-focus-within/versus:visible group-focus-within/versus:opacity-100"
                role="presentation"
              >
                <div
                  className="min-w-[280px] max-w-[320px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                  aria-label={navCopy.compareMenu}
                >
                  {versusSublinks.map((item) => {
                    const active = sublinkActive(item.href, canonicalPathname);
                    return (
                      <Link
                        key={item.href}
                        href={pilotNavHref(item.href)}
                        className={clsx(
                          'flex flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-zinc-50',
                          active && 'bg-zinc-50'
                        )}
                      >
                        <span className="text-sm font-semibold text-zinc-900">
                          {item.label}
                        </span>
                        <span className="text-xs leading-snug text-zinc-500">
                          {item.description}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <Link
              href={pilotNavHref(RESOURCES_SECTION_PATH)}
              className={headerNavLink(resourcesSectionActive)}
            >
              {navCopy.resources}
            </Link>
            <div
              className="group/essays relative"
              onMouseLeave={() => setSuppressEssayGuidesFlyout(false)}
            >
              <Link
                href={pilotNavHref(ESSAYS_SECTION_PATH)}
                className={headerNavLink(essayGuidesNavActive)}
                aria-haspopup="menu"
              >
                {navCopy.essayGuides}
              </Link>
              <div
                className={clsx(
                  'pointer-events-none invisible absolute left-0 top-full z-[110] pt-2 opacity-0 transition-[opacity,visibility] duration-150 ease-out',
                  !suppressEssayGuidesFlyout &&
                    'group-hover/essays:pointer-events-auto group-hover/essays:visible group-hover/essays:opacity-100 group-focus-within/essays:pointer-events-auto group-focus-within/essays:visible group-focus-within/essays:opacity-100',
                  suppressEssayGuidesFlyout &&
                    '!pointer-events-none !invisible !opacity-0'
                )}
                role="presentation"
              >
                <div
                  className="min-w-[min(100vw-2rem,18rem)] max-w-[22rem] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                  aria-label={navCopy.essayMenu}
                >
                  {essayGuideSublinks.map((item) => {
                    const active =
                      item.href === ESSAYS_SECTION_PATH
                        ? essaysSectionActive
                        : essayMentorActive;
                    return (
                      <Link
                        key={item.href}
                        href={pilotNavHref(item.href)}
                        onClick={() => setSuppressEssayGuidesFlyout(true)}
                        className={clsx(
                          'relative flex flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors',
                          item.featured
                            ? 'border-b-2 border-orange-400 bg-white hover:bg-zinc-50'
                            : 'hover:bg-zinc-50',
                          active &&
                            (item.featured
                              ? 'border-orange-500 bg-zinc-50'
                              : 'bg-zinc-50')
                        )}
                      >
                        <span className="flex items-start gap-2.5">
                          {item.featured ? (
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                              <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </span>
                          ) : (
                            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                              {item.kicker}
                            </span>
                            <span
                              className={clsx(
                                'mt-0.5 block text-[15px] font-semibold leading-snug text-zinc-900',
                                active && 'text-orange-700'
                              )}
                            >
                              {item.title}
                            </span>
                          </span>
                        </span>
                        <p className="text-[12px] leading-snug text-zinc-500 sm:text-[13px]">
                          {item.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <Link
              href={subscriptionHref}
              className={headerNavLink(pricingActive)}
            >
              {navCopy.pricing}
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          <NavbarUserSlot
            pathname={pathname}
            variant="header"
            initialNavbarAuth={initialNavbarAuth}
            initialLocale={locale}
          />
          {showLanguageSwitcher ? (
            <LanguageSwitcher
              variant="dropdown"
              pathname={pathname || pilotNavHref('/')}
              currentLocale={locale}
            />
          ) : null}
        </div>
      </div>

      {menuOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[98] bg-black/65 backdrop-blur-[2px] lg:hidden"
                aria-label={navCopy.closeMenu}
                onClick={closeMenu}
              />
              <div
                id={menuId}
                role="dialog"
                aria-modal="true"
                aria-label={navCopy.siteMenu}
                className="fixed left-0 top-0 z-[101] flex h-[100dvh] min-h-[100dvh] w-[min(100%,18rem)] max-w-full flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950 shadow-2xl lg:hidden sm:w-[19rem]"
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:px-4">
                  <Link
                    href={pilotNavHref('/')}
                    onClick={closeMenu}
                    className={`${s.logo} min-w-0`}
                    aria-label="ScholarshipTop — Home"
                  >
                    <Logo variant="header" />
                  </Link>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 md:h-11 md:w-11"
                    aria-label={navCopy.closeMenu}
                    onClick={closeMenu}
                  >
                    <X className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </button>
                </div>
            <nav
              className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
              aria-label={navCopy.mainNavigation}
            >
              <div className="w-full max-w-full">
                <div
                  className="flex w-full min-w-0 items-stretch overflow-hidden rounded-lg"
                  onMouseEnter={() => {
                    if (
                      typeof window !== 'undefined' &&
                      window.matchMedia('(hover: hover)').matches
                    ) {
                      setAboutExpanded(true);
                    }
                  }}
                >
                  <Link
                    href={pilotNavHref('/about')}
                    className={clsx(
                      nav.darkDrawer,
                      'flex min-w-0 flex-1 items-center gap-3 rounded-none rounded-l-lg py-3 pl-3 pr-2',
                      aboutSectionActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    <MobileDrawerNavIcon
                      icon={Info}
                      active={aboutSectionActive}
                    />
                    <span className="min-w-0">{navCopy.about}</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-11 shrink-0 items-center justify-center rounded-none rounded-r-lg border-0 bg-transparent text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-expanded={aboutExpanded}
                    aria-controls={`${menuId}-about-sub`}
                    id={`${menuId}-about-chevron`}
                    aria-label={
                      aboutExpanded ? navCopy.collapseAbout : navCopy.expandAbout
                    }
                    onClick={() => setAboutExpanded((o) => !o)}
                  >
                    <ChevronDown
                      className={clsx(
                        'h-5 w-5 shrink-0 transition-transform duration-200 ease-out',
                        aboutExpanded && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
                <div
                  id={`${menuId}-about-sub`}
                  role="region"
                  aria-label="About section links"
                  className={clsx(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    aboutExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-white/15 pl-3"
                      role="group"
                      aria-label="Help and legal"
                    >
                      {mobileAboutSublinks.map(({ href, label }) => {
                        const active = sublinkActive(href, canonicalPathname);
                        return (
                          <Link
                            key={href}
                            href={resolveAboutSublinkHref(href)}
                            className={clsx(
                              nav.darkDrawerSub,
                              active && nav.darkDrawerSubActive
                            )}
                            onClick={closeMenu}
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <Link
                href={findScholarshipsHref}
                className={clsx(
                  nav.darkDrawer,
                  'flex w-full max-w-full items-center gap-3',
                  scholarshipsActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                <MobileDrawerNavIcon
                  icon={Search}
                  active={scholarshipsActive}
                />
                <span className="min-w-0">{navCopy.findScholarships}</span>
              </Link>
              <Link
                href={pilotNavHref('/providers')}
                className={clsx(
                  nav.darkDrawer,
                  'flex w-full max-w-full items-center gap-3',
                  providersActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                <MobileDrawerNavIcon
                  icon={Building2}
                  active={providersActive}
                />
                <span className="min-w-0">{navCopy.providers}</span>
              </Link>
              <div className="w-full max-w-full">
                <div
                  className="flex w-full min-w-0 items-stretch overflow-hidden rounded-lg"
                  onMouseEnter={() => {
                    if (
                      typeof window !== 'undefined' &&
                      window.matchMedia('(hover: hover)').matches
                    ) {
                      setVersusExpanded(true);
                    }
                  }}
                >
                  <Link
                    href={pilotNavHref(VERSUS_HUB_PATH)}
                    className={clsx(
                      nav.darkDrawer,
                      'flex min-w-0 flex-1 items-center gap-3 rounded-none rounded-l-lg py-3 pl-3 pr-2',
                      versusActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    <MobileDrawerNavIcon
                      icon={GitCompareArrows}
                      active={versusActive}
                    />
                    <span className="min-w-0">{navCopy.compare}</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-11 shrink-0 items-center justify-center rounded-none rounded-r-lg border-0 bg-transparent text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-expanded={versusExpanded}
                    aria-controls={`${menuId}-versus-sub`}
                    id={`${menuId}-versus-chevron`}
                    aria-label={
                      versusExpanded ? navCopy.collapseCompare : navCopy.expandCompare
                    }
                    onClick={() => setVersusExpanded((o) => !o)}
                  >
                    <ChevronDown
                      className={clsx(
                        'h-5 w-5 shrink-0 transition-transform duration-200 ease-out',
                        versusExpanded && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
                <div
                  id={`${menuId}-versus-sub`}
                  role="region"
                  aria-label="Compare links"
                  className={clsx(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    versusExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className="mb-1 ml-3 mt-0.5 flex flex-col gap-1 border-l border-white/15 pl-3"
                      role="group"
                      aria-label="University vs University and State vs State"
                    >
                      {versusSublinks.map((item) => {
                        const active = sublinkActive(item.href, canonicalPathname);
                        return (
                          <Link
                            key={item.href}
                            href={pilotNavHref(item.href)}
                            className={clsx(
                              nav.darkDrawerSub,
                              'flex flex-col gap-0.5 py-2.5',
                              active && nav.darkDrawerSubActive
                            )}
                            onClick={closeMenu}
                          >
                            <span className="text-sm font-semibold text-zinc-200">
                              {item.label}
                            </span>
                            <span className="text-xs font-normal leading-snug text-zinc-500">
                              {item.description}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <Link
                href={pilotNavHref(RESOURCES_SECTION_PATH)}
                className={clsx(
                  nav.darkDrawer,
                  'flex w-full max-w-full items-center gap-3',
                  resourcesSectionActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                <MobileDrawerNavIcon
                  icon={LayoutGrid}
                  active={resourcesSectionActive}
                />
                <span className="min-w-0">{navCopy.resources}</span>
              </Link>
              <div className="w-full max-w-full">
                <div
                  className="flex w-full min-w-0 items-stretch overflow-hidden rounded-lg"
                  onMouseEnter={() => {
                    if (
                      typeof window !== 'undefined' &&
                      window.matchMedia('(hover: hover)').matches
                    ) {
                      setEssaysExpanded(true);
                    }
                  }}
                >
                  <Link
                    href={pilotNavHref(ESSAYS_SECTION_PATH)}
                    className={clsx(
                      nav.darkDrawer,
                      'flex min-w-0 flex-1 items-center gap-3 rounded-none rounded-l-lg py-3 pl-3 pr-2',
                      essayGuidesNavActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    <MobileDrawerNavIcon
                      icon={BookOpen}
                      active={essayGuidesNavActive}
                    />
                    <span className="min-w-0">{navCopy.essayGuides}</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-11 shrink-0 items-center justify-center rounded-none rounded-r-lg border-0 bg-transparent text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-expanded={essaysExpanded}
                    aria-controls={`${menuId}-essays-sub`}
                    id={`${menuId}-essays-chevron`}
                    aria-label={
                      essaysExpanded
                        ? navCopy.collapseEssays
                        : navCopy.expandEssays
                    }
                    onClick={() => setEssaysExpanded((o) => !o)}
                  >
                    <ChevronDown
                      className={clsx(
                        'h-5 w-5 shrink-0 transition-transform duration-200 ease-out',
                        essaysExpanded && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
                <div
                  id={`${menuId}-essays-sub`}
                  role="region"
                  aria-label={navCopy.essayGuidesLinks}
                  className={clsx(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    essaysExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className="mb-1 ml-3 mt-0.5 flex flex-col gap-1 border-l border-white/15 pl-3"
                      role="group"
                      aria-label={navCopy.guidesAndMentor}
                    >
                      {essayGuideSublinks.map((item) => {
                        const active =
                          item.href === ESSAYS_SECTION_PATH
                            ? essaysSectionActive
                            : essayMentorActive;
                        return (
                          <Link
                            key={item.href}
                            href={pilotNavHref(item.href)}
                            className={clsx(
                              nav.darkDrawerSub,
                              'flex flex-col gap-0.5 py-2.5',
                              active && nav.darkDrawerSubActive
                            )}
                            onClick={closeMenu}
                          >
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              {item.featured ? (
                                <Sparkles
                                  className="h-3 w-3 text-orange-400"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              ) : null}
                              {item.kicker}
                            </span>
                            <span className="text-sm font-semibold text-zinc-200">
                              {item.title}
                            </span>
                            <span className="text-xs font-normal leading-snug text-zinc-500">
                              {item.description}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {isIqSitePromoVisible() ? (
                <Link
                  href={IQ_TEST_HOME_HREF}
                  className={clsx(
                    nav.darkDrawer,
                    'flex w-full max-w-full items-center gap-3'
                  )}
                  onClick={closeMenu}
                >
                  <MobileDrawerNavIcon icon={Sparkles} active={false} />
                  <span className="min-w-0">{navCopy.iqTest}</span>
                </Link>
              ) : null}
              <>
                <Link
                  href={subscriptionHref}
                  className={clsx(
                    nav.darkDrawer,
                    'flex w-full max-w-full items-center gap-3',
                    pricingActive && nav.darkDrawerActive
                  )}
                  onClick={closeMenu}
                >
                  <MobileDrawerNavIcon icon={BadgeDollarSign} active={pricingActive} />
                  <span className="min-w-0">{navCopy.pricing}</span>
                </Link>
                {locale === 'en' ? (
                  <Link
                    href="/for-organizations"
                    className={clsx(
                      nav.darkDrawer,
                      'flex w-full max-w-full items-center gap-3',
                      forOrganizationsActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    <MobileDrawerNavIcon
                      icon={Handshake}
                      active={forOrganizationsActive}
                    />
                    <span className="min-w-0">{navCopy.forOrganizations}</span>
                  </Link>
                ) : null}
              </>
              {showLanguageSwitcher && SHOW_MOBILE_DRAWER_LANGUAGE_SWITCHER ? (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {navCopy.language}
                  </p>
                  <LanguageSwitcher
                    variant="inline"
                    pathname={pathname || pilotNavHref('/')}
                    currentLocale={locale}
                    className="!border-zinc-700 !bg-zinc-900/80"
                  />
                </div>
              ) : null}
              <NavbarUserSlot
                pathname={pathname}
                variant="drawer"
                onNavigate={closeMenu}
                initialNavbarAuth={initialNavbarAuth}
                initialLocale={locale}
              />
            </nav>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
