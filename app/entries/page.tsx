import { Suspense } from 'react';
import EntriesPageClient from './EntriesPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EntriesPageClient />
    </Suspense>
  );
}
