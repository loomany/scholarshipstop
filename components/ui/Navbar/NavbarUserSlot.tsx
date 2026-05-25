'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { LogOut, UserCircle } from 'lucide-react';

import MobileDrawerNavIcon from '@/components/ui/Navbar/MobileDrawerNavIcon';
import { localizedAccountHref } from '@/lib/i18n/localizedHref';
import {
  accountNavbarLabel,
  profileDisplayNameFromRow,
  profileFirstNameFromRow
} from '@/lib/nav/accountDisplayName';
import type { NavbarInitialAuth } from '@/lib/nav/getNavbarInitialAuth';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import { createClient } from '@/utils/supabase/client';
import { resolveNavLocaleFromPathname } from '@/lib/i18n/resolveNavLocale';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import type { SupportedLocale } from '@/lib/i18n/types';
import { stripLocalePrefix } from '@/lib/i18n/paths';

type NavbarUserSlotProps = {
  pathname: string;
  variant: 'header' | 'drawer';
  onNavigate?: () => void;
  initialNavbarAuth?: NavbarInitialAuth;
  /** From server layout when pathname is not yet available (nav is client-only). */
  initialLocale?: SupportedLocale;
};

const AUTH_COPY: Record<
  'en' | Stage2PilotLocale,
  { account: string; signIn: string; signOut: string }
> = {
  en: { account: 'Account', signIn: 'Sign In', signOut: 'Sign out' },
  es: { account: 'Cuenta', signIn: 'Iniciar sesión', signOut: 'Cerrar sesión' },
  fr: { account: 'Compte', signIn: 'Connexion', signOut: 'Se déconnecter' }
};

function stubUserFromInitial(initial: NonNullable<NavbarInitialAuth>): User {
  return {
    id: initial.userId,
    email: initial.email ?? undefined
  } as User;
}

export default function NavbarUserSlot({
  pathname,
  variant,
  onNavigate,
  initialNavbarAuth = null,
  initialLocale = 'en'
}: NavbarUserSlotProps) {
  const router = useRouter();
  const locale = resolveNavLocaleFromPathname(pathname);
  const canonicalPathname = stripLocalePrefix(pathname);
  const authCopy = AUTH_COPY[locale];
  const [clientUser, setClientUser] = useState<User | null>(null);
  const [authSyncDone, setAuthSyncDone] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(
    () => initialNavbarAuth?.profileDisplayName ?? null
  );
  const [profileFirstName, setProfileFirstName] = useState<string | null>(
    () => initialNavbarAuth?.profileFirstName ?? null
  );
  /** Avoid showing email as a label until `profiles` has been read at least once (client-only sign-in). */
  const [profileQueryIdle, setProfileQueryIdle] = useState(
    () => Boolean(initialNavbarAuth)
  );

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setClientUser(session?.user ?? null);
      setAuthSyncDone(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setClientUser(session?.user ?? null);
      setAuthSyncDone(true);
    });
  }, [pathname]);

  const user = useMemo(() => {
    if (!authSyncDone && initialNavbarAuth) {
      return stubUserFromInitial(initialNavbarAuth);
    }
    return clientUser;
  }, [authSyncDone, clientUser, initialNavbarAuth]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setProfileDisplayName(null);
      setProfileFirstName(null);
      setProfileQueryIdle(false);
      return;
    }

    const serverPrefetched =
      initialNavbarAuth != null && initialNavbarAuth.userId === uid;
    if (serverPrefetched) {
      setProfileQueryIdle(true);
    } else {
      setProfileQueryIdle(false);
    }

    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error) {
          setProfileDisplayName(profileDisplayNameFromRow(data));
          setProfileFirstName(profileFirstNameFromRow(data));
        }
        setProfileQueryIdle(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, initialNavbarAuth]);

  const accountLabel = useMemo(() => {
    if (!user) return '';
    if (
      !profileQueryIdle &&
      !String(profileFirstName ?? '').trim() &&
      !String(profileDisplayName ?? '').trim()
    ) {
      return authCopy.account;
    }
    return accountNavbarLabel(profileFirstName, profileDisplayName, user);
  }, [authCopy.account, profileDisplayName, profileFirstName, profileQueryIdle, user]);

  const accountActive = useMemo(
    () =>
      canonicalPathname === '/account' ||
      canonicalPathname.startsWith('/account/'),
    [canonicalPathname]
  );

  const signInActive = useMemo(
    () =>
      canonicalPathname === '/signin' ||
      canonicalPathname.startsWith('/signin/'),
    [canonicalPathname]
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setClientUser(null);
    setAuthSyncDone(true);
    setProfileDisplayName(null);
    setProfileFirstName(null);
    setProfileQueryIdle(false);
    router.refresh();
  }, [router]);

  const signInHref = locale === 'en' ? '/signin' : `/${locale}/signin`;
  const accountHref = localizedAccountHref(locale);

  if (variant === 'drawer') {
    if (!user) return null;
    return (
      <>
        <div className="my-2 border-t border-white/15" role="separator" />
        <Link
          href={accountHref}
          className={clsx(
            nav.darkDrawer,
            'flex w-full max-w-full items-center gap-3',
            accountActive && nav.darkDrawerActive
          )}
          onClick={onNavigate}
        >
          <MobileDrawerNavIcon icon={UserCircle} active={accountActive} />
          <span className="min-w-0">{authCopy.account}</span>
        </Link>
        <button
          type="button"
          className={clsx(
            nav.darkDrawer,
            nav.darkAsButton,
            'flex w-full max-w-full items-center gap-3 text-left'
          )}
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
        >
          <MobileDrawerNavIcon icon={LogOut} />
          <span className="min-w-0">{authCopy.signOut}</span>
        </button>
      </>
    );
  }

  return (
    <div className="flex min-w-[4.75rem] shrink-0 items-center justify-end gap-2 sm:min-w-[5.5rem] lg:min-w-[13rem]">
      {user ? (
        <Link
          href={accountHref}
          className={clsx(
            nav.dark,
            locale === 'fr' && nav.darkLocaleCompact,
            nav.darkAccount,
            accountActive && nav.darkActive
          )}
          title={accountLabel}
        >
          {accountLabel}
        </Link>
      ) : (
        <Link
          href={signInHref}
          className={clsx(
            nav.dark,
            locale === 'fr' && nav.darkLocaleCompact,
            signInActive && nav.darkActive
          )}
        >
          {authCopy.signIn}
        </Link>
      )}
    </div>
  );
}
