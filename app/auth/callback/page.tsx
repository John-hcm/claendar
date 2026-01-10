'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') ?? '/calendar';

  const [msg, setMsg] = useState('인증 처리 중...');

  useEffect(() => {
    const run = async () => {
      // Supabase가 에러를 #error=... 형태(해시)로 줄 때가 많아서
      // 서버(route.ts)로는 못 받고, 클라이언트에서 읽어야 합니다.
      const hash = window.location.hash || '';
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

      const err = hashParams.get('error');
      const errDesc = hashParams.get('error_description');

      if (err) {
        setMsg(`인증 실패: ${decodeURIComponent(errDesc ?? err)}`);
        // 실패면 로그인으로 보내는 게 안전
        setTimeout(() => router.replace(`/login?next=${encodeURIComponent(next)}`), 1200);
        return;
      }

      // 성공 케이스: 세션이 이미 잡혔는지 확인
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setMsg('인증 완료. 이동합니다...');
        router.replace(next);
        return;
      }

      // 세션이 없다면(메일 링크 설정/상태에 따라) 로그인 페이지로 유도
      setMsg('인증은 완료되었지만 세션이 없습니다. 로그인으로 이동합니다...');
      setTimeout(() => router.replace(`/login?next=${encodeURIComponent(next)}`), 1200);
    };

    run();
  }, [router, next]);

  return (
    <div className="min-h-screen bg-black/90 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-[520px] rounded-3xl bg-white p-6 text-black">
        <div className="text-xl font-extrabold">이메일 인증</div>
        <div className="mt-3 rounded-xl bg-black/5 p-3 text-sm">{msg}</div>
        <div className="mt-4 text-sm text-black/60">이동 경로: {next}</div>
      </div>
    </div>
  );
}
