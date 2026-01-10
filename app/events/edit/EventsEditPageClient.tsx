'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

export default function EditEventPage() {
  const router = useRouter();
  const sp = useSearchParams();

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

  if (authLoading) return <div className="min-h-screen bg-black/90" />;

  const backDate = event?.solar_date ?? solarDate;

  return (
    <div className="min-h-screen bg-black/90 px-3 py-5 text-white">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center justify-between">
          <Link href={`/day?date=${encodeURIComponent(backDate)}`} className="text-sm font-bold underline">
            ◀ 뒤로
          </Link>
          <div className="text-lg font-extrabold">약속/기념일 수정</div>
          <button
            onClick={del}
            disabled={!userId || !eventId || deleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 text-black">
          {errMsg && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errMsg}</div>}

          <div className="mt-4">
            <label className="text-sm font-bold">날짜</label>
            <input
              type="date"
              value={solarDate}
              onChange={(e) => setSolarDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
            <div className="mt-2 text-sm text-black/70">음력(참고): {lunarLabelFromSolarYmd(solarDate)}</div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">카테고리(선택)</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
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
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 치과 예약"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">내용(선택)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="메모"
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
            />
          </div>

          <div className="mt-4 rounded-2xl border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">하루종일</div>
              <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
            </div>

            {!isAllDay && (
              <div className="mt-3">
                <label className="text-sm font-bold">시작 시간</label>
                <input
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="예) 14:30"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm font-bold">매년 반복</div>
              <input
                type="checkbox"
                checked={isRecurringYearly}
                onChange={(e) => setIsRecurringYearly(e.target.checked)}
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={!canSave}
            className="mt-5 w-full rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
