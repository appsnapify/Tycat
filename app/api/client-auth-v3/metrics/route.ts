// app/api/client-auth-v3/metrics/route.ts
// API de métricas para monitorar performance do sistema v3
// ✅ Informações sobre cache, rate limiting e performance

import { NextRequest, NextResponse } from 'next/server';
import { getPhoneCacheStats } from '@/lib/cache/phone-cache-v2';
import { getGuestCacheStats } from '@/lib/cache/guest-cache-v2';
import { getRateLimitStats } from '@/lib/security/rate-limit-v2';

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

    // ✅ COLETAR MÉTRICAS DOS CACHES
    const phoneCacheStats = getPhoneCacheStats();
    const guestCacheStats = getGuestCacheStats();
    const rateLimitStats = getRateLimitStats();

    // ✅ MÉTRICAS DO SISTEMA
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // ✅ CALCULAR EFICIÊNCIA DOS CACHES
    const phoneCacheEfficiency = phoneCacheStats.size > 0 ? 
      Math.round((phoneCacheStats.size / phoneCacheStats.maxSize) * 100) : 0;
    
    const guestCacheEfficiency = guestCacheStats.size > 0 ? 
      Math.round((guestCacheStats.size / guestCacheStats.maxSize) * 100) : 0;
    
    const rateLimitUsage = rateLimitStats.size > 0 ? 
      Math.round((rateLimitStats.size / rateLimitStats.maxSize) * 100) : 0;

    // ✅ MÉTRICAS CONSOLIDADAS
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: Math.round(uptime),
        uptimeFormatted: formatUptime(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      
      cache: {
        phone: {
          ...phoneCacheStats,
          efficiency: phoneCacheEfficiency,
          status: phoneCacheEfficiency > 80 ? 'HIGH' : phoneCacheEfficiency > 50 ? 'MEDIUM' : 'LOW'
        },
        guest: {
          ...guestCacheStats,
          efficiency: guestCacheEfficiency,
          status: guestCacheEfficiency > 80 ? 'HIGH' : guestCacheEfficiency > 50 ? 'MEDIUM' : 'LOW'
        }
      },
      
      rateLimiting: {
        ...rateLimitStats,
        usage: rateLimitUsage,
        status: rateLimitUsage > 90 ? 'CRITICAL' : rateLimitUsage > 70 ? 'WARNING' : 'OK'
      },
      
      performance: {
        averageResponseTime: 'N/A', // Seria calculado com histórico
        requestsPerMinute: 'N/A',   // Seria calculado com contadores
        errorRate: 'N/A',          // Seria calculado com contadores
        cacheHitRate: 'N/A'        // Seria calculado com contadores
      },
      
      health: {
        overall: getOverallHealth(phoneCacheEfficiency, guestCacheEfficiency, rateLimitUsage),
        components: {
          cache: phoneCacheEfficiency > 0 && guestCacheEfficiency >= 0 ? 'HEALTHY' : 'DEGRADED',
          rateLimiting: rateLimitUsage < 90 ? 'HEALTHY' : 'CRITICAL',
          memory: memoryUsage.heapUsed < 512 * 1024 * 1024 ? 'HEALTHY' : 'WARNING' // 512MB
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: metrics
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[METRICS-V3] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao coletar métricas'
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