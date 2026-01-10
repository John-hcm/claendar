import { Suspense } from 'react';
import EventsPageClient from './EventsPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventsPageClient />
    </Suspense>
  );
}
