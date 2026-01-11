'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient'; // ✅ alias(@/) 제거, 상대경로로 수정

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextFromQuery = sp.get('next');
  const [next, setNext] = useState<string>(nextFromQuery ?? '/calendar');

  useEffect(() => {
    // ✅ 쿼리(next)가 없으면, 보호 라우팅에서 저장한 localStorage 값을 사용
    if (nextFromQuery) {
      setNext(nextFromQuery);
      return;
    }
    try {
      const saved = window.localStorage.getItem('calio_next');
      if (saved) setNext(saved);
    } catch {
      // ignore
    }
  }, [nextFromQuery]);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const onLogin = async () => {
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMsg(error.message || '로그인 실패');
      return;
    }

    try {
      window.localStorage.removeItem('calio_next');
    } catch {
      // ignore
    }

    // ✅ 로그인 후 이동은 항상 캘린더로 (경로 꼬임/404 방지)
    router.replace('/calendar');
    router.refresh();
  };

  const onSignup = async () => {
    setLoading(true);
    setMsg('');

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // Confirm Email ON이면 메일 인증 필요
    setMsg('회원가입 완료. 이메일 인증이 켜져 있으면 메일함에서 확인 후 다시 로그인하세요.');
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-[#202124] px-4 py-10 text-[#e8eaed]">
      <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-[#202124] border border-[#3c4043] p-6 text-[#e8eaed]">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold">
            {mode === 'login' ? '로그인' : '회원가입'}
          </div>

          <Link href={next} className="text-sm font-bold underline">
            캘린더로
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {mode === 'login' ? (
            <button
              onClick={onLogin}
              disabled={loading}
              className="w-full rounded-xl bg-black py-2 font-bold text-[#e8eaed] disabled:opacity-50"
            >
              로그인
            </button>
          ) : (
            <button
              onClick={onSignup}
              disabled={loading}
              className="w-full rounded-xl bg-black py-2 font-bold text-[#e8eaed] disabled:opacity-50"
            >
              회원가입
            </button>
          )}

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-bold underline"
              type="button"
            >
              {mode === 'login' ? '회원가입으로' : '로그인으로'}
            </button>

            <span className="text-[#9aa0a6]">다음 이동: {next}</span>
          </div>

          {msg && <div className="rounded-xl bg-white/5 px-3 py-2 text-sm">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
