'use client';

import React from 'react';

type Props = {
  mode: 'month' | 'title';
  monthLabel?: string;
  title?: string;
  subtitle?: string;

  onOpenDrawer: () => void;

  onSearch?: () => void;
  onOpenTasks?: () => void;
  onLogout?: () => void;
};

export default function TopBar({
  mode,
  monthLabel,
  title,
  subtitle,
  onOpenDrawer,
  onSearch,
  onOpenTasks,
  onLogout,
}: Props) {
  return (
    <div className="sticky top-0 z-10 border-b border-[#3c4043] bg-[#202124]">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-3 py-2 text-[#e8eaed]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="메뉴"
            onClick={onOpenDrawer}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {mode === 'month' ? (
            <button type="button" className="min-w-0 rounded-lg px-2 py-1 text-left hover:bg-white/10">
              <div className="flex items-center gap-1">
                <div className="truncate text-lg font-extrabold">{monthLabel ?? ''}</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              {subtitle ? <div className="text-xs text-[#9aa0a6]">{subtitle}</div> : null}
            </button>
          ) : (
            <div className="min-w-0 px-2 py-1">
              <div className="truncate text-lg font-extrabold">{title ?? ''}</div>
              {subtitle ? <div className="truncate text-xs text-[#9aa0a6]">{subtitle}</div> : null}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="검색"
            title="검색"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
              <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenTasks}
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
            onClick={onLogout}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
