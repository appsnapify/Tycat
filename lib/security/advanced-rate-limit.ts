// Sistema de Rate Limiting e Circuit Breaker customizado

// ✅ RATE LIMITING AVANÇADO E GRANULAR
// Protege contra abuso mas não penaliza utilizadores legítimos
// Configuração conservadora para alta disponibilidade

/**
 * 🛡️ SISTEMA DE RATE LIMITING AVANÇADO 
 * Para proteger APIs críticas contra DDoS e alta afluência
 */

interface RateLimitConfig {
  windowMs: number;     // Janela de tempo em ms
  maxRequests: number;  // Máximo de requests por janela
  skipSuccessfulHits?: boolean; // Se deve contar apenas requests falhados
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Storage em memória para rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configs predefinidas para diferentes cenários
export const RATE_LIMIT_CONFIGS = {
  // Para APIs de guest creation (alto tráfego esperado)
  GUEST_CREATION: {
    windowMs: 60 * 1000,    // 1 minuto
    maxRequests: 20,        // 20 requests por minuto por IP
  },
  
  // Para verificação de telefone (muito alta frequência)
  PHONE_CHECK: {
    windowMs: 60 * 1000,    // 1 minuto  
    maxRequests: 30,        // 30 verificações por minuto por IP
  },
  
  // Para APIs críticas de admin
  ADMIN_OPERATIONS: {
    windowMs: 60 * 1000,    // 1 minuto
    maxRequests: 10,        // 10 operações por minuto por IP
  },
  
  // Proteção DDoS básica (muito agressiva)
  DDOS_PROTECTION: {
    windowMs: 10 * 1000,    // 10 segundos
    maxRequests: 5,         // 5 requests por 10s por IP
  }
} as const;

/**
 * Extrai IP do request de forma robusta
 */
function getClientIP(request: Request): string {
  // Tentar headers de proxy primeiro
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback para localhost em desenvolvimento
  return '127.0.0.1';
}

/**
 * Limpa entradas expiradas do storage
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Verifica se request deve ser rate limited
 */
export function checkRateLimit(
  request: Request, 
  config: RateLimitConfig,
  customKey?: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const ip = getClientIP(request);
  const key = customKey || `${ip}:${new URL(request.url).pathname}`;
  const now = Date.now();
  
  // Cleanup periódico (a cada 100 requests)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }
  
  let entry = rateLimitStore.get(key);
  
  // Se não existe entrada ou expirou, criar nova
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime
    };
  }
  
  // Incrementar contador
  entry.count++;
  
  // Verificar se excedeu limite
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Middleware para aplicar rate limiting facilmente
 */
export function withRateLimit(
  config: RateLimitConfig,
  customKey?: (request: Request) => string
) {
  return function(request: Request) {
    const key = customKey ? customKey(request) : undefined;
    const result = checkRateLimit(request, config, key);
    
    if (!result.allowed) {
      // Log de tentativa de rate limit
      console.warn(`[RATE_LIMIT] IP ${getClientIP(request)} excedeu limite:`, {
        path: new URL(request.url).pathname,
        retryAfter: result.retryAfter
      });
    }
    
    return result;
  };
}

/**
 * Headers para resposta HTTP
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
  return {
    'X-RateLimit-Limit': '20',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {})
  };
}

/**
 * Response de rate limit excedido
 */
export function createRateLimitResponse(result: ReturnType<typeof checkRateLimit>) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result)
      }
    }
  );
}











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