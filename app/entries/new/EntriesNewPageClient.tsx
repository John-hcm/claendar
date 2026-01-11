'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ymd } from '@/lib/date';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { EntryCategory, fetchCategories, createCategory, createDailyEntry } from '@/lib/db';

export default function NewEntryPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const date = sp.get('date') ?? ymd(new Date());
  const { userId, loading: authLoading } = useRequireAuth(`/entries/new?date=${encodeURIComponent(date)}`);

  const [categories, setCategories] = useState<EntryCategory[]>([]); 
  const [newCatName, setNewCatName] = useState('');
  const [newCatBg, setNewCatBg] = useState('#E9D5FF');
  const [newCatText, setNewCatText] = useState('#111827');
  const [categoryId, setCategoryId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
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
    return !!userId && !!categoryId && content.trim().length > 0 && !saving;
  }, [userId, categoryId, content, saving]);

  
  const canCreateCategory = !!userId && newCatName.trim().length > 0;

  const addCategory = async () => {
    if (!userId) return;
    const name = newCatName.trim();
    if (!name) return;

    try {
      const created = await createCategory({
        user_id: userId,
        name,
        color_bg: newCatBg,
        color_text: newCatText,
        sort_order: categories.length,
      });
      const nextCats = [...categories, created];
      setCategories(nextCats);
      setCategoryId(created.id);
      setNewCatName('');
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  };

const save = async () => {
    if (!userId) return;
    if (!canSave) return;

    setErrMsg('');
    setSaving(true);
    try {
      await createDailyEntry({
        user_id: userId,
        entry_date: date,
        category_id: categoryId,
        title: title.trim() ? title.trim() : null,
        content: content,
      });
      router.replace(`/day?date=${encodeURIComponent(date)}`);
    } catch (e: any) {
      setErrMsg(e?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#202124]" />;

  return (
    <div className="min-h-screen bg-[#202124] px-3 py-5 text-[#e8eaed]">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex items-center justify-between">
          <Link href={`/day?date=${encodeURIComponent(date)}`} className="text-sm font-bold underline">
            ◀ 뒤로
          </Link>
          <div className="text-lg font-extrabold">새 기록</div>
          <div className="w-[74px]" />
        </div>

        <div className="mt-4 rounded-3xl bg-[#202124] border border-[#3c4043] p-4 text-[#e8eaed]">
          <div className="text-sm font-bold">날짜</div>
          <div className="mt-1 text-sm text-[#e8eaed]/70">{date}</div>

          {errMsg && <div className="mt-3 rounded-xl bg-[#3c4043] px-3 py-2 text-sm text-[#f28b82]">{errMsg}</div>}

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">카테고리</label>
              <Link href="/categories" className="text-xs font-bold underline">
                카테고리 관리
              </Link>
            </div>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              {categories.length === 0 ? (
                <option value="">(없음) 아래에서 카테고리를 추가하세요</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>

            {categories.length === 0 && (
              <div className="mt-3 rounded-2xl border p-3">
                <div className="text-sm font-extrabold">카테고리 추가</div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="예) 독서, 운동, 업무..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">배경</span>
                    <input
                      type="color"
                      value={newCatBg}
                      onChange={(e) => setNewCatBg(e.target.value)}
                      className="h-9 w-14 rounded-lg border"
                    />
                    <span className="text-xs font-bold">글자</span>
                    <input
                      type="color"
                      value={newCatText}
                      onChange={(e) => setNewCatText(e.target.value)}
                      className="h-9 w-14 rounded-lg border"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addCategory}
                    disabled={!canCreateCategory}
                    className="rounded-xl bg-black px-3 py-2 text-sm font-extrabold text-[#e8eaed] disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>

                <div className="mt-2 text-xs text-[#9aa0a6]">
                  추가 후 바로 선택되고, 저장 버튼이 활성화됩니다.
                </div>
              </div>
            )}
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
            className="mt-5 w-full rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-[#e8eaed] disabled:opacity-40"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
