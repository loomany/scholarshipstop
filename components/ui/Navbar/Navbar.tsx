import { profileDisplayNameFromRow } from '@/lib/nav/accountDisplayName';
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

  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="max-w-6xl px-6 mx-auto">
        <Navlinks user={user ?? null} profileDisplayName={profileDisplayName} />
      </div>
    </nav>
  );
}
