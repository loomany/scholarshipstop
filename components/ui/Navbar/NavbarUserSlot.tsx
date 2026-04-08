'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import {
  accountNavbarLabel,
  accountNavbarLabelMobile,
  profileDisplayNameFromRow,
  profileFirstNameFromRow
} from '@/lib/nav/accountDisplayName';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import { createClient } from '@/utils/supabase/client';

type NavbarUserSlotProps = {
  pathname: string;
  variant: 'header' | 'drawer';
  onNavigate?: () => void;
};

export default function NavbarUserSlot({
  pathname,
  variant,
  onNavigate
}: NavbarUserSlotProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, [pathname]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setProfileDisplayName(null);
      setProfileFirstName(null);
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
        setProfileDisplayName(profileDisplayNameFromRow(data));
        setProfileFirstName(profileFirstNameFromRow(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const accountLabel = useMemo(() => {
    if (!user) return '';
    return accountNavbarLabel(profileDisplayName, user);
  }, [profileDisplayName, user]);

  const accountLabelMobile = useMemo(() => {
    if (!user) return '';
    return accountNavbarLabelMobile(profileFirstName, profileDisplayName, user);
  }, [profileDisplayName, profileFirstName, user]);

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
    setUser(null);
    setProfileDisplayName(null);
    setProfileFirstName(null);
    router.refresh();
  }, [router]);

  if (variant === 'drawer') {
    if (!user) return null;
    return (
      <>
        <div className="my-2 border-t border-white/15" role="separator" />
        <Link
          href="/account"
          className={clsx(nav.darkDrawer, accountActive && nav.darkDrawerActive)}
          onClick={onNavigate}
        >
          Account
        </Link>
        <button
          type="button"
          className={clsx(nav.darkDrawer, nav.darkAsButton, 'w-full text-left')}
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
        >
          Sign out
        </button>
      </>
    );
  }

  return (
    <div className="flex min-w-[4.75rem] shrink-0 items-center justify-end gap-2 sm:min-w-[5.5rem] lg:min-w-[13rem]">
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
  );
}
