'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { createTask } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import SidebarDrawer from '@/components/SidebarDrawer';

export default function TasksNewPageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const date = sp.get('date') ?? ymd(new Date());
  const { userId, loading: authLoading } = useRequireAuth(`/tasks/new?date=${encodeURIComponent(date)}`);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(date);
  const [errMsg, setErrMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDueDate(date);
  }, [date]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login?next=%2Ftasks');
    router.refresh();
  };

  const goBack = () => {
    router.push('/tasks');
  };

  const INPUT =
    'mt-1 w-full rounded-xl border border-[#3c4043] bg-[#202124] px-3 py-2 text-sm text-[#e8eaed] placeholder:text-[#9aa0a6] focus:outline-none focus:ring-2 focus:ring-white/20';

  const save = async () => {
    if (!userId) return;
    const t = title.trim();
    if (!t) {
      setErrMsg('제목을 입력해 주세요.');
      return;
    }
    setErrMsg('');
    setSaving(true);
    try {
      await createTask({ user_id: userId, title: t, notes: notes.trim() ? notes.trim() : null, due_date: dueDate || null });
      router.replace(`/tasks?start=${encodeURIComponent(ymd(new Date()))}&end=${encodeURIComponent(ymd(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 30)))}`);
      router.refresh();
    } catch (e: any) {
      setErrMsg(e?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#202124]" />;

  const openTasks = () => router.push('/tasks');

  const logout = async () => {
    await supabase.auth.signOut();
    const next = `/tasks/new?date=${encodeURIComponent(date)}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#202124] text-[#e8eaed]">
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={logout} />
      {/* Top bar (Google Calendar 스타일) */}
      <div className="sticky top-0 z-10 border-b border-[#3c4043] bg-[#202124]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="메뉴"
              onClick={() => setDrawerOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button type="button" onClick={goBack} className="min-w-0 rounded-lg px-2 py-1 text-left hover:bg-white/10">
              <div className="truncate text-lg font-extrabold">테스크</div>
              <div className="truncate text-[12px] text-[#9aa0a6]">새 테스크</div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50"
              aria-label="저장"
              title="저장"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="로그아웃"
              title="로그아웃"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10 16v1a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M14 12H3m0 0 3-3m-3 3 3 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-3 py-5">
        <div className="mt-1 rounded-3xl bg-[#202124] border border-[#3c4043] p-4 text-[#e8eaed]">
          {errMsg && <div className="rounded-xl bg-[#3c4043] px-3 py-2 text-sm text-[#f28b82]">{errMsg}</div>}

          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <div className="text-sm font-bold">제목</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT}
                placeholder="예: 서류 준비"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-bold">마감일</div>
              <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className={INPUT} />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-bold">메모</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={[INPUT, 'min-h-[140px]'].join(' ')}
                placeholder="필요하면 적어두세요"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
