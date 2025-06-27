import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: async (req: NextRequest, limit: number, token: string) => {
      const identifier = token || req.ip || 'anonymous';
      const tokenCount = (tokenCache.get(identifier) as number) || 0;
      
      if (tokenCount >= limit) {
        throw new Error('Rate limit exceeded');
      }
      
      tokenCache.set(identifier, tokenCount + 1);
      return Promise.resolve();
    },
  };
} 