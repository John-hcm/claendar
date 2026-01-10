'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';

export function useRequireAuth(nextPath: string) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const uid = data.user?.id ?? null;
      if (!uid) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      setUserId(uid);
      setLoading(false);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (!uid) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      } else {
        setUserId(uid);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, nextPath]);

  return { userId, loading };
}
