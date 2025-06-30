import { NextResponse } from 'next/server';
import { getMetricsForAPI } from '@/lib/monitoring/cache-metrics';
import { getPhoneCacheStats } from '@/lib/cache/phone-cache';
import { getGuestCacheStats } from '@/lib/cache/guest-cache';

/**
 * API endpoint para exposição de métricas de cache
 * GET /api/metrics - Retorna estatísticas em tempo real
 */
export async function GET() {
  try {
    const baseMetrics = getMetricsForAPI();
    const phoneCacheStats = getPhoneCacheStats();
    const guestCacheStats = getGuestCacheStats();
    
    const response = {
      ...baseMetrics,
      cacheDetails: {
        phoneCache: {
          size: phoneCacheStats.size,
          maxSize: phoneCacheStats.max,
          ttl: `${phoneCacheStats.ttl / 1000}s`
        },
        guestCache: {
          size: guestCacheStats.size,
          maxSize: guestCacheStats.max,
          ttl: `${guestCacheStats.ttl / 1000}s`
        }
      },
      performance: {
        estimatedSpeedup: baseMetrics.metrics.phoneCache.hitRate !== '0.0%' 
          ? `~${(1 / (1 - parseFloat(baseMetrics.metrics.phoneCache.hitRate) / 100) - 1) * 100}% faster`
          : 'No data yet'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[METRICS-API] Erro ao obter métricas:', error);
    return NextResponse.json({
      status: 'error',
      error: 'Failed to retrieve metrics'
    }, { status: 500 });
  }
} 