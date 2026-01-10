import { Suspense } from 'react';
import EventsEditPageClient from './EventsEditPageClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventsEditPageClient />
    </Suspense>
  );
}
