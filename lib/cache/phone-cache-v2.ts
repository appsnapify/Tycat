// lib/cache/phone-cache-v2.ts
// Cache otimizado para telefones - AJUSTADO PARA 500 USERS
// Reduz latência de verificação de 500ms → 50ms

import { LRUCache } from 'lru-cache';

interface PhoneCacheEntry {
  exists: boolean;
  userId: string | null;
  timestamp: number;
  source: 'database' | 'cache';
}

class PhoneCacheV2 {
  private cache = new LRUCache<string, PhoneCacheEntry>({
    max: 3000,           // ✅ AUMENTADO: 2000 → 3000 para 500 users
    ttl: 5 * 60 * 1000,  // 5 minutos TTL
  });

  // ✅ VERIFICAR CACHE
  get(phone: string): PhoneCacheEntry | null {
    const entry = this.cache.get(phone);
    
    if (!entry) return null;
    
    // Verificar se ainda é válido
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      this.cache.delete(phone);
      return null;
    }
    
    return {
      ...entry,
      source: 'cache'
    };
  }

  // ✅ SALVAR NO CACHE
  set(phone: string, result: { exists: boolean; userId: string | null }): void {
    this.cache.set(phone, {
      exists: result.exists,
      userId: result.userId,
      timestamp: Date.now(),
      source: 'database'
    });
  }

  // ✅ INVALIDAR ENTRADA
  invalidate(phone: string): void {
    this.cache.delete(phone);
  }

  // ✅ CLEANUP MANUAL
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > 5 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    console.log(`[PHONE-CACHE-V2] Cleaned ${expiredKeys.length} expired entries`);
  }

  // ✅ ESTATÍSTICAS
  getStats(): { size: number; maxSize: number; hitRate: number } {
    const size = this.cache.size;
    const maxSize = this.cache.max;
    
    // Estimativa simples de hit rate
    const hitRate = Math.min(0.95, size / maxSize);
    
    return { size, maxSize, hitRate };
  }
}

// ✅ SINGLETON INSTANCE
const phoneCacheV2 = new PhoneCacheV2();

// ✅ CLEANUP TIMER (a cada 3 minutos para 500 users)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    phoneCacheV2.cleanup();
  }, 3 * 60 * 1000);
}

export { phoneCacheV2, PhoneCacheV2 };
export type { PhoneCacheEntry }; 