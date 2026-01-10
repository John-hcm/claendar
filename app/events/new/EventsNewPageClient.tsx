'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { lunarLabelFromSolarYmd, ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { EntryCategory, fetchCategories, createEvent } from '@/lib/db';

export default function NewEventPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialDate = sp.get('date') ?? ymd(new Date());
  const { userId, loading: authLoading } = useRequireAuth(`/events/new?date=${encodeURIComponent(initialDate)}`);

  const [solarDate, setSolarDate] = useState<string>(initialDate);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isAllDay, setIsAllDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('');
  const [isRecurringYearly, setIsRecurringYearly] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const run = async () => {
      try {
        const cats = await fetchCategories(userId);
        if (!mounted) return;
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0]!.id);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? '카테고리 로딩 실패');
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const canSave = useMemo(() => {
    return !!userId && title.trim().length > 0 && !saving;
  }, [userId, title, saving]);

  const save = async () => {
    if (!userId) return;
    if (!canSave) return;

    setErrMsg('');
    setSaving(true);
    try {
      await createEvent({
        user_id: userId,
        // 종류(약속/기념일) 선택 UI 제거: 카테고리로만 구분하도록 고정
        event_type: 'appointment',
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

  if (authLoading) return <div className="min-h-screen bg-black/90" />;

  return (
    <div className="min-h-screen bg-black/90 px-3 py-5 text-white">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center justify-between">
          <Link href={`/day?date=${encodeURIComponent(solarDate)}`} className="text-sm font-bold underline">
            ◀ 뒤로
          </Link>
          <div className="text-lg font-extrabold">새 약속/기념일</div>
          <div className="w-[74px]" />
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 text-black">
          <div className="text-sm font-bold">날짜</div>
          <input
            type="date"
            value={solarDate}
            onChange={(e) => setSolarDate(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
          <div className="mt-2 text-sm text-black/70">음력(참고): {lunarLabelFromSolarYmd(solarDate)}</div>

          {errMsg && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errMsg}</div>}

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
