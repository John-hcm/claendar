'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DayCell, addMonths, getMonthGrid, isSameYmd, lunarShortFromSolarYmd, monthTitle, ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { CalendarEvent, DailyEntry, EntryCategory, fetchCategories, fetchEntriesByRange, fetchEventsByRange } from '@/lib/db';
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
  const title = useMemo(() => monthTitle(year, month0), [year, month0]);
  const { startYmd, endYmd } = useMemo(() => rangeStartEndForGrid(cells), [cells]);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const run = async () => {
      setErrMsg('');
      setDataLoading(true);
      try {
        const [cats, ents, evs] = await Promise.all([
          fetchCategories(userId),
          fetchEntriesByRange(userId, startYmd, endYmd),
          fetchEventsByRange(userId, startYmd, endYmd),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setEntries(ents);
        setEvents(evs);
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

  const openNewEntry = () => {
    router.push(`/entries/new?date=${encodeURIComponent(ymd(selectedDate))}`);
  };

  const openNewEvent = () => {
    router.push(`/events/new?date=${encodeURIComponent(ymd(selectedDate))}`);
  };

  const openEntries = () => router.push('/entries');
  const openEvents = () => router.push('/events');
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login?next=%2Fcalendar');
    router.refresh();
  };

  const openDayDetail = (d: Date) => {
    setSelectedDate(d);
    router.push(`/day?date=${encodeURIComponent(ymd(d))}`);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-black/90" />;
  }

  return (
    <div className="min-h-screen w-full bg-black/90 px-3 py-5">
      {/* 상단 버튼 */}
      <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={openEntries}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          >
            기록 목록
          </button>
          <button
            onClick={openEvents}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          >
            약속/기념일 목록
          </button>
        </div>

        <div className="flex items-center gap-2">
        <button
          onClick={openNewEntry}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          + 기록
        </button>
        <button
          onClick={openNewEvent}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          + 약속/기념일
        </button>
          <button
            onClick={logout}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 캘린더 카드 */}
      <div className="mx-auto mt-4 w-full max-w-[900px] overflow-hidden">
        <div className="w-full rounded-3xl bg-white p-3 sm:p-4 shadow-lg overflow-hidden">
          {/* 헤더 */}
          <div className="mb-3 flex items-center justify-between">
            {/* 화살표: 모바일에서도 확실히 보이도록 */}
            <button
              onClick={goPrevMonth}
              className="rounded-xl bg-black px-3 py-2 text-sm font-extrabold text-white shadow-sm active:scale-[0.98]"
              aria-label="prev-month"
            >
              ◀
            </button>

            <div className="text-center text-lg font-extrabold text-black select-none">
              {title}
            </div>

            <button
              onClick={goNextMonth}
              className="rounded-xl bg-black px-3 py-2 text-sm font-extrabold text-white shadow-sm active:scale-[0.98]"
              aria-label="next-month"
            >
              ▶
            </button>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pb-2 text-center text-xs sm:text-sm font-semibold text-black/70">
            {DOW_KR.map((d) => (
              <div key={d} className="truncate">
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((c) => {
              const isSelected = isSameYmd(c.date, selectedDate);
              const dayKey = ymd(c.date);
              const dayEntries = entriesByDate.get(dayKey) ?? [];
              const dayEvents = eventsByDate.get(dayKey) ?? [];

              // 한 칸에 최대 2개만(넘치면 …)
              const chips = dayEntries.slice(0, 2).map((e) => {
                const cat = categoryById.get(e.category_id);
                return {
                  id: e.id,
                  label: cat?.name ?? '기록',
                  bg: cat?.color_bg ?? '#E9D5FF',
                  fg: cat?.color_text ?? '#111827',
                };
              });

              return (
                <button
                  key={c.key}
                  onClick={() => openDayDetail(c.date)}
                  className={[
                    'min-w-0 h-[58px] sm:h-[64px] rounded-2xl border px-2 py-2 transition',
                    'flex flex-col items-start overflow-hidden',
                    c.isCurrentMonth ? 'border-black/10 bg-white' : 'border-black/5 bg-black/[0.03]',
                    isSelected ? 'ring-2 ring-black/30' : '',
                  ].join(' ')}
                >
                  {/* 날짜 */}
                  <div
                    className={[
                      'text-sm font-bold leading-none',
                      c.isCurrentMonth ? 'text-black' : 'text-black/35',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline gap-1">
                      <span>{c.date.getDate()}</span>
                      <span
                        className={[
                          'text-[10px] font-semibold',
                          c.isCurrentMonth ? 'text-black/60' : 'text-black/30',
                        ].join(' ')}
                        aria-label="lunar-date"
                      >
                        ({lunarShortFromSolarYmd(dayKey)})
                      </span>
                    </div>
                  </div>

                  {/* 이벤트/기록 표시 영역 (날짜 안 가리게) */}
                  <div className="mt-1 w-full flex flex-wrap gap-1 overflow-hidden">
                    {dayEvents.length > 0 && (
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500/70" />
                    )}

                    {chips.map((chip) => (
                      <span
                        key={chip.id}
                        className="max-w-full truncate rounded-full px-2 py-[2px] text-[10px] font-semibold"
                        style={{ backgroundColor: chip.bg, color: chip.fg }}
                      >
                        {chip.label}
                      </span>
                    ))}

                    {dayEntries.length > 2 && (
                      <span className="text-[10px] font-semibold text-black/60">…</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 안내/에러 */}
          <div className="mt-3 flex flex-col gap-2">
            {errMsg && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {errMsg}
              </div>
            )}

            {!errMsg && dataLoading && (
              <div className="rounded-xl bg-black/5 px-3 py-2 text-sm text-black/60">
                데이터 불러오는 중...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
