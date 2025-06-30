// lib/security/rate-limit-v2.ts
// Rate limiting simples em memória
// Protege contra abuso durante picos de tráfego

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;  // Janela de tempo em ms
  maxRequests: number;  // Máximo de requests na janela
  keyPrefix?: string;   // Prefixo para identificar tipo de limite
}

class RateLimiterV2 {
  private cache = new Map<string, RateLimitEntry>();
  private readonly MAX_ENTRIES = 10000; // Limite de memória
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

  constructor() {
    // Limpeza automática periódica
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  // ✅ VERIFICAR SE REQUEST É PERMITIDO
  isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    
    // Limpar cache se muito grande
    if (this.cache.size > this.MAX_ENTRIES) {
      this.cleanup();
    }

    let entry = this.cache.get(fullKey);

    // Se não existe ou janela expirou, criar nova
    if (!entry || (now - entry.windowStart) >= config.windowMs) {
      entry = {
        count: 1,
        windowStart: now
      };
      this.cache.set(fullKey, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    // Incrementar contador
    entry.count++;

    // Verificar se excedeu limite
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetTime = entry.windowStart + config.windowMs;

    return {
      allowed,
      remaining,
      resetTime
    };
  }

  // ✅ LIMPEZA AUTOMÁTICA
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      // Usar a maior janela possível (1 hora) para limpeza
      if ((now - entry.windowStart) > (60 * 60 * 1000)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // Se ainda muito grande, remover 30% das mais antigas
    if (this.cache.size > this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].windowStart - b[1].windowStart);
      
      const toRemove = Math.floor(entries.length * 0.3);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  // ✅ MÉTRICAS
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES
    };
  }

  // ✅ LIMPAR TUDO
  clear(): void {
    this.cache.clear();
  }
}

// Singleton
export const rateLimiterV2 = new RateLimiterV2();

// ✅ CONFIGURAÇÕES PRÉ-DEFINIDAS
export const RATE_LIMIT_CONFIGS = {
  PHONE_CHECK: {
    windowMs: 60 * 1000,     // 1 minuto
    maxRequests: 5,          // 5 verificações por minuto
    keyPrefix: 'phone'
  },
  GUEST_CREATE: {
    windowMs: 60 * 1000,     // 1 minuto  
    maxRequests: 3,          // 3 criações por minuto
    keyPrefix: 'guest'
  },
  GENERAL: {
    windowMs: 60 * 1000,     // 1 minuto
    maxRequests: 30,         // 30 requests gerais por minuto
    keyPrefix: 'general'
  }
} as const;

// ✅ UTILITÁRIOS
export const checkRateLimit = (key: string, config: RateLimitConfig) => {
  return rateLimiterV2.isAllowed(key, config);
};

export const getRateLimitStats = () => {
  return rateLimiterV2.getStats();
};

export const clearRateLimit = () => {
  rateLimiterV2.clear();
};

// ✅ HELPER PARA USAR COM IP + IDENTIFICADOR
export const createRateLimitKey = (ip: string, identifier?: string) => {
  return identifier ? `${ip}:${identifier}` : ip;
}; 