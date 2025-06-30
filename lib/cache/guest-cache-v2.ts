// lib/cache/guest-cache-v2.ts
// Cache para verificação de duplicatas de guests
// Evita queries repetidas durante alta concorrência

interface GuestCacheEntry {
  exists: boolean;
  guestData: any | null;
  timestamp: number;
}

class GuestCacheV2 {
  private cache = new Map<string, GuestCacheEntry>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutos
  private readonly MAX_ENTRIES = 5000; // Limite de memória

  // ✅ GERAR CHAVE DO CACHE
  private getKey(eventId: string, clientUserId: string): string {
    return `${eventId}:${clientUserId}`;
  }

  // ✅ VERIFICAR CACHE
  get(eventId: string, clientUserId: string): GuestCacheEntry | null {
    const key = this.getKey(eventId, clientUserId);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  // ✅ ADICIONAR AO CACHE
  set(eventId: string, clientUserId: string, exists: boolean, guestData: any = null): void {
    // Limpar cache se estiver muito grande
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }
    
    const key = this.getKey(eventId, clientUserId);
    this.cache.set(key, {
      exists,
      guestData,
      timestamp: Date.now()
    });
  }

  // ✅ LIMPEZA AUTOMÁTICA
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        expiredKeys.push(key);
      }
    }
    
    // Remover entradas expiradas
    expiredKeys.forEach(key => this.cache.delete(key));
    
    // Se ainda estiver cheio, remover 25% das mais antigas
    if (this.cache.size >= this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.floor(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  // ✅ INVALIDAR CACHE ESPECÍFICO (quando guest é criado)
  invalidate(eventId: string, clientUserId: string): void {
    const key = this.getKey(eventId, clientUserId);
    this.cache.delete(key);
  }

  // ✅ MÉTRICAS
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttlMs: this.TTL_MS
    };
  }

  // ✅ LIMPAR TUDO
  clear(): void {
    this.cache.clear();
  }
}

// Singleton
export const guestCacheV2 = new GuestCacheV2();

// Utilitários
export const getCachedGuestCheck = (eventId: string, clientUserId: string) => {
  return guestCacheV2.get(eventId, clientUserId);
};

export const setCachedGuestCheck = (eventId: string, clientUserId: string, exists: boolean, guestData: any = null) => {
  guestCacheV2.set(eventId, clientUserId, exists, guestData);
};

export const invalidateGuestCache = (eventId: string, clientUserId: string) => {
  guestCacheV2.invalidate(eventId, clientUserId);
};

export const clearGuestCache = () => {
  guestCacheV2.clear();
};

export const getGuestCacheStats = () => {
  return guestCacheV2.getStats();
}; 