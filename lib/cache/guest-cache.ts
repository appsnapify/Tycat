import { LRUCache } from 'lru-cache';
import { createAdminClient } from '@/lib/supabase/adminClient';

// ✅ CACHE DE DUPLICATAS para guest creation
// Evita queries desnecessárias para verificar se guest já existe
interface GuestCacheEntry {
  exists: boolean;
  guestData?: any;
  timestamp: number;
}

const duplicateCache = new LRUCache<string, GuestCacheEntry>({
  max: 5000, // Máximo 5000 combinações event+user em cache
  ttl: 10 * 60 * 1000, // 10 minutos TTL
});

/**
 * Verifica se guest já existe no evento (com cache)
 * @param eventId - ID do evento
 * @param clientUserId - ID do utilizador
 * @returns Resultado com indicação se existe + dados do guest
 */
export const checkDuplicateGuest = async (eventId: string, clientUserId: string) => {
  const cacheKey = `${eventId}:${clientUserId}`;
  
  // ✅ CACHE HIT - RESPOSTA INSTANTÂNEA
  const cached = duplicateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 600000) { // 10min válido
    return { exists: cached.exists, guestData: cached.guestData };
  }
  
  // ✅ QUERY OTIMIZADA COM ÍNDICE
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('guests')
    .select('id, qr_code_url, created_at')
    .eq('event_id', eventId)
    .eq('client_user_id', clientUserId)
    .limit(1)
    .maybeSingle();
  
  if (error) {
    throw new Error('Erro ao verificar guest existente');
  }
  
  const result = {
    exists: !!data,
    guestData: data || null
  };
  
  // ✅ CACHE PARA PRÓXIMAS VERIFICAÇÕES
  duplicateCache.set(cacheKey, {
    ...result,
    timestamp: Date.now()
  });
  
  return result;
};

/**
 * Invalida cache para uma combinação específica (após criação de guest)
 * @param eventId - ID do evento
 * @param clientUserId - ID do utilizador
 */
export const invalidateGuestCache = (eventId: string, clientUserId: string): void => {
  const cacheKey = `${eventId}:${clientUserId}`;
  duplicateCache.delete(cacheKey);
};

/**
 * Marca guest como existente no cache (após criação bem-sucedida)
 * @param eventId - ID do evento
 * @param clientUserId - ID do utilizador
 * @param guestData - Dados do guest criado
 */
export const setGuestExists = (eventId: string, clientUserId: string, guestData: any): void => {
  const cacheKey = `${eventId}:${clientUserId}`;
  duplicateCache.set(cacheKey, {
    exists: true,
    guestData,
    timestamp: Date.now()
  });
};

/**
 * Estatísticas do cache (útil para monitoring)
 */
export const getGuestCacheStats = () => {
  return {
    size: duplicateCache.size,
    max: duplicateCache.max,
    ttl: duplicateCache.ttl
  };
}; 