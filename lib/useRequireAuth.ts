'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';

export function useRequireAuth(nextPath: string) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const goLogin = (path: string) => {
    // ✅ /login?next=... 대신 localStorage에 next를 저장하고 /login으로 이동
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('calio_next', path);
      }
    } catch {
      // ignore
    }

    router.replace('/login');
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const uid = data.user?.id ?? null;
      if (!uid) {
        goLogin(nextPath);
        return;
      }
      setUserId(uid);
      setLoading(false);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (!uid) {
        goLogin(nextPath);
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
