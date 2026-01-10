import { Suspense } from 'react';
import EventsNewPageClient from './EventsNewPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventsNewPageClient />
    </Suspense>
  );
}
