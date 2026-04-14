'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties
} from 'react';
import clsx from 'clsx';
import { ChevronDown, Menu, Sparkles, X } from 'lucide-react';

import Logo from '@/components/icons/Logo';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import {
  RESOURCES_SECTION_LABEL,
  RESOURCES_SECTION_PATH
} from '@/lib/content-hub/resourcesSection';
import { ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';
import NavbarUserSlot from './NavbarUserSlot';
import s from './Navbar.module.css';

const ABOUT_SUBLINKS = [
  { href: '/help', label: 'Help' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/faq', label: 'FAQ' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/subscription', label: 'Pricing' }
] as const;

const ESSAY_MENTOR_PATH = '/essay';

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

export default function Navlinks() {
  const pathname = usePathname() ?? '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [essaysExpanded, setEssaysExpanded] = useState(false);
  /** After choosing a desktop Essay Guides item, hide the flyout until pointer leaves the trigger. */
  const [suppressEssayGuidesFlyout, setSuppressEssayGuidesFlyout] =
    useState(false);
  const menuId = useId();

  const aboutSectionActive = useMemo(() => {
    if (pathname === '/about' || pathname.startsWith('/about/')) return true;
    return ABOUT_SUBLINKS.some((l) => sublinkActive(l.href, pathname));
  }, [pathname]);

  const resourcesSectionActive = useMemo(
    () =>
      pathname === RESOURCES_SECTION_PATH ||
      pathname.startsWith(`${RESOURCES_SECTION_PATH}/`),
    [pathname]
  );

  const essaysSectionActive = useMemo(
    () =>
      pathname === ESSAYS_SECTION_PATH ||
      pathname.startsWith(`${ESSAYS_SECTION_PATH}/`),
    [pathname]
  );

  const essayMentorActive = useMemo(() => {
    if (pathname === ESSAY_MENTOR_PATH) return true;
    if (!pathname.startsWith(`${ESSAY_MENTOR_PATH}/`)) return false;
    return !pathname.startsWith(`${ESSAYS_SECTION_PATH}`);
  }, [pathname]);

  const essayGuidesNavActive = useMemo(
    () => essaysSectionActive || essayMentorActive,
    [essaysSectionActive, essayMentorActive]
  );

  const scholarshipsActive = useMemo(
    () =>
      pathname === '/scholarships' || pathname.startsWith('/scholarships/'),
    [pathname]
  );

  const providersActive = useMemo(
    () => pathname === '/providers' || pathname.startsWith('/providers/'),
    [pathname]
  );

  const forOrganizationsActive = useMemo(
    () =>
      pathname === '/for-organizations' ||
      pathname.startsWith('/for-organizations/'),
    [pathname]
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
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
    }
  }, [menuOpen, aboutSectionActive, essayGuidesNavActive]);

  return (
    <>
      <div className="relative flex flex-row items-center justify-between gap-3 py-3 md:py-4">
        <div className="relative z-0 flex min-w-0 min-h-[2.5rem] flex-1 items-center gap-2 sm:gap-3 md:min-h-[2.75rem]">
          <button
            type="button"
            className="relative z-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:hidden md:h-11 md:w-11"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <X className="h-6 w-6" strokeWidth={2} aria-hidden />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
            )}
          </button>
          <Link
            href="/"
            className={`${s.logo} relative z-[1] shrink-0`}
            aria-label="ScholarshipTop — Home"
          >
            <Logo variant="header" />
          </Link>
          <nav
            className={s.inlineNav}
            aria-label="Main navigation"
          >
            <div className="group/about relative">
              <Link
                href="/about"
                className={clsx(
                  nav.dark,
                  aboutSectionActive && nav.darkActive
                )}
                aria-haspopup="menu"
              >
                About
              </Link>
              <div
                className="pointer-events-none invisible absolute left-0 top-full z-[110] pt-2 opacity-0 transition-[opacity,visibility] duration-150 ease-out group-hover/about:pointer-events-auto group-hover/about:visible group-hover/about:opacity-100 group-focus-within/about:pointer-events-auto group-focus-within/about:visible group-focus-within/about:opacity-100"
                role="presentation"
              >
                <div
                  className="min-w-[240px] max-w-[280px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                  aria-label="About menu"
                >
                  {ABOUT_SUBLINKS.map(({ href, label }) => {
                    const active = sublinkActive(href, pathname);
                    return (
                      <Link
                        key={href}
                        href={href}
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
              href="/scholarships"
              className={clsx(nav.dark, scholarshipsActive && nav.darkActive)}
            >
              Find Scholarships
            </Link>
            <Link
              href="/providers"
              className={clsx(nav.dark, providersActive && nav.darkActive)}
            >
              Providers
            </Link>
            <Link
              href={RESOURCES_SECTION_PATH}
              className={clsx(
                nav.dark,
                resourcesSectionActive && nav.darkActive
              )}
            >
              {RESOURCES_SECTION_LABEL}
            </Link>
            <div
              className="group/essays relative"
              onMouseLeave={() => setSuppressEssayGuidesFlyout(false)}
            >
              <Link
                href={ESSAYS_SECTION_PATH}
                className={clsx(
                  nav.dark,
                  essayGuidesNavActive && nav.darkActive
                )}
                aria-haspopup="menu"
              >
                Essay Guides
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
                  aria-label="Essay Guides menu"
                >
                  {ESSAYS_GUIDE_SUBLINKS.map((item) => {
                    const active =
                      item.href === ESSAYS_SECTION_PATH
                        ? essaysSectionActive
                        : essayMentorActive;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
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
              href="/for-organizations"
              className={clsx(
                nav.dark,
                forOrganizationsActive && nav.darkActive
              )}
            >
              For Organizations
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          <NavbarUserSlot pathname={pathname} variant="header" />
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-[95] bg-black/65 backdrop-blur-[2px] lg:hidden md:top-20"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed left-0 top-16 z-[96] flex h-[calc(100dvh-4rem)] w-[min(100%,18rem)] max-w-full flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl lg:hidden md:top-20 md:h-[calc(100dvh-5rem)] sm:w-[19rem]"
            style={
              {
                paddingTop: 'env(safe-area-inset-top, 0px)'
              } satisfies CSSProperties
            }
          >
            <nav className="flex flex-col gap-0.5 p-3 pt-4" aria-label="Main">
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
                    href="/about"
                    className={clsx(
                      nav.darkDrawer,
                      'min-w-0 flex-1 rounded-none rounded-l-lg py-3 pl-3 pr-2',
                      aboutSectionActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    About
                  </Link>
                  <button
                    type="button"
                    className="flex w-11 shrink-0 items-center justify-center rounded-none rounded-r-lg border-0 bg-transparent text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-expanded={aboutExpanded}
                    aria-controls={`${menuId}-about-sub`}
                    id={`${menuId}-about-chevron`}
                    aria-label={
                      aboutExpanded ? 'Collapse About submenu' : 'Expand About submenu'
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
                      {ABOUT_SUBLINKS.map(({ href, label }) => {
                        const active = sublinkActive(href, pathname);
                        return (
                          <Link
                            key={href}
                            href={href}
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
                href="/scholarships"
                className={clsx(
                  nav.darkDrawer,
                  scholarshipsActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                Find Scholarships
              </Link>
              <Link
                href="/providers"
                className={clsx(
                  nav.darkDrawer,
                  providersActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                Providers
              </Link>
              <Link
                href={RESOURCES_SECTION_PATH}
                className={clsx(
                  nav.darkDrawer,
                  resourcesSectionActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                {RESOURCES_SECTION_LABEL}
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
                    href={ESSAYS_SECTION_PATH}
                    className={clsx(
                      nav.darkDrawer,
                      'min-w-0 flex-1 rounded-none rounded-l-lg py-3 pl-3 pr-2',
                      essayGuidesNavActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    Essay Guides
                  </Link>
                  <button
                    type="button"
                    className="flex w-11 shrink-0 items-center justify-center rounded-none rounded-r-lg border-0 bg-transparent text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-expanded={essaysExpanded}
                    aria-controls={`${menuId}-essays-sub`}
                    id={`${menuId}-essays-chevron`}
                    aria-label={
                      essaysExpanded
                        ? 'Collapse Essay Guides submenu'
                        : 'Expand Essay Guides submenu'
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
                  aria-label="Essay Guides links"
                  className={clsx(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    essaysExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className="mb-1 ml-3 mt-0.5 flex flex-col gap-1 border-l border-white/15 pl-3"
                      role="group"
                      aria-label="Guides and AI mentor"
                    >
                      {ESSAYS_GUIDE_SUBLINKS.map((item) => {
                        const active =
                          item.href === ESSAYS_SECTION_PATH
                            ? essaysSectionActive
                            : essayMentorActive;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
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
              <Link
                href="/for-organizations"
                className={clsx(
                  nav.darkDrawer,
                  forOrganizationsActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                For Organizations
              </Link>
              <NavbarUserSlot
                pathname={pathname}
                variant="drawer"
                onNavigate={closeMenu}
              />
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
