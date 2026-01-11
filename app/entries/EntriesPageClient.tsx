'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SidebarDrawer from '@/components/SidebarDrawer';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { DailyEntry, EntryCategory, fetchCategories, fetchEntriesByRange } from '@/lib/db';

export default function EntriesPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sp = useSearchParams();

  const today = new Date();
  const end = sp.get('end') ?? ymd(today);
  const start = sp.get('start') ?? ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));

  const { userId, loading: authLoading } = useRequireAuth(`/entries?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const categoryById = useMemo(() => {
    const m = new Map<string, EntryCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const run = async () => {
      setErrMsg('');
      setLoading(true);
      try {
        const [cats, ents] = await Promise.all([
          fetchCategories(userId),
          fetchEntriesByRange(userId, start, end),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setEntries(ents);
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

  if (authLoading) return <div className="min-h-screen bg-[#202124]" />;

  const openTasks = () => router.push('/tasks');

  const logout = async () => {
    await supabase.auth.signOut();
    const next = `/entries?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  const goNew = () => router.push(`/entries/new?date=${encodeURIComponent(ymd(new Date()))}`);

  return (
    <div className="min-h-screen bg-[#202124] px-3 py-5 text-[#e8eaed]">
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={logout} />
      <TopBar
        mode="title"
        title={'기록'}
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
          {!errMsg && loading && <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-[#9aa0a6]">불러오는 중...</div>}

          <div className="mt-4 space-y-2">
            {entries.length === 0 ? (
              <div className="text-sm text-[#9aa0a6]">없음</div>
            ) : (
              entries.map((e) => {
                const cat = categoryById.get(e.category_id);
                return (
                  <Link
                    key={e.id}
                    href={`/day?date=${encodeURIComponent(e.entry_date)}`}
                    className="block rounded-2xl border p-3 hover:bg-black/[0.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{e.title ?? '제목 없음'}</div>
                      <div className="text-xs text-[#9aa0a6]">{e.entry_date}</div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {cat && (
                        <span
                          className="inline-block max-w-[60%] truncate rounded-full px-2 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: cat.color_bg, color: cat.color_text }}
                        >
                          {cat.name}
                        </span>
                      )}
                      <span className="text-sm text-[#e8eaed]/70 truncate">{e.content}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
