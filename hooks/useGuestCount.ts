import { useState, useEffect, useCallback, useMemo } from 'react';

interface GuestCountData {
  count: number;
  checkedIn: number;
  timestamp: string;
}

interface GuestCountState {
  data: GuestCountData | null;
  loading: boolean;
  error: string | null;
}

// Cache local para evitar chamadas duplicadas
const guestCountCache = new Map<string, { data: GuestCountData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useGuestCount(eventId: string | null) {
  const [state, setState] = useState<GuestCountState>({
    data: null,
    loading: false,
    error: null
  });

  // Função para buscar dados com cache
  const fetchGuestCount = useCallback(async (id: string) => {
    // Verificar cache local primeiro
    const cached = guestCountCache.get(id);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setState({
        data: cached.data,
        loading: false,
        error: null
      });
      return cached.data;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/guest-count?eventId=${id}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=300', // Aceitar cache de 5 minutos
        },
      });

      if (!response.ok) {
        throw new Error(`API retornou erro: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const data: GuestCountData = {
          count: result.count || 0,
          checkedIn: result.checkedIn || 0,
          timestamp: result.timestamp
        };

        // Atualizar cache local
        guestCountCache.set(id, { data, timestamp: now });

        setState({
          data,
          loading: false,
          error: null
        });

        return data;
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados';
      
      setState({
        data: null,
        loading: false,
        error: errorMessage
      });

      // Fallback: tentar busca direta no Supabase
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        const { data: guestsData, error: guestsError } = await supabase
          .from('guests')
          .select('id, checked_in')
          .eq('event_id', id);
        
        if (!guestsError && guestsData) {
          const fallbackData: GuestCountData = {
            count: guestsData.length,
            checkedIn: guestsData.filter(g => g.checked_in).length,
            timestamp: new Date().toISOString()
          };

          setState({
            data: fallbackData,
            loading: false,
            error: null
          });

          return fallbackData;
        }
      } catch (fallbackError) {
        // Se fallback também falhar, manter erro original
      }

      throw error;
    }
  }, []);

  // Função para refresh manual
  const refresh = useCallback(() => {
    if (eventId) {
      // Limpar cache para forçar nova busca
      guestCountCache.delete(eventId);
      return fetchGuestCount(eventId);
    }
  }, [eventId, fetchGuestCount]);

  // Efeito para carregar dados quando eventId muda
  useEffect(() => {
    if (eventId) {
      fetchGuestCount(eventId).catch(() => {
        // Erro já tratado no fetchGuestCount
      });
    } else {
      setState({
        data: null,
        loading: false,
        error: null
      });
    }
  }, [eventId, fetchGuestCount]);

  // Memoizar resultado para evitar re-renders desnecessários
  const result = useMemo(() => ({
    ...state,
    refresh
  }), [state, refresh]);

  return result;
}

// Hook para múltiplos eventos (para uso futuro com batch API)
export function useGuestCounts(eventIds: string[]) {
  const [state, setState] = useState<{
    data: Record<string, GuestCountData>;
    loading: boolean;
    error: string | null;
  }>({
    data: {},
    loading: false,
    error: null
  });

  const fetchMultipleGuestCounts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return {};

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Usar batch API para múltiplos eventos
      if (ids.length > 1 && ids.length <= 10) {
        const response = await fetch(`/api/guest-counts?eventIds=${ids.join(',')}`, {
          headers: { 'Cache-Control': 'max-age=300' }
        });

        if (response.ok) {
          const batchResult = await response.json();
          
          if (batchResult.success) {
            const dataMap: Record<string, GuestCountData> = {};
            
            batchResult.results.forEach((result: any) => {
              if (result.success) {
                dataMap[result.eventId] = {
                  count: result.count,
                  checkedIn: result.checkedIn,
                  timestamp: batchResult.timestamp
                };
              }
            });

            setState({
              data: dataMap,
              loading: false,
              error: null
            });

            return dataMap;
          }
        }
      }

      // Fallback: usar chamadas individuais se batch falhar ou for apenas 1 evento
      const promises = ids.map(id => 
        fetch(`/api/guest-count?eventId=${id}`, {
          headers: { 'Cache-Control': 'max-age=300' }
        }).then(res => res.json()).then(data => ({ id, data }))
      );

      const results = await Promise.all(promises);
      const dataMap: Record<string, GuestCountData> = {};

      results.forEach(({ id, data }) => {
        if (data.success) {
          dataMap[id] = {
            count: data.count || 0,
            checkedIn: data.checkedIn || 0,
            timestamp: data.timestamp
          };
        }
      });

      setState({
        data: dataMap,
        loading: false,
        error: null
      });

      return dataMap;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados';
      setState({
        data: {},
        loading: false,
        error: errorMessage
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (eventIds.length > 0) {
      fetchMultipleGuestCounts(eventIds).catch(() => {
        // Erro já tratado
      });
    }
  }, [eventIds, fetchMultipleGuestCounts]);

  return state;
} 