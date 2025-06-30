// ✅ SISTEMA DE MÉTRICAS BÁSICO PARA CACHE
// Monitoring simples sem dependências externas
// Permite acompanhar performance dos caches implementados

interface CacheMetrics {
  hits: number;
  misses: number;
  total: number;
  hitRate: number;
  lastReset: number;
}

interface SystemMetrics {
  phoneCache: CacheMetrics;
  guestCache: CacheMetrics;
  responseTime: {
    average: number;
    samples: number[];
    lastSample: number;
  };
}

// Estado global das métricas (em memória)
let metrics: SystemMetrics = {
  phoneCache: {
    hits: 0,
    misses: 0,
    total: 0,
    hitRate: 0,
    lastReset: Date.now()
  },
  guestCache: {
    hits: 0,
    misses: 0,
    total: 0,
    hitRate: 0,
    lastReset: Date.now()
  },
  responseTime: {
    average: 0,
    samples: [],
    lastSample: 0
  }
};

/**
 * Registra cache hit para telefones
 */
export const recordPhoneCacheHit = (): void => {
  metrics.phoneCache.hits++;
  metrics.phoneCache.total++;
  metrics.phoneCache.hitRate = metrics.phoneCache.hits / metrics.phoneCache.total;
};

/**
 * Registra cache miss para telefones
 */
export const recordPhoneCacheMiss = (): void => {
  metrics.phoneCache.misses++;
  metrics.phoneCache.total++;
  metrics.phoneCache.hitRate = metrics.phoneCache.hits / metrics.phoneCache.total;
};

/**
 * Registra cache hit para guests
 */
export const recordGuestCacheHit = (): void => {
  metrics.guestCache.hits++;
  metrics.guestCache.total++;
  metrics.guestCache.hitRate = metrics.guestCache.hits / metrics.guestCache.total;
};

/**
 * Registra cache miss para guests
 */
export const recordGuestCacheMiss = (): void => {
  metrics.guestCache.misses++;
  metrics.guestCache.total++;
  metrics.guestCache.hitRate = metrics.guestCache.hits / metrics.guestCache.total;
};

/**
 * Registra tempo de resposta de uma operação
 * @param timeMs - Tempo em milissegundos
 */
export const recordResponseTime = (timeMs: number): void => {
  metrics.responseTime.samples.push(timeMs);
  metrics.responseTime.lastSample = timeMs;
  
  // Manter apenas últimas 100 amostras
  if (metrics.responseTime.samples.length > 100) {
    metrics.responseTime.samples = metrics.responseTime.samples.slice(-100);
  }
  
  // Calcular média
  const sum = metrics.responseTime.samples.reduce((a, b) => a + b, 0);
  metrics.responseTime.average = sum / metrics.responseTime.samples.length;
};

/**
 * Obtém todas as métricas atuais
 */
export const getMetrics = (): SystemMetrics => {
  return { ...metrics };
};

/**
 * Obtém resumo das métricas em formato legível
 */
export const getMetricsSummary = () => {
  const now = Date.now();
  const uptime = now - metrics.phoneCache.lastReset;
  
  return {
    uptime: Math.round(uptime / 1000), // segundos
    phoneCache: {
      hitRate: `${(metrics.phoneCache.hitRate * 100).toFixed(1)}%`,
      total: metrics.phoneCache.total,
      hits: metrics.phoneCache.hits,
      misses: metrics.phoneCache.misses
    },
    guestCache: {
      hitRate: `${(metrics.guestCache.hitRate * 100).toFixed(1)}%`,
      total: metrics.guestCache.total,
      hits: metrics.guestCache.hits,
      misses: metrics.guestCache.misses
    },
    responseTime: {
      average: `${metrics.responseTime.average.toFixed(0)}ms`,
      last: `${metrics.responseTime.lastSample}ms`,
      samples: metrics.responseTime.samples.length
    }
  };
};

/**
 * Reset todas as métricas
 */
export const resetMetrics = (): void => {
  const now = Date.now();
  metrics = {
    phoneCache: {
      hits: 0,
      misses: 0,
      total: 0,
      hitRate: 0,
      lastReset: now
    },
    guestCache: {
      hits: 0,
      misses: 0,
      total: 0,
      hitRate: 0,
      lastReset: now
    },
    responseTime: {
      average: 0,
      samples: [],
      lastSample: 0
    }
  };
};

/**
 * Helper para medir tempo de execução de uma função
 * @param fn - Função a ser executada
 * @param label - Label para identificar a operação
 */
export const measureTime = async <T>(
  fn: () => Promise<T>, 
  label: string = 'operation'
): Promise<T> => {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    recordResponseTime(duration);
    console.log(`[METRICS] ${label}: ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[METRICS] ${label} failed after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * API endpoint para expor métricas (para monitoring)
 */
export const getMetricsForAPI = () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    metrics: getMetricsSummary()
  };
}; 