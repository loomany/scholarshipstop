'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { LogOut, UserCircle } from 'lucide-react';

import MobileDrawerNavIcon from '@/components/ui/Navbar/MobileDrawerNavIcon';
import {
  accountNavbarLabel,
  profileDisplayNameFromRow,
  profileFirstNameFromRow
} from '@/lib/nav/accountDisplayName';
import type { NavbarInitialAuth } from '@/lib/nav/getNavbarInitialAuth';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import { createClient } from '@/utils/supabase/client';

type NavbarUserSlotProps = {
  pathname: string;
  variant: 'header' | 'drawer';
  onNavigate?: () => void;
  initialNavbarAuth?: NavbarInitialAuth;
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
  initialNavbarAuth = null
}: NavbarUserSlotProps) {
  const router = useRouter();
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
      return 'Account';
    }
    return accountNavbarLabel(profileFirstName, profileDisplayName, user);
  }, [profileDisplayName, profileFirstName, profileQueryIdle, user]);

  const accountActive = useMemo(
    () => pathname === '/account' || pathname.startsWith('/account/'),
    [pathname]
  );

  const signInActive = useMemo(
    () => pathname === '/signin' || pathname.startsWith('/signin/'),
    [pathname]
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

  if (variant === 'drawer') {
    if (!user) return null;
    return (
      <>
        <div className="my-2 border-t border-white/15" role="separator" />
        <Link
          href="/account"
          className={clsx(
            nav.darkDrawer,
            'flex w-full max-w-full items-center gap-3',
            accountActive && nav.darkDrawerActive
          )}
          onClick={onNavigate}
        >
          <MobileDrawerNavIcon icon={UserCircle} active={accountActive} />
          <span className="min-w-0">Account</span>
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
          <span className="min-w-0">Sign out</span>
        </button>
      </>
    );
  }

  return (
    <div className="flex min-w-[4.75rem] shrink-0 items-center justify-end gap-2 sm:min-w-[5.5rem] lg:min-w-[13rem]">
      {user ? (
        <Link
          href="/account"
          className={clsx(nav.dark, nav.darkAccount, accountActive && nav.darkActive)}
          title={accountLabel}
        >
          {accountLabel}
        </Link>
      ) : (
        <Link
          href="/signin"
          className={clsx(nav.dark, signInActive && nav.darkActive)}
        >
          Sign In
        </Link>
      )}
    </div>
  );
}
