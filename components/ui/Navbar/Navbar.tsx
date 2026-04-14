import { getNavbarInitialAuth } from '@/lib/nav/getNavbarInitialAuth';
import s from './Navbar.module.css';
import Navlinks from './Navlinks';

export default async function Navbar() {
  const initialNavbarAuth = await getNavbarInitialAuth();
  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6">
        <Navlinks initialNavbarAuth={initialNavbarAuth} />
      </div>
    </nav>
  );
}
