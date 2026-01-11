'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { lunarLabelFromSolarYmd, ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import {
  CalendarEvent,
  EntryCategory,
  deleteEvent,
  fetchCategories,
  fetchEventById,
  updateEvent,
} from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import SidebarDrawer from '@/components/SidebarDrawer';

export default function EditEventPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const eventId = sp.get('id') ?? '';
  const { userId, loading: authLoading } = useRequireAuth(`/events/edit?id=${encodeURIComponent(eventId)}`);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  const [solarDate, setSolarDate] = useState<string>(ymd(new Date()));
  const [categoryId, setCategoryId] = useState<string>('');
  // 종류(약속/기념일) 선택 UI는 제거하되, 기존 데이터의 event_type은 보존합니다.
  const [eventType, setEventType] = useState<'appointment' | 'anniversary'>('appointment');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isAllDay, setIsAllDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('');
  const [isRecurringYearly, setIsRecurringYearly] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const logout = async () => {
    try {
      await (supabase.auth.signOut as any)({ scope: 'local' });
    } catch {
      // ignore
    }
    try {
      window.localStorage.setItem('calio_next', '/events');
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  const goBack = () => router.push('/events');

  const INPUT =
    'mt-1 w-full rounded-xl border border-[#3c4043] bg-[#202124] px-3 py-2 text-sm text-[#e8eaed] placeholder:text-[#9aa0a6] focus:outline-none focus:ring-2 focus:ring-white/20';
  const SELECT =
    'mt-1 w-full rounded-xl border border-[#3c4043] bg-[#202124] px-3 py-2 text-sm text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-white/20';

  useEffect(() => {
    if (!userId || !eventId) return;
    let mounted = true;
    const run = async () => {
      setErrMsg('');
      try {
        const [cats, ev] = await Promise.all([fetchCategories(userId), fetchEventById(userId, eventId)]);
        if (!mounted) return;
        setCategories(cats);
        setEvent(ev);
        setSolarDate(ev.solar_date);
        setCategoryId(ev.category_id ?? '');
        setEventType(ev.event_type);
        setTitle(ev.title ?? '');
        setContent(ev.content ?? '');
        setIsAllDay(ev.is_all_day);
        setStartTime(ev.start_time ?? '');
        setIsRecurringYearly(ev.is_recurring_yearly);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? '불러오기 실패');
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId, eventId]);

  const canSave = useMemo(() => {
    return !!userId && !!eventId && title.trim().length > 0 && !saving && !deleting;
  }, [userId, eventId, title, saving, deleting]);

  const save = async () => {
    if (!userId || !eventId) return;
    if (!canSave) return;

    setErrMsg('');
    setSaving(true);
    try {
      await updateEvent({
        user_id: userId,
        id: eventId,
        event_type: eventType,
        title: title.trim(),
        content: content.trim() ? content : null,
        category_id: categoryId || null,
        calendar_kind: 'solar',
        is_recurring_yearly: isRecurringYearly,
        solar_date: solarDate,
        is_all_day: isAllDay,
        start_time: isAllDay ? null : startTime || null,
      });
      router.replace(`/day?date=${encodeURIComponent(solarDate)}`);
    } catch (e: any) {
      setErrMsg(e?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!userId || !eventId) return;
    if (!confirm('정말 삭제할까요?')) return;

    setErrMsg('');
    setDeleting(true);
    try {
      await deleteEvent(userId, eventId);
      const backDate = event?.solar_date ?? solarDate;
      router.replace(`/day?date=${encodeURIComponent(backDate)}`);
    } catch (e: any) {
      setErrMsg(e?.message ?? '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#202124]" />;

  const backDate = event?.solar_date ?? solarDate;

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
              <div className="truncate text-lg font-extrabold">약속/기념일</div>
              <div className="truncate text-[12px] text-[#9aa0a6]">약속/기념일 수정</div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={del}
              disabled={!userId || !eventId || deleting || saving}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50"
              aria-label="삭제"
              title="삭제"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6h18M8 6V4h8v2m-7 4v8m6-8v8M6 6l1 16h10l1-16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
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
                <path d="M14 12H3m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M20 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 5h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 19h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M13 12H7m0 0 3-3M7 12l3 3"
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

          <div className="mt-4">
            <label className="text-sm font-bold">날짜</label>
            <input type="date" value={solarDate} onChange={(e) => setSolarDate(e.target.value)} className={INPUT} />
            <div className="mt-2 text-sm text-[#e8eaed]/70">음력(참고): {lunarLabelFromSolarYmd(solarDate)}</div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">카테고리(선택)</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={SELECT}>
              <option value="">없음</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 치과 예약" className={INPUT} />
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">내용(선택)</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="메모" className={[INPUT, 'min-h-[120px]'].join(' ')} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#3c4043] p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">하루종일</div>
              <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="h-4 w-4 accent-white" />
            </div>

            {!isAllDay && (
              <div className="mt-3">
                <label className="text-sm font-bold">시작 시간</label>
                <input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="예) 14:30" className={INPUT} />
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm font-bold">매년 반복</div>
              <input type="checkbox" checked={isRecurringYearly} onChange={(e) => setIsRecurringYearly(e.target.checked)} className="h-4 w-4 accent-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
