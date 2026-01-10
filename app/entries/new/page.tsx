import { Suspense } from 'react';
import EntriesNewPageClient from './EntriesNewPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EntriesNewPageClient />
    </Suspense>
  );
}
