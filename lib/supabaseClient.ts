import { createClient } from '@supabase/supabase-js';

// ✅ 브라우저 세션 유지 (localStorage 기반)
// - 기본값(persistSession=true)로 브라우저/PWA를 닫았다가 다시 열어도 로그인 유지됩니다.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
