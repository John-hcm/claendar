'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DayCell,
  addMonths,
  getMonthGrid,
  isSameYmd,
  lunarShortFromSolarYmd,
  ymd,
} from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import {
  CalendarEvent,
  DailyEntry,
  EntryCategory,
  TaskItem,
  fetchCategories,
  fetchEntriesByRange,
  fetchEventsByRange,
  fetchTasksByRange,
} from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];

function rangeStartEndForGrid(cells: DayCell[]) {
  const start = cells[0]?.date ?? new Date();
  const end = cells[cells.length - 1]?.date ?? new Date();
  return { startYmd: ymd(start), endYmd: ymd(end) };
}

export default function CalendarPage() {
  const router = useRouter();

  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month0, setMonth0] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const { userId, loading: authLoading } = useRequireAuth('/calendar');

  const cells = useMemo(() => getMonthGrid(year, month0), [year, month0]);

  const lunarRange = useMemo(() => {
    try {
      const first = new Date(year, month0, 1);
      const last = new Date(year, month0 + 1, 0);

      const fmt = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', { month: 'numeric' });
      const m1 = Number(fmt.format(first).match(/\d+/)?.[0] ?? 0);
      const m2 = Number(fmt.format(last).match(/\d+/)?.[0] ?? 0);

      if (!m1 || !m2) return '';
      return m1 === m2 ? `음력 ${m1}월` : `음력 ${m1}월 - ${m2}월`;
    } catch {
      return '';
    }
  }, [year, month0]);
  const { startYmd, endYmd } = useMemo(() => rangeStartEndForGrid(cells), [cells]);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [errMsg, setErrMsg] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(false);

  const categoryById = useMemo(() => {
    const m = new Map<string, EntryCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const entriesByDate = useMemo(() => {
    const m = new Map<string, DailyEntry[]>();
    for (const e of entries) {
      const key = e.entry_date;
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return m;
  }, [entries]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.solar_date;
      const arr = m.get(key) ?? [];
      arr.push(ev);
      m.set(key, arr);
    }
    return m;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const m = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const key = t.due_date;
      if (!key) continue;
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [tasks]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const run = async () => {
      setErrMsg('');
      setDataLoading(true);
      try {
        const [cats, ents, evs, tks] = await Promise.all([
          fetchCategories(userId),
          fetchEntriesByRange(userId, startYmd, endYmd),
          fetchEventsByRange(userId, startYmd, endYmd),
          fetchTasksByRange(userId, startYmd, endYmd),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setEntries(ents);
        setEvents(evs);
        setTasks(tks);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? '데이터 로딩 실패');
      } finally {
        if (mounted) setDataLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [userId, startYmd, endYmd]);

  const goPrevMonth = () => {
    const next = addMonths(year, month0, -1);
    setYear(next.year);
    setMonth0(next.month0);
    setSelectedDate(new Date(next.year, next.month0, 1));
  };

  const goNextMonth = () => {
    const next = addMonths(year, month0, +1);
    setYear(next.year);
    setMonth0(next.month0);
    setSelectedDate(new Date(next.year, next.month0, 1));
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth0(t.getMonth());
    setSelectedDate(t);
    router.push(`/day?date=${encodeURIComponent(ymd(t))}`);
  };

  const openNewEntry = () => router.push(`/entries/new?date=${encodeURIComponent(ymd(selectedDate))}`);
  const openNewEvent = () => router.push(`/events/new?date=${encodeURIComponent(ymd(selectedDate))}`);
  const openNewTask = () => router.push(`/tasks/new?date=${encodeURIComponent(ymd(selectedDate))}`);

  const openEntries = () => router.push('/entries');
  const openEvents = () => router.push('/events');
  const openTasks = () => router.push('/tasks');

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login?next=%2Fcalendar');
    router.refresh();
  };

  const openDayDetail = (d: Date) => {
    setSelectedDate(d);
    router.push(`/day?date=${encodeURIComponent(ymd(d))}`);
  };

  // mini calendar (sidebar)
  const miniCells = useMemo(() => getMonthGrid(year, month0), [year, month0]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#f6f7f8]" />;
  }


  return (
    <div className="min-h-screen bg-[#202124] text-[#e8eaed]">
      {/* Top bar (Google Calendar 스타일) */}
      <div className="sticky top-0 z-10 border-b border-[#3c4043] bg-[#202124]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="메뉴"
            >
              {/* hamburger */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              className="min-w-0 rounded-lg px-2 py-1 text-left hover:bg-white/10"
            >
              <div className="flex items-center gap-1">
                <div className="truncate text-lg font-extrabold">{month0 + 1}월</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                  <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="truncate text-[12px] text-[#9aa0a6]">{lunarRange}</div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="이전 달"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="다음 달"
            >
              ›
            </button>

            <button
              type="button"
              onClick={goToday}
              className="ml-1 inline-flex items-center gap-2 rounded-full border border-[#3c4043] px-3 py-2 text-sm font-bold hover:bg-white/10"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#3c4043] text-xs font-extrabold">
                {new Date().getDate()}
              </span>
              오늘
            </button>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="검색"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={openTasks}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="테스크"
              title="테스크"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 11 11 13 15 9M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
                <path d="M14 12H3m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Month grid */}
      <div className="mx-auto w-full max-w-[1400px] px-2 pb-20 pt-2">
        {/* DOW */}
        <div className="grid grid-cols-7 border-l border-t border-[#3c4043] bg-[#202124]">
          {DOW_KR.map((d) => (
            <div
              key={d}
              className="border-b border-r border-[#3c4043] px-2 py-2 text-center text-sm font-extrabold text-[#e8eaed]"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-t border-[#3c4043]">
          {cells.map((c) => {
            const isSelected = isSameYmd(c.date, selectedDate);
            const dayKey = ymd(c.date);
            const dayEntries = entriesByDate.get(dayKey) ?? [];
            const dayEvents = eventsByDate.get(dayKey) ?? [];
            const dayTasks = tasksByDate.get(dayKey) ?? [];

            const chips = dayEntries.slice(0, 2).map((e) => {
              const cat = categoryById.get(e.category_id);
              return {
                id: `entry_${e.id}`,
                label: e.title || (cat?.name ?? '기록'),
                bg: cat?.color_bg ?? '#1a73e8',
                fg: cat?.color_text ?? '#e8eaed',
              };
            });

            const extraEvents = dayEvents.slice(0, 1).map((ev) => ({
              id: `event_${ev.id}`,
              label: ev.title || '약속/기념일',
              bg: '#1a73e8',
              fg: '#e8eaed',
            }));

            const pendingTasks = dayTasks.filter((t) => !t.is_done).slice(0, 1).map((t) => ({
              id: `task_${t.id}`,
              label: t.title || '테스크',
              bg: '#a142f4',
              fg: '#e8eaed',
            }));

            const today = new Date();
            const isToday = isSameYmd(c.date, today);

            return (
              <button
                key={c.key}
                onClick={() => openDayDetail(c.date)}
                className={[
                  'min-w-0 border-b border-r border-[#3c4043] p-2 text-left transition',
                  'h-[110px] sm:h-[120px] lg:h-[128px]',
                  'hover:bg-white/5',
                  !c.isCurrentMonth ? 'bg-white/[0.03]' : 'bg-[#202124]',
                  isSelected ? 'bg-white/[0.06]' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="leading-tight">
                    <div className="text-sm font-extrabold">
                      {isToday ? (
                        <span className="inline-flex rounded-full bg-[#8ab4f8] px-2 py-[1px] text-[#202124]">
                          {c.date.getDate()}
                        </span>
                      ) : (
                        <span className={c.isCurrentMonth ? 'text-[#e8eaed]' : 'text-[#9aa0a6]'}>
                          {c.date.getDate()}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] font-semibold text-[#9aa0a6]">
                      ({lunarShortFromSolarYmd(dayKey)})
                    </div>
                  </div>

                  {/* indicators */}
                  <div className="flex items-center gap-1 pt-1">
                    {dayEvents.length > 0 && <span className="inline-block h-2 w-2 rounded-full bg-[#8ab4f8]" />}
                    {dayTasks.filter((t) => !t.is_done).length > 0 && (
                      <span className="inline-block h-2 w-2 rounded-full bg-[#d7aefb]" />
                    )}
                  </div>
                </div>

                {/* chips */}
                <div className="mt-2 space-y-1 overflow-hidden">
                  {[...extraEvents, ...pendingTasks, ...chips].slice(0, 3).map((chip) => (
                    <div
                      key={chip.id}
                      className="max-w-full truncate rounded px-2 py-[2px] text-[11px] font-semibold"
                      style={{ backgroundColor: chip.bg, color: chip.fg }}
                    >
                      {chip.label}
                    </div>
                  ))}
                  {dayEntries.length + dayEvents.length + dayTasks.length > 3 && (
                    <div className="text-[11px] font-semibold text-[#9aa0a6]">…</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          {errMsg && <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{errMsg}</div>}
          {!errMsg && dataLoading && (
            <div className="rounded-xl border border-[#3c4043] bg-[#202124] px-3 py-2 text-sm text-[#9aa0a6]">
              데이터 불러오는 중...
            </div>
          )}
        </div>
      </div>

      {/* Floating + button */}
      <button
        type="button"
        onClick={openNewEvent}
        className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#8ab4f8] text-[#202124] shadow-lg hover:opacity-95"
        aria-label="새로 만들기"
      >
        <span className="text-3xl leading-none">+</span>
      </button>
    </div>
  );
}
