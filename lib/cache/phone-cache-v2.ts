// lib/cache/phone-cache-v2.ts
// Cache simples em memória para verificação de telefones
// Evita hits desnecessários na BD durante picos de tráfego

interface PhoneCacheEntry {
  exists: boolean;
  userId: string | null;
  timestamp: number;
}

class PhoneCacheV2 {
  private cache = new Map<string, PhoneCacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_ENTRIES = 2000; // Limite de memória

  // ✅ VERIFICAR CACHE
  get(phone: string): PhoneCacheEntry | null {
    const entry = this.cache.get(phone);
    
    if (!entry) return null;
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(phone);
      return null;
    }
    
    return entry;
  }

  // ✅ ADICIONAR AO CACHE
  set(phone: string, exists: boolean, userId: string | null = null): void {
    // Limpar cache se estiver muito grande
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }
    
    this.cache.set(phone, {
      exists,
      userId,
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

  // ✅ MÉTRICAS
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttlMs: this.TTL_MS
    };
  }

  // ✅ LIMPAR TUDO (para testes)
  clear(): void {
    this.cache.clear();
  }
}

// Singleton - uma instância para toda a aplicação
export const phoneCacheV2 = new PhoneCacheV2();

// Utilitários
export const getCachedPhoneVerification = (phone: string) => {
  return phoneCacheV2.get(phone);
};

export const setCachedPhoneVerification = (phone: string, exists: boolean, userId: string | null = null) => {
  phoneCacheV2.set(phone, exists, userId);
};

export const clearPhoneCache = () => {
  phoneCacheV2.clear();
};

export const getPhoneCacheStats = () => {
  return phoneCacheV2.getStats();
}; 