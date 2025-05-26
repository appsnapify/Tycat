import { LRUCache } from 'lru-cache';

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
    check: async (token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
        return Promise.resolve();
      }
      
      tokenCount[0] += 1;
      const currentCount = tokenCount[0];
      
      tokenCache.set(token, tokenCount);

      if (currentCount > 5) { // Máximo de 5 requisições por intervalo
        return Promise.reject();
      }

      return Promise.resolve();
    },
  };
} 