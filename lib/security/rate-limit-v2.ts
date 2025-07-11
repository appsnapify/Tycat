// Sistema de Rate Limiting V2 - Otimizado para alta performance
import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const cache = new LRUCache<string, RateLimitEntry>({
  max: 10000,
  ttl: 1000 * 60 * 15 // 15 minutos
});

export function clearRateLimit() {
  cache.clear();
}

export function getRateLimitStats() {
  return {
    size: cache.size,
    maxSize: cache.max,
    hitRate: cache.calculatedSize / (cache.size || 1)
  };
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function createRateLimitResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString()
      }
    }
  );
} 