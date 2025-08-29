'use client';

import { useState, useCallback } from 'react';
import { ClientEvent, UseClientEventsReturn } from '@/types/client';
import { clientEventsApi } from '@/lib/client/api';

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 if)
export function useClientEvents(): UseClientEventsReturn {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ClientEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientEventsApi.getAll();
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setError(response.error || 'Erro ao carregar eventos');
      }
    } catch (error) {
      setError('Erro de conexão');
      console.error('Fetch events error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUpcoming = useCallback(async (limit?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientEventsApi.getUpcoming(limit);
      if (response.success && response.data) {
        setUpcomingEvents(response.data);
      } else {
        setError(response.error || 'Erro ao carregar próximos eventos');
      }
    } catch (error) {
      setError('Erro de conexão');
      console.error('Fetch upcoming events error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPast = useCallback(async (page?: number, limit?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientEventsApi.getPast(page, limit);
      if (response.success && response.data) {
        setPastEvents(response.data);
      } else {
        setError(response.error || 'Erro ao carregar histórico');
      }
    } catch (error) {
      setError('Erro de conexão');
      console.error('Fetch past events error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    await Promise.all([
      fetchEvents(),
      fetchUpcoming(3),
      fetchPast(1, 10)
    ]);
  }, [fetchEvents, fetchUpcoming, fetchPast]);

  return {
    events,
    upcomingEvents,
    pastEvents,
    isLoading,
    error,
    fetchEvents,
    fetchUpcoming,
    fetchPast,
    refreshEvents
  };
}

