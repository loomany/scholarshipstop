'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties
} from 'react';
import clsx from 'clsx';
import { ChevronDown, Menu, X } from 'lucide-react';

import Logo from '@/components/icons/Logo';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import {
  accountNavbarLabel,
  accountNavbarLabelMobile,
  profileDisplayNameFromRow,
  profileFirstNameFromRow
} from '@/lib/nav/accountDisplayName';
import {
  RESOURCES_SECTION_LABEL,
  RESOURCES_SECTION_PATH
} from '@/lib/content-hub/resourcesSection';
import { createClient } from '@/utils/supabase/client';
import s from './Navbar.module.css';

const ABOUT_SUBLINKS = [
  { href: '/help', label: 'Help' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/faq', label: 'FAQ' }
] as const;

function sublinkActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavlinksProps {
  user: User | null;
  /** From `public.profiles` first/last (server). */
  profileDisplayName: string | null;
  /** From `public.profiles.first_name` (server). */
  profileFirstName: string | null;
}

export default function Navlinks({
  user: serverUser,
  profileDisplayName: serverProfileDisplayName,
  profileFirstName: serverProfileFirstName
}: NavlinksProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  /** `undefined` = browser session not read yet (keep SSR `serverUser` for hydration). */
  const [clientUser, setClientUser] = useState<User | null | undefined>(undefined);
  const menuId = useId();

  const user = clientUser === undefined ? serverUser : clientUser;

  /** `undefined` = not loaded yet; use server name until then. */
  const [clientProfileDisplayName, setClientProfileDisplayName] = useState<
    string | null | undefined
  >(undefined);
  const [clientProfileFirstName, setClientProfileFirstName] = useState<
    string | null | undefined
  >(undefined);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setClientUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setClientUser(session?.user ?? null);
    });
  }, [pathname, serverUser?.id]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setClientProfileDisplayName(undefined);
      setClientProfileFirstName(undefined);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setClientProfileDisplayName(profileDisplayNameFromRow(data));
        setClientProfileFirstName(profileFirstNameFromRow(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, serverProfileDisplayName, pathname]);

  const accountLabel = useMemo(() => {
    if (!user) return '';
    const fromProfile =
      clientProfileDisplayName === undefined
        ? serverProfileDisplayName
        : clientProfileDisplayName;
    return accountNavbarLabel(fromProfile, user);
  }, [clientProfileDisplayName, serverProfileDisplayName, user]);

  const accountLabelMobile = useMemo(() => {
    if (!user) return '';
    const firstName =
      clientProfileFirstName === undefined
        ? serverProfileFirstName
        : clientProfileFirstName;
    const fromProfile =
      clientProfileDisplayName === undefined
        ? serverProfileDisplayName
        : clientProfileDisplayName;
    return accountNavbarLabelMobile(firstName, fromProfile, user);
  }, [
    clientProfileFirstName,
    clientProfileDisplayName,
    serverProfileDisplayName,
    serverProfileFirstName,
    user
  ]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setClientUser(null);
    setClientProfileDisplayName(undefined);
    setClientProfileFirstName(undefined);
    router.refresh();
  }, [router]);

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

  const scholarshipsActive = useMemo(
    () =>
      pathname === '/scholarships' || pathname.startsWith('/scholarships/'),
    [pathname]
  );

  const providersActive = useMemo(
    () => pathname === '/providers' || pathname.startsWith('/providers/'),
    [pathname]
  );

  const signInActive = useMemo(
    () => pathname === '/signin' || pathname.startsWith('/signin/'),
    [pathname]
  );

  const accountActive = useMemo(
    () => pathname === '/account' || pathname.startsWith('/account/'),
    [pathname]
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

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
    }
  }, [menuOpen, aboutSectionActive]);

  return (
    <>
      <div className="relative flex flex-row items-center justify-between gap-3 py-3 md:py-4">
        <div className="relative z-0 flex min-w-0 min-h-[2.5rem] flex-1 items-center gap-2 sm:gap-3 md:min-h-[2.75rem]">
          <Link
            href="/"
            className={`${s.logo} relative z-[1] shrink-0`}
            aria-label="ScholarshipTop — Home"
          >
            <Logo variant="header" />
          </Link>
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
          </nav>
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/account"
                className={clsx(nav.dark, nav.darkAccount, accountActive && nav.darkActive)}
                title={accountLabel}
              >
                <span className="lg:hidden">{accountLabelMobile}</span>
                <span className="hidden lg:inline">{accountLabel}</span>
              </Link>
              <button
                type="button"
                className={clsx(nav.dark, nav.darkAsButton, 'hidden lg:inline-flex')}
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className={clsx(nav.dark, signInActive && nav.darkActive)}
            >
              Sign In
            </Link>
          )}
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
              {user ? (
                <>
                  <div className="my-2 border-t border-white/15" role="separator" />
                  <Link
                    href="/account"
                    className={clsx(
                      nav.darkDrawer,
                      accountActive && nav.darkDrawerActive
                    )}
                    onClick={closeMenu}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    className={clsx(nav.darkDrawer, nav.darkAsButton, 'w-full text-left')}
                    onClick={() => {
                      void signOut();
                      closeMenu();
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : null}
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
