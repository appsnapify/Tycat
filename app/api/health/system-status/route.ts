// app/api/health/system-status/route.ts
// Monitoring básico para 500 users simultâneos
// Health check com métricas essenciais

import { NextRequest, NextResponse } from 'next/server';
import { phoneCacheV2 } from '@/lib/cache/phone-cache-v2';
import { getGuestCacheStats } from '@/lib/cache/guest-cache-v2';
import { getRateLimitStats } from '@/lib/security/rate-limit-v2';
import { createAdminClient } from '@/lib/supabase/adminClient';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Test database connection
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

function calculateEstimatedCapacity(phoneCacheStats: any, guestCacheStats: any, memoryUsage: any): number {
  const phoneCacheCapacity = (phoneCacheStats.maxSize - phoneCacheStats.size) * 0.5;
  const guestCacheCapacity = (guestCacheStats.maxSize - guestCacheStats.size) * 0.3;
  const memoryCapacityMB = (512 - (memoryUsage.heapUsed / 1024 / 1024)) * 2;

  const estimatedCapacity = Math.min(phoneCacheCapacity, guestCacheCapacity, memoryCapacityMB);
  return Math.max(100, Math.round(estimatedCapacity)); // Mínimo 100
}

function determineSystemStatus(metrics: any): { status: string; message: string } {
  if (metrics.memoryUtilizationMB > 450) {
    return { status: 'CRITICAL', message: 'Memory usage critical' };
  }
  
  if (metrics.phoneCacheUtilization > 90 || metrics.guestCacheUtilization > 90) {
    return { status: 'WARNING', message: 'Cache utilization high' };
  }
  
  if (metrics.estimatedCapacity < 200) {
    return { status: 'WARNING', message: 'Low capacity remaining' };
  }
  
  return { status: 'HEALTHY', message: 'System operating normally' };
}

function getRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.estimatedCapacity < 500) {
    recommendations.push('Consider implementing CDN for QR codes');
    recommendations.push('Evaluate database read replicas');
  }
  
  if (metrics.phoneCacheUtilization > 80) {
    recommendations.push('Phone cache nearing capacity');
  }
  
  if (metrics.memoryUtilizationMB > 400) {
    recommendations.push('Memory usage high - monitor for leaks');
  }
  
  return recommendations;
}

function getAlerts(metrics: any, systemStatus: any): string[] {
  const alerts: string[] = [];
  
  if (systemStatus.status === 'CRITICAL') {
    alerts.push('🚨 CRITICAL: Immediate action required');
  }
  
  if (metrics.estimatedCapacity < 200) {
    alerts.push('⚠️ WARNING: Capacity below 200 users');
  }
  
  return alerts;
} 