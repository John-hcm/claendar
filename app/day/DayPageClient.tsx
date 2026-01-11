'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import SidebarDrawer from '@/components/SidebarDrawer';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { lunarLabelFromSolarYmd, parseYmd, ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import {
  CalendarEvent,
  DailyEntry,
  EntryCategory,
  deleteDailyEntry,
  deleteEvent,
  fetchCategories,
  fetchEntriesByRange,
  fetchEventsByRange,
} from '@/lib/db';

export default function DayPageClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dateStr = sp.get('date') ?? ymd(new Date());
  const date = useMemo(() => parseYmd(dateStr), [dateStr]);

  const { userId, loading: authLoading } = useRequireAuth(`/day?date=${encodeURIComponent(dateStr)}`);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
        const [cats, ents, evs] = await Promise.all([
          fetchCategories(userId),
          fetchEntriesByRange(userId, dateStr, dateStr),
          fetchEventsByRange(userId, dateStr, dateStr),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setEntries(ents);
        setEvents(evs);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? '데이터 로딩 실패');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [userId, dateStr]);

  if (authLoading) return <div className="min-h-screen bg-[#202124]" />;

  const openTasks = () => router.push('/tasks');

  const logout = async () => {
    await supabase.auth.signOut();
    const next = `/day?date=${encodeURIComponent(dateStr)}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  const openNewEntry = () => router.push(`/entries/new?date=${encodeURIComponent(dateStr)}`);
  const openNewEvent = () => router.push(`/events/new?date=${encodeURIComponent(dateStr)}`);
  const openEditEntry = (id: string) => router.push(`/entries/edit?id=${encodeURIComponent(id)}`);
  const openEditEvent = (id: string) => router.push(`/events/edit?id=${encodeURIComponent(id)}`);

  const onDeleteEntry = async (id: string) => {
    if (!userId) return;
    if (!confirm('이 기록을 삭제할까요?')) return;
    try {
      await deleteDailyEntry(userId, id);
      setEntries((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(e?.message ?? '삭제 실패');
    }
  };

  const onDeleteEvent = async (id: string) => {
    if (!userId) return;
    if (!confirm('이 이벤트를 삭제할까요?')) return;
    try {
      await deleteEvent(userId, id);
      setEvents((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(e?.message ?? '삭제 실패');
    }
  };

  return (
    <div className="min-h-screen bg-[#202124] px-3 py-5 text-[#e8eaed]">
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={logout} />
      <TopBar
        mode=\"title\"
        title={dateStr}
        subtitle={`음력(참고): ${lunarLabelFromSolarYmd(dateStr)}`}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenTasks={openTasks}
        onLogout={logout}
      />

      <div className="mx-auto w-full max-w-[900px] px-3 pb-20 pt-4">
        <div className="mt-1 text-center text-sm text-[#e8eaed]/70">음력(참고): {lunarLabelFromSolarYmd(dateStr)}</div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={openNewEntry} className="rounded-xl bg-[#202124] border border-[#3c4043] px-4 py-2 text-sm font-semibold text-[#e8eaed]">
            + 기록
          </button>
          <button onClick={openNewEvent} className="rounded-xl bg-[#202124] border border-[#3c4043] px-4 py-2 text-sm font-semibold text-[#e8eaed]">
            + 약속/기념일
          </button>
        </div>

        <div className="mt-4 rounded-3xl bg-[#202124] border border-[#3c4043] p-4 text-[#e8eaed]">
          {errMsg && <div className="rounded-xl bg-[#3c4043] px-3 py-2 text-sm text-[#f28b82]">{errMsg}</div>}
          {!errMsg && loading && (
            <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-[#9aa0a6]">불러오는 중...</div>
          )}

          <div className="mt-3">
            <div className="text-sm font-extrabold">약속/기념일</div>
            {events.length === 0 ? (
              <div className="mt-2 text-sm text-[#9aa0a6]">없음</div>
            ) : (
              <div className="mt-2 space-y-2">
                {events.map((ev) => {
                  const cat = ev.category_id ? categoryById.get(ev.category_id) : undefined;
                  return (
                    <div key={ev.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{ev.title}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-[#9aa0a6]">
                            {ev.event_type === 'appointment' ? '약속' : '기념일'}
                            {ev.is_all_day ? ' · 하루종일' : ev.start_time ? ` · ${ev.start_time}` : ''}
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditEvent(ev.id)}
                            className="rounded-lg border px-2 py-1 text-[11px] font-bold"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvent(ev.id)}
                            className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-[#e8eaed]"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      {cat && (
                        <div
                          className="mt-2 inline-block rounded-full px-2 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: cat.color_bg, color: cat.color_text }}
                        >
                          {cat.name}
                        </div>
                      )}
                      {ev.content && <div className="mt-2 text-sm text-[#e8eaed]/70">{ev.content}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm font-extrabold">기록</div>
            {entries.length === 0 ? (
              <div className="mt-2 text-sm text-[#9aa0a6]">없음</div>
            ) : (
              <div className="mt-2 space-y-2">
                {entries.map((e) => {
                  const cat = categoryById.get(e.category_id);
                  return (
                    <div key={e.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-bold truncate">{e.title ?? '제목 없음'}</div>
                          {cat && (
                            <div
                              className="rounded-full px-2 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: cat.color_bg, color: cat.color_text }}
                            >
                              {cat.name}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEntry(e.id)}
                            className="rounded-lg border px-2 py-1 text-[11px] font-bold"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(e.id)}
                            className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-[#e8eaed]"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-[#e8eaed]/80 whitespace-pre-wrap">{e.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
