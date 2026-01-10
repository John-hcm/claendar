import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
