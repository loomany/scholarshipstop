'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from './SiteFooter';

/** Site footer only on the homepage; hidden on all other routes. */
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname !== '/') return null;
  return <SiteFooter />;
}
