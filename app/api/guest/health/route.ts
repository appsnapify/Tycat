// ✅ ENHANCED MONITORING: System health + alerting
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export async function GET() {
  try {
    const startTime = performance.now();
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Test database connectivity + performance
    const { data: healthCheck, error: healthError } = await supabase
      .rpc('get_system_performance_stats');
    
    // Test business metrics function
    const { data: businessCheck, error: businessError } = await supabase
      .rpc('get_guest_business_metrics', { 
        p_event_id: '985280fa-b0fb-4f7d-aa16-ecbbdadd554a', // Event real para teste
        p_time_window_hours: 1 
      });
    
    const endTime = performance.now();
    const totalResponseTime = endTime - startTime;
    
    // Determine overall health
    const isHealthy = !healthError && !businessError && totalResponseTime < 100;
    const connectionUsage = healthCheck?.connection_usage_percent || 0;
    const needsAttention = connectionUsage > 80 || totalResponseTime > 50;
    
    const healthStatus = {
      status: isHealthy ? (needsAttention ? 'warning' : 'healthy') : 'unhealthy',
      database: {
        connected: !healthError,
        performance: healthCheck || null,
        error: healthError?.message || null
      },
      business_metrics: {
        available: !businessError,
        data: businessCheck || null,
        error: businessError?.message || null
      },
      api: {
        response_time_ms: Math.round(totalResponseTime * 100) / 100,
        performance_grade: totalResponseTime < 25 ? 'excellent' : 
                          totalResponseTime < 50 ? 'good' : 
                          totalResponseTime < 100 ? 'warning' : 'critical'
      },
      alerts: {
        high_connection_usage: connectionUsage > 80,
        slow_response: totalResponseTime > 50,
        database_error: !!healthError,
        business_metrics_error: !!businessError
      },
      timestamp: new Date().toISOString(),
      version: 'enhanced-9.5'
    };
    
    // ✅ ENHANCED LOGGING: Health check results
    console.log('🏥 HEALTH CHECK:', {
      status: healthStatus.status,
      response_time: Math.round(totalResponseTime * 100) / 100,
      connection_usage: connectionUsage,
      alerts_count: Object.values(healthStatus.alerts).filter(Boolean).length
    });
    
    return NextResponse.json(healthStatus, {
      status: isHealthy ? 200 : 503
    });
    
  } catch (error) {
    console.error('🚨 HEALTH CHECK FAILED:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'System health check failed',
      timestamp: new Date().toISOString(),
      version: 'enhanced-9.5'
    }, { status: 503 });
  }
}
