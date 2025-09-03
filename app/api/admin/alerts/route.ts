// ✅ ENHANCED: Sistema alertas automático
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
  value?: number;
  threshold?: number;
}

export async function GET() {
  try {
    const startTime = performance.now();
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Check system health
    const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/guest/health`);
    const healthData = await healthResponse.json();
    
    const alerts: Alert[] = [];
    
    // 1. Connection usage alerts
    const connectionUsage = healthData.database?.performance?.connection_usage_percent || 0;
    if (connectionUsage > 95) {
      alerts.push({
        type: 'critical_connection_usage',
        severity: 'critical',
        message: `CRÍTICO: Uso de conexões em ${connectionUsage}%`,
        action: 'Escalar Supabase imediatamente',
        value: connectionUsage,
        threshold: 95
      });
    } else if (connectionUsage > 80) {
      alerts.push({
        type: 'high_connection_usage',
        severity: 'warning',
        message: `Alto uso de conexões: ${connectionUsage}%`,
        action: 'Monitor de perto, considerar scaling',
        value: connectionUsage,
        threshold: 80
      });
    }
    
    // 2. Performance alerts
    const responseTime = healthData.api?.response_time_ms || 0;
    if (responseTime > 100) {
      alerts.push({
        type: 'slow_response',
        severity: 'warning',
        message: `API lenta: ${responseTime}ms`,
        action: 'Verificar performance da database',
        value: responseTime,
        threshold: 100
      });
    }
    
    // 3. Database connectivity alerts
    if (!healthData.database?.connected) {
      alerts.push({
        type: 'database_disconnected',
        severity: 'critical',
        message: 'Database desconectada',
        action: 'Verificar conectividade Supabase urgente'
      });
    }
    
    // 4. Business metrics alerts (exemplo com evento específico)
    const businessMetrics = healthData.business_metrics?.data;
    if (businessMetrics) {
      const conversionRate = businessMetrics.conversion_rate_percent || 0;
      if (conversionRate < 40 && businessMetrics.total_attempts > 10) {
        alerts.push({
          type: 'low_conversion_rate',
          severity: 'warning',
          message: `Taxa de conversão baixa: ${conversionRate}%`,
          action: 'Analisar UX e performance do sistema',
          value: conversionRate,
          threshold: 40
        });
      }
      
      const abandonmentRate = businessMetrics.abandonment_rate_percent || 0;
      if (abandonmentRate > 60 && businessMetrics.total_attempts > 10) {
        alerts.push({
          type: 'high_abandonment',
          severity: 'warning',
          message: `Alto abandonment: ${abandonmentRate}%`,
          action: 'Otimizar fluxo de registo',
          value: abandonmentRate,
          threshold: 60
        });
      }
    }
    
    // 5. Active sessions monitoring
    const activeSessions = healthData.database?.performance?.active_sessions_last_hour || 0;
    if (activeSessions > 200) {
      alerts.push({
        type: 'high_activity',
        severity: 'info',
        message: `Alta atividade: ${activeSessions} sessões na última hora`,
        action: 'Monitor de perto durante evento',
        value: activeSessions,
        threshold: 200
      });
    }
    
    const endTime = performance.now();
    const alertingDuration = endTime - startTime;
    
    // ✅ ENHANCED LOGGING: Alert system metrics
    console.log('🚨 ALERT SYSTEM CHECK:', {
      timestamp: new Date().toISOString(),
      alerts_generated: alerts.length,
      alert_types: alerts.map(a => a.type),
      system_status: healthData.status,
      alerting_duration_ms: Math.round(alertingDuration * 100) / 100,
      connection_usage: connectionUsage,
      response_time: responseTime
    });
    
    return NextResponse.json({
      alerts,
      alert_count: alerts.length,
      system_status: healthData.status,
      summary: {
        critical_alerts: alerts.filter(a => a.severity === 'critical').length,
        warning_alerts: alerts.filter(a => a.severity === 'warning').length,
        info_alerts: alerts.filter(a => a.severity === 'info').length
      },
      system_health: {
        connection_usage_percent: connectionUsage,
        api_response_time_ms: responseTime,
        database_connected: healthData.database?.connected || false,
        active_sessions: activeSessions
      },
      performance: {
        alerting_duration_ms: Math.round(alertingDuration * 100) / 100
      },
      timestamp: new Date().toISOString(),
      version: 'enhanced-9.5'
    });
    
  } catch (error) {
    console.error('🚨 ALERT SYSTEM FAILED:', error);
    
    return NextResponse.json({
      alerts: [{ 
        type: 'alert_system_error', 
        severity: 'critical', 
        message: 'Sistema de alertas falhou',
        action: 'Verificar logs e conectividade'
      }],
      alert_count: 1,
      system_status: 'unhealthy',
      error: 'Alert system failure',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
