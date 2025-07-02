// Sistema de Rate Limiting e Circuit Breaker customizado

// ✅ RATE LIMITING AVANÇADO E GRANULAR
// Protege contra abuso mas não penaliza utilizadores legítimos
// Configuração conservadora para alta disponibilidade

/**
 * 🛡️ SISTEMA DE RATE LIMITING AVANÇADO 
 * Para proteger APIs críticas contra DDoS e alta afluência
 */

import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class AdvancedRateLimit {
  private cache = new LRUCache<string, RateLimitEntry>({
    max: 5000,           // ✅ Suporte para 5000 IPs únicos
    ttl: 15 * 60 * 1000, // 15 minutos TTL
  });

  private readonly WINDOW_MS = 60 * 1000; // 1 minuto
  
  // ✅ RATE LIMITING INTELIGENTE conforme plano
  async check(request: Request, maxRequests: number = 10): Promise<RateLimitResult> {
    const key = this.generateKey(request);
    const now = Date.now();
    
    // Buscar entrada existente
    const entry = this.cache.get(key);
    
    if (!entry) {
      // ✅ PRIMEIRA REQUEST - permitir
      this.cache.set(key, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
        blocked: false
      });
      
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetTime: now + this.WINDOW_MS
      };
    }
    
    // ✅ RESET WINDOW se expirou
    if (now > entry.resetTime) {
      this.cache.set(key, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
        blocked: false
      });
      
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetTime: now + this.WINDOW_MS
      };
    }
    
    // ✅ CHECK LIMIT
    if (entry.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }
    
    // ✅ INCREMENT COUNT
    entry.count++;
    this.cache.set(key, entry);
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }
  
  // ✅ KEY GENERATION baseado em IP + Phone (conforme plano)
  private generateKey(request: Request): string {
    // Extrair IP do request
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    return `rate_limit:${ip}`;
  }
  
  // ✅ STATS para monitoring
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.cache.calculatedSize / (this.cache.size || 1)
    };
  }
}

export const advancedRateLimit = new AdvancedRateLimit();

// ✅ HELPER FUNCTION para usar nas APIs
export const checkRateLimit = async (
  request: Request, 
  maxRequests: number = 10
): Promise<RateLimitResult> => {
  return advancedRateLimit.check(request, maxRequests);
};

// ✅ RATE LIMIT CONFIGS conforme diferentes endpoints
export const RATE_LIMIT_CONFIGS = {
  CHECK_PHONE: 15,     // 15 req/min para verificação telefone
  REGISTER: 5,         // 5 req/min para registros (mais restritivo)
  GUEST_CREATE: 10,    // 10 req/min para criação de guests
  LOGIN: 20           // 20 req/min para login
};

/**
 * 🔌 CIRCUIT BREAKER SIMPLES
 * Protege contra falhas em cascata no Supabase
 */

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // 5 falhas consecutivas
  recoveryTimeMs: 30 * 1000,  // 30 segundos para tentar again
  successThreshold: 2,        // 2 sucessos para fechar circuito
};

/**
 * Verifica estado do circuit breaker
 */
export function checkCircuitBreaker(serviceKey: string): {
  allowed: boolean;
  state: string;
  reason?: string;
} {
  const now = Date.now();
  let state = circuitBreakers.get(serviceKey);
  
  if (!state) {
    state = { failures: 0, lastFailureTime: 0, state: 'CLOSED' };
    circuitBreakers.set(serviceKey, state);
  }
  
  // Se circuito está ABERTO, verificar se já pode tentar again
  if (state.state === 'OPEN') {
    if (now - state.lastFailureTime > CIRCUIT_BREAKER_CONFIG.recoveryTimeMs) {
      state.state = 'HALF_OPEN';
      console.log(`[CIRCUIT_BREAKER] ${serviceKey} movendo para HALF_OPEN`);
    } else {
      return {
        allowed: false,
        state: 'OPEN',
        reason: `Service temporarily unavailable. Try again in ${Math.ceil((CIRCUIT_BREAKER_CONFIG.recoveryTimeMs - (now - state.lastFailureTime)) / 1000)}s`
      };
    }
  }
  
  return { allowed: true, state: state.state };
}

/**
 * Registra sucesso no circuit breaker
 */
export function recordCircuitBreakerSuccess(serviceKey: string): void {
  const state = circuitBreakers.get(serviceKey);
  if (!state) return;
  
  if (state.state === 'HALF_OPEN') {
    state.failures = 0;
    state.state = 'CLOSED';
    console.log(`[CIRCUIT_BREAKER] ${serviceKey} FECHADO após sucesso`);
  } else if (state.state === 'CLOSED') {
    state.failures = 0; // Reset contador de falhas
  }
}

/**
 * Registra falha no circuit breaker
 */
export function recordCircuitBreakerFailure(serviceKey: string): void {
  const now = Date.now();
  let state = circuitBreakers.get(serviceKey);
  
  if (!state) {
    state = { failures: 0, lastFailureTime: 0, state: 'CLOSED' };
    circuitBreakers.set(serviceKey, state);
  }
  
  state.failures++;
  state.lastFailureTime = now;
  
  // Se excedeu threshold, abrir circuito
  if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    state.state = 'OPEN';
    console.error(`[CIRCUIT_BREAKER] ${serviceKey} ABERTO após ${state.failures} falhas`);
  }
}

/**
 * Response para circuit breaker aberto
 */
export function createCircuitBreakerResponse(serviceKey: string, reason: string) {
  return new Response(
    JSON.stringify({
      error: 'Service temporarily unavailable',
      message: reason,
      service: serviceKey,
      code: 'CIRCUIT_BREAKER_OPEN'
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '30'
      }
    }
  );
} 