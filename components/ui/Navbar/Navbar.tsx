import {
  profileDisplayNameFromRow,
  profileFirstNameFromRow
} from '@/lib/nav/accountDisplayName';
import { createClient } from '@/utils/supabase/server';
import { getUserDetails } from '@/utils/supabase/queries';
import s from './Navbar.module.css';
import Navlinks from './Navlinks';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const profile = user ? await getUserDetails(supabase, user.id) : null;
  const profileDisplayName = profileDisplayNameFromRow(profile);
  const profileFirstName = profileFirstNameFromRow(profile);

  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6">
        <Navlinks
          user={user ?? null}
          profileDisplayName={profileDisplayName}
          profileFirstName={profileFirstName}
        />
      </div>
    </nav>
  );
}
