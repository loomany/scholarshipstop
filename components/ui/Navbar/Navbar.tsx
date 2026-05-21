import dynamic from 'next/dynamic';
import { getNavbarInitialAuth } from '@/lib/nav/getNavbarInitialAuth';
import type { SupportedLocale } from '@/lib/i18n/types';
import s from './Navbar.module.css';

/**
 * `usePathname()` in `Navlinks` can throw under Next dev + Turbopack SSR.
 * Keep the auth preload on the server, but render the interactive nav client-only.
 */
const Navlinks = dynamic(() => import('./Navlinks'), {
  ssr: false
});

export default async function Navbar({
  locale = 'en'
}: {
  locale?: SupportedLocale;
}) {
  const initialNavbarAuth = await getNavbarInitialAuth();
  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6">
        <Navlinks initialNavbarAuth={initialNavbarAuth} initialLocale={locale} />
      </div>
    </nav>
  );
}
