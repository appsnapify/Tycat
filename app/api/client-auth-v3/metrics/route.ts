// app/api/client-auth-v3/metrics/route.ts
// API de métricas para monitorar performance do sistema v3
// ✅ Informações sobre cache, rate limiting e performance

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsForAPI } from '@/lib/monitoring/cache-metrics';
import { phoneCacheV2 } from '@/lib/cache/phone-cache-v2';
import { guestCacheV2 } from '@/lib/cache/guest-cache-v2';

export async function GET(request: NextRequest) {
  try {
    // ✅ VERIFICAR SE É REQUEST AUTORIZADO (opcional)
    const authHeader = request.headers.get('authorization');
    const isDev = process.env.NODE_ENV === 'development';
    const isAuthorized = isDev || authHeader === `Bearer ${process.env.METRICS_API_KEY}`;

    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Acesso negado'
      }, { status: 401 });
    }

    const baseMetrics = getMetricsForAPI();
    const phoneCacheStats = phoneCacheV2.getStats();
    const guestCacheStats = guestCacheV2.getStats();
    
    const response = {
      ...baseMetrics,
      cacheDetails: {
        phoneCache: {
          size: phoneCacheStats.size,
          maxSize: phoneCacheStats.maxSize,
          hitRate: phoneCacheStats.hitRate
        },
        guestCache: {
          size: guestCacheStats.size,
          maxSize: guestCacheStats.maxSize,
          hitRate: guestCacheStats.hitRate
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

// ✅ UTILITÁRIOS
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function getOverallHealth(phoneCache: number, guestCache: number, rateLimit: number): string {
  if (rateLimit > 90) return 'CRITICAL';
  if (phoneCache === 0 && guestCache === 0) return 'DEGRADED';
  if (rateLimit > 70) return 'WARNING';
  return 'HEALTHY';
}

// ✅ MÉTODO PARA RESET DE CACHES (desenvolvimento)
export async function DELETE(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      return NextResponse.json({
        success: false,
        error: 'Operação permitida apenas em desenvolvimento'
      }, { status: 403 });
    }

    // ✅ LIMPAR TODOS OS CACHES
    const { clearPhoneCache } = await import('@/lib/cache/phone-cache-v2');
    const { clearGuestCache } = await import('@/lib/cache/guest-cache-v2');
    const { clearRateLimit } = await import('@/lib/security/rate-limit-v2');
    
    clearPhoneCache();
    clearGuestCache();
    clearRateLimit();

    return NextResponse.json({
      success: true,
      message: 'Todos os caches foram limpos'
    });

  } catch (error) {
    console.error('[METRICS-V3] Erro ao limpar caches:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao limpar caches'
    }, { status: 500 });
  }
} 