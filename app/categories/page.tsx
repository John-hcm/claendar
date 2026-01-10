'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/useRequireAuth';
import {
  EntryCategory,
  createCategory,
  deactivateCategory,
  fetchCategories,
  updateCategory,
} from '@/lib/db';

type EditState = {
  id: string;
  name: string;
  color_bg: string;
  color_text: string;
  sort_order: number;
};

export default function CategoriesPage() {
  const { userId, loading: authLoading } = useRequireAuth('/categories');

  const [categories, setCategories] = useState<EntryCategory[]>([]);
  const [name, setName] = useState('');
  const [bg, setBg] = useState('#E9D5FF');
  const [text, setText] = useState('#111827');

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [edit, setEdit] = useState<EditState | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const refresh = async (uid: string) => {
    const data = await fetchCategories(uid);
    setCategories(data);
  };

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      try {
        setErrMsg('');
        const data = await fetchCategories(userId);
        if (mounted) setCategories(data);
      } catch (e: any) {
        if (mounted) setErrMsg(e?.message ?? '카테고리를 불러오지 못했습니다.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (authLoading) return <div className="min-h-screen bg-black/90" />;

  const onCreate = async () => {
    if (!userId) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setErrMsg('');
      const created = await createCategory({
        user_id: userId,
        name: trimmed,
        color_bg: bg,
        color_text: text,
        sort_order: categories.length,
      });
      setCategories((prev) => [...prev, created]);
      setName('');
    } catch (e: any) {
      setErrMsg(e?.message ?? '추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (c: EntryCategory) => {
    setErrMsg('');
    setEdit({
      id: c.id,
      name: c.name,
      color_bg: c.color_bg,
      color_text: c.color_text,
      sort_order: c.sort_order ?? 0,
    });
  };

  const cancelEdit = () => {
    setEdit(null);
    setErrMsg('');
  };

  const onSave = async () => {
    if (!userId || !edit) return;
    try {
      setSavingId(edit.id);
      setErrMsg('');
      await updateCategory({
        user_id: userId,
        id: edit.id,
        name: edit.name.trim(),
        color_bg: edit.color_bg,
        color_text: edit.color_text,
        sort_order: Number.isFinite(edit.sort_order) ? edit.sort_order : 0,
      });
      await refresh(userId);
      setEdit(null);
    } catch (e: any) {
      setErrMsg(e?.message ?? '수정에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (c: EntryCategory) => {
    if (!userId) return;
    const ok = confirm(`"${c.name}" 카테고리를 삭제(비활성)할까요?\n(기록의 category_id는 그대로 남고, 목록에서만 사라집니다)`);
    if (!ok) return;

    try {
      setDeletingId(c.id);
      setErrMsg('');
      await deactivateCategory(userId, c.id);
      await refresh(userId);
      if (edit?.id === c.id) setEdit(null);
    } catch (e: any) {
      setErrMsg(e?.message ?? '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black/90">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← 홈
          </Link>
          <div className="text-sm text-white/70">카테고리</div>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <div className="text-xs text-black/60">이름</div>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="예) 운동, 공부, 독서"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-40">
              <div className="text-xs text-black/60">배경</div>
              <input
                className="mt-1 h-10 w-full rounded-xl border px-2 py-1"
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                aria-label="background color"
              />
            </div>

            <div className="w-full sm:w-40">
              <div className="text-xs text-black/60">텍스트</div>
              <input
                className="mt-1 h-10 w-full rounded-xl border px-2 py-1"
                type="color"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="text color"
              />
            </div>

            <button
              onClick={onCreate}
              disabled={loading || !name.trim()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>

          {errMsg && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errMsg}</div>}

          <div className="mt-5">
            <div className="text-xs font-medium text-black/60">목록</div>

            <div className="mt-2 space-y-2">
              {sorted.map((c) => {
                const isEditing = edit?.id === c.id;
                return (
                  <div key={c.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-7 w-7 rounded-lg border"
                            style={{ backgroundColor: isEditing ? edit.color_bg : c.color_bg }}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {isEditing ? edit.name : c.name}
                            </div>
                            <div className="text-xs text-black/50">
                              순서: {isEditing ? edit.sort_order : c.sort_order}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => startEdit(c)}
                              className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => onDelete(c)}
                              disabled={deletingId === c.id}
                              className="rounded-xl border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                            >
                              {deletingId === c.id ? '삭제 중...' : '삭제'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={onSave}
                              disabled={savingId === c.id || !edit.name.trim()}
                              className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                            >
                              {savingId === c.id ? '저장 중...' : '저장'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
                            >
                              취소
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <div className="text-xs text-black/60">이름</div>
                          <input
                            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                            value={edit.name}
                            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                          />
                        </div>

                        <div>
                          <div className="text-xs text-black/60">배경</div>
                          <input
                            className="mt-1 h-10 w-full rounded-xl border px-2 py-1"
                            type="color"
                            value={edit.color_bg}
                            onChange={(e) => setEdit({ ...edit, color_bg: e.target.value })}
                            aria-label="edit background color"
                          />
                        </div>

                        <div>
                          <div className="text-xs text-black/60">텍스트</div>
                          <input
                            className="mt-1 h-10 w-full rounded-xl border px-2 py-1"
                            type="color"
                            value={edit.color_text}
                            onChange={(e) => setEdit({ ...edit, color_text: e.target.value })}
                            aria-label="edit text color"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <div className="text-xs text-black/60">정렬 순서(숫자)</div>
                          <input
                            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                            type="number"
                            value={edit.sort_order}
                            onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {sorted.length === 0 && (
                <div className="rounded-2xl border p-4 text-sm text-black/60">아직 카테고리가 없습니다. 위에서 추가하세요.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-white/50">
          삭제는 실제 삭제가 아니라 <span className="text-white/70">is_active=false</span>로 비활성 처리됩니다.
        </div>
      </div>
    </div>
  );
}
