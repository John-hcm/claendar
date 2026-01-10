'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import {
  DailyEntry,
  EntryCategory,
  deleteDailyEntry,
  fetchCategories,
  fetchDailyEntryById,
  updateDailyEntry,
} from '@/lib/db';

export default function EditEntryPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const entryId = sp.get('id') ?? '';
  const { userId, loading: authLoading } = useRequireAuth(`/entries/edit?id=${encodeURIComponent(entryId)}`);

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [entry, setEntry] = useState<DailyEntry | null>(null);

  const [entryDate, setEntryDate] = useState<string>(ymd(new Date()));
  const [categoryId, setCategoryId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!userId || !entryId) return;
    let mounted = true;
    const run = async () => {
      setErrMsg('');
      try {
        const [cats, e] = await Promise.all([fetchCategories(userId), fetchDailyEntryById(userId, entryId)]);
        if (!mounted) return;
        setCategories(cats);
        setEntry(e);
        setEntryDate(e.entry_date);
        setCategoryId(e.category_id);
        setTitle(e.title ?? '');
        setContent(e.content ?? '');
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? '불러오기 실패');
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId, entryId]);

  const canSave = useMemo(() => {
    return !!userId && !!entryId && !!categoryId && content.trim().length > 0 && !saving && !deleting;
  }, [userId, entryId, categoryId, content, saving, deleting]);

  const save = async () => {
    if (!userId || !entryId) return;
    if (!canSave) return;

    setErrMsg('');
    setSaving(true);
    try {
      await updateDailyEntry({
        user_id: userId,
        id: entryId,
        entry_date: entryDate,
        category_id: categoryId,
        title: title.trim() ? title.trim() : null,
        content,
      });
      router.replace(`/day?date=${encodeURIComponent(entryDate)}`);
    } catch (e: any) {
      setErrMsg(e?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!userId || !entryId) return;
    if (!confirm('정말 삭제할까요?')) return;

    setErrMsg('');
    setDeleting(true);
    try {
      await deleteDailyEntry(userId, entryId);
      const backDate = entry?.entry_date ?? entryDate;
      router.replace(`/day?date=${encodeURIComponent(backDate)}`);
    } catch (e: any) {
      setErrMsg(e?.message ?? '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-black/90" />;

  const backDate = entry?.entry_date ?? entryDate;

  return (
    <div className="min-h-screen bg-black/90 px-3 py-5 text-white">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center justify-between">
          <Link href={`/day?date=${encodeURIComponent(backDate)}`} className="text-sm font-bold underline">
            ◀ 뒤로
          </Link>
          <div className="text-lg font-extrabold">기록 수정</div>
          <button
            onClick={del}
            disabled={!userId || !entryId || deleting}
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
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">카테고리</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              {categories.length === 0 ? (
                <option value="">(카테고리 없음)</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">제목(선택)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 오늘 운동"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[140px]"
            />
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
