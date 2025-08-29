'use client';

import { useState, useEffect } from 'react';
import { fetchUpcomingEvents, isEventValid, type FetchResult } from './upcoming/UpcomingEventsAPI';
import { UpcomingEventsDisplay } from './upcoming/UpcomingEventsDisplay';

interface ClientEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  event_flyer_url: string | null;
  guest_id: string;
  qr_code: string;
  qr_code_url: string;
  checked_in: boolean;
  check_in_time: string | null;
  source: string;
  organization_name: string;
}

interface ClientUpcomingEventsProps {
  clientUserId: string;
}

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 condição)
export function ClientUpcomingEvents({ clientUserId }: ClientUpcomingEventsProps) {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNÇÃO: Load events (Complexidade: 1)
  const loadEvents = async () => {
    if (!clientUserId) return; // +1
    
    setIsLoading(true);
    setError(null);
    
    const result = await fetchUpcomingEvents(clientUserId);
    setEvents(result.events);
    setError(result.error);
    setIsLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, [clientUserId]);

  return (
    <UpcomingEventsDisplay 
      events={events}
      isLoading={isLoading}
      error={error}
      onRetry={loadEvents}
    />
  );
}
