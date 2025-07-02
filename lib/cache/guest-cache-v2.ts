// lib/cache/guest-cache-v2.ts
// Cache para verificação de duplicatas de guests - AJUSTADO PARA 500 USERS
// Evita hits desnecessários na BD durante picos de tráfego

import { LRUCache } from 'lru-cache';

interface GuestCacheEntry {
  exists: boolean;
  guestData: any;
  timestamp: number;
}

class GuestCacheV2 {
  private cache = new LRUCache<string, GuestCacheEntry>({
    max: 7500,           // ✅ AUMENTADO: 5000 → 7500 para 500 users
    ttl: 10 * 60 * 1000, // 10 minutos TTL
  });

  // ✅ VERIFICAR CACHE
  get(eventId: string, clientUserId: string): GuestCacheEntry | null {
    const key = `${eventId}:${clientUserId}`;
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  // ✅ ADICIONAR AO CACHE
  set(eventId: string, clientUserId: string, exists: boolean, guestData: any = null): void {
    const key = `${eventId}:${clientUserId}`;
    
    this.cache.set(key, {
      exists,
      guestData,
      timestamp: Date.now()
    });
  }

  // ✅ INVALIDAR ENTRADA
  delete(eventId: string, clientUserId: string): void {
    const key = `${eventId}:${clientUserId}`;
    this.cache.delete(key);
  }

  // ✅ CLEANUP MANUAL
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > 10 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    console.log(`[GUEST-CACHE-V2] Cleaned ${expiredKeys.length} expired entries`);
  }

  // ✅ ESTATÍSTICAS
  getStats(): { size: number; maxSize: number; hitRate: number } {
    const size = this.cache.size;
    const maxSize = this.cache.max;
    
    // Estimativa de hit rate baseada na ocupação
    const hitRate = Math.min(0.90, size / maxSize);
    
    return { size, maxSize, hitRate };
  }

  // ✅ LIMPAR TUDO (para testes)
  clear(): void {
    this.cache.clear();
  }
}

// ✅ SINGLETON INSTANCE
const guestCacheV2 = new GuestCacheV2();

// ✅ CLEANUP TIMER (a cada 5 minutos para 500 users)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    guestCacheV2.cleanup();
  }, 5 * 60 * 1000);
}

// ✅ UTILITÁRIOS DE EXPORT
export const getCachedGuestCheck = (eventId: string, clientUserId: string) => {
  return guestCacheV2.get(eventId, clientUserId);
};

export const setCachedGuestCheck = (eventId: string, clientUserId: string, exists: boolean, guestData: any = null) => {
  guestCacheV2.set(eventId, clientUserId, exists, guestData);
};

export const invalidateGuestCache = (eventId: string, clientUserId: string) => {
  guestCacheV2.delete(eventId, clientUserId);
};

export const getGuestCacheStats = () => {
  return guestCacheV2.getStats();
};

export const clearGuestCache = () => {
  guestCacheV2.clear();
};

export { guestCacheV2, GuestCacheV2 };
export type { GuestCacheEntry }; 