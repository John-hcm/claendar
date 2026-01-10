import { Suspense } from 'react';
import EntriesEditPageClient from './EntriesEditPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EntriesEditPageClient />
    </Suspense>
  );
}
