import { headers } from 'next/headers';

import SiteFooter from './SiteFooter';

/** Site footer only on the homepage; hidden on all other routes. */
export default async function ConditionalFooter() {
  const pathname = headers().get('x-pathname') ?? '';
  if (pathname !== '/') return null;
  return <SiteFooter />;
}
