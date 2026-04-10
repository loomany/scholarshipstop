'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import UpdatePassword from '@/components/ui/AuthForms/UpdatePassword';

type Props = {
  redirectMethod: string;
};

/**
 * Recovery sessions are established in the browser; the server often does not see cookies on the
 * first soft navigation. Gate the form on client `getSession()` instead of RSC `getUser()`.
 */
export default function UpdatePasswordSessionGate({ redirectMethod }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function ensureSession() {
      const first = await supabase.auth.getSession();
      if (cancelled) return;
      if (first.data.session?.user) {
        setReady(true);
        return;
      }

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            authListener.subscription.unsubscribe();
            if (!cancelled) setReady(true);
          }
        }
      );

      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled) return;
        const s = await supabase.auth.getSession();
        if (s.data.session?.user) {
          authListener.subscription.unsubscribe();
          setReady(true);
          return;
        }
      }

      authListener.subscription.unsubscribe();
      if (!cancelled) {
        router.replace('/signin/forgot_password');
      }
    }

    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <p className="text-center text-sm text-zinc-600">
        Preparing password reset…
      </p>
    );
  }

  return <UpdatePassword redirectMethod={redirectMethod} />;
}
