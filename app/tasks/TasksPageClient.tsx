'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SidebarDrawer from '@/components/SidebarDrawer';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { TaskItem, deleteTask, fetchTasksByRange, updateTask } from '@/lib/db';

export default function TasksPageClient() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sp = useSearchParams();

  const today = new Date();
  const end = sp.get('end') ?? ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));
  const start = sp.get('start') ?? ymd(today);

  const { userId, loading: authLoading } = useRequireAuth(
    `/tasks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const key = t.due_date ?? '미지정';
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    // 날짜순 + 미지정 마지막
    const keys = Array.from(m.keys()).sort((a, b) => {
      if (a === '미지정') return 1;
      if (b === '미지정') return -1;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ key: k, items: m.get(k) ?? [] }));
  }, [tasks]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const run = async () => {
      setErrMsg('');
      setLoading(true);
      try {
        const list = await fetchTasksByRange(userId, start, end);
        if (!mounted) return;
        setTasks(list);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? '불러오기 실패');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId, start, end]);

  const goNew = () => router.push(`/tasks/new?date=${encodeURIComponent(ymd(today))}`);

  const toggleDone = async (t: TaskItem) => {
    if (!userId) return;
    const next = !t.is_done;
    // optimistic
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_done: next } : x)));
    try {
      await updateTask({ user_id: userId, id: t.id, is_done: next });
    } catch (e: any) {
      // rollback
      setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_done: t.is_done } : x)));
      setErrMsg(e?.message ?? '변경 실패');
    }
  };

  const remove = async (t: TaskItem) => {
    if (!userId) return;
    if (!confirm('삭제할까요?')) return;
    setErrMsg('');
    // optimistic
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    try {
      await deleteTask(userId, t.id);
    } catch (e: any) {
      // rollback
      setTasks((prev) => {
        const next = [...prev, t];
        next.sort((a, b) => {
          const ad = a.due_date ?? '9999-12-31';
          const bd = b.due_date ?? '9999-12-31';
          if (ad !== bd) return ad.localeCompare(bd);
          return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        });
        return next;
      });
      setErrMsg(e?.message ?? '삭제 실패');
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#202124]" />;

  const openTasks = () => router.push('/tasks');

  const logout = async () => {
    await supabase.auth.signOut();
    const next = `/tasks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#202124] px-3 py-5 text-[#e8eaed]">
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={logout} />
      <TopBar
        mode="title"
        title={'테스크'}
        subtitle={`범위: ${start} ~ ${end}`}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenTasks={openTasks}
        onLogout={logout}
      />

      <div className="mx-auto w-full max-w-[900px] px-3 pb-20 pt-4">
        <div className="mt-4 rounded-3xl bg-[#202124] border border-[#3c4043] p-4 text-[#e8eaed]">
          <div className="text-sm font-bold">기간</div>
          <div className="mt-1 text-sm text-[#e8eaed]/70">
            {start} ~ {end}
          </div>

          {errMsg && <div className="mt-3 rounded-xl bg-[#3c4043] px-3 py-2 text-sm text-[#f28b82]">{errMsg}</div>}
          {!errMsg && loading && (
            <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-[#9aa0a6]">불러오는 중...</div>
          )}

          <div className="mt-4 space-y-5">
            {tasks.length === 0 ? (
              <div className="text-sm text-[#9aa0a6]">없음</div>
            ) : (
              grouped.map((g) => (
                <div key={g.key}>
                  <div className="text-sm font-extrabold">{g.key}</div>
                  <div className="mt-2 space-y-2">
                    {g.items.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 rounded-2xl border p-3">
                        <button
                          onClick={() => toggleDone(t)}
                          className={[
                            'mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center',
                            t.is_done ? 'bg-black text-[#e8eaed]' : 'bg-[#202124] border border-[#3c4043]',
                          ].join(' ')}
                          aria-label="toggle-done"
                        >
                          {t.is_done ? '✓' : ''}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={[
                              'font-bold',
                              t.is_done ? 'line-through text-[#e8eaed]/50' : 'text-[#e8eaed]',
                            ].join(' ')}
                          >
                            {t.title}
                          </div>
                          {t.notes && <div className="mt-1 text-sm text-[#e8eaed]/70 truncate">{t.notes}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tasks/edit?id=${encodeURIComponent(t.id)}`}
                            className="rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold"
                          >
                            수정
                          </Link>
                          <button
                            onClick={() => remove(t)}
                            className="rounded-xl bg-[#3c4043] px-3 py-2 text-sm font-semibold text-[#f28b82]"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
