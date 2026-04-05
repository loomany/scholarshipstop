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
import { Menu, X } from 'lucide-react';

import Logo from '@/components/icons/Logo';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import {
  accountNavbarLabel,
  profileDisplayNameFromRow
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
}

export default function Navlinks({
  user: serverUser,
  profileDisplayName: serverProfileDisplayName
}: NavlinksProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  /** `undefined` = browser session not read yet (keep SSR `serverUser` for hydration). */
  const [clientUser, setClientUser] = useState<User | null | undefined>(undefined);
  const menuId = useId();

  const user = clientUser === undefined ? serverUser : clientUser;

  /** `undefined` = not loaded yet; use server name until then. */
  const [clientProfileDisplayName, setClientProfileDisplayName] = useState<
    string | null | undefined
  >(undefined);

  const syncClientSession = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    setClientUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    void syncClientSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setClientUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [syncClientSession]);

  useEffect(() => {
    void syncClientSession();
  }, [pathname, syncClientSession]);

  useEffect(() => {
    const onFocus = () => {
      void syncClientSession();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncClientSession();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncClientSession]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setClientProfileDisplayName(undefined);
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
                {accountLabel}
              </Link>
              <button
                type="button"
                className={clsx(nav.dark, nav.darkAsButton)}
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  setClientUser(null);
                  setClientProfileDisplayName(undefined);
                  router.refresh();
                }}
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
            className="fixed left-0 top-16 z-[96] flex h-[calc(100dvh-4rem)] w-[min(100vw,18rem)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl lg:hidden md:top-20 md:h-[calc(100dvh-5rem)] sm:w-[19rem]"
            style={
              {
                paddingTop: 'env(safe-area-inset-top, 0px)'
              } satisfies CSSProperties
            }
          >
            <nav className="flex flex-col gap-0.5 p-3 pt-4" aria-label="Main">
              <Link
                href="/about"
                className={clsx(
                  nav.darkDrawer,
                  aboutSectionActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                About
              </Link>
              <div
                className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-white/15 pl-3"
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
                href={RESOURCES_SECTION_PATH}
                className={clsx(
                  nav.darkDrawer,
                  resourcesSectionActive && nav.darkDrawerActive
                )}
                onClick={closeMenu}
              >
                {RESOURCES_SECTION_LABEL}
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
