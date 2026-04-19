'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { createClient } from '@/utils/supabase/client';
import { HOME_PRIMARY_CTA_GUEST_HREF } from '@/lib/nav/homePrimaryCta';
import { resolveScholarshipEntryHrefClient } from '@/lib/nav/scholarshipEntryHrefClient';

type Props = {
  className?: string;
  children: React.ReactNode;
  id?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export default function ScholarshipCatalogEntryLink({
  className,
  children,
  id,
  onClick
}: Props) {
  const [href, setHref] = useState(HOME_PRIMARY_CTA_GUEST_HREF);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHref(resolveScholarshipEntryHrefClient(Boolean(session?.user)));
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHref(resolveScholarshipEntryHrefClient(Boolean(session?.user)));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Link id={id} href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
