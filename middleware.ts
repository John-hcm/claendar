import { NextResponse, type NextRequest } from 'next/server';

// ✅ 빌드 호환용 최소 middleware
// - Supabase 세션(localStorage)은 Edge middleware에서 직접 확인할 수 없습니다.
// - 보호 라우팅은 클라이언트 훅(useRequireAuth)로 처리합니다.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
