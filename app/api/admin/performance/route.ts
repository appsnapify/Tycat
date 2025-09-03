// ✅ ENHANCED: Performance monitoring dashboard
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    const startTime = performance.now();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const timeWindow = parseInt(searchParams.get('timeWindow') || '24');
    
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // 1. System performance stats
    const { data: systemStats, error: systemError } = await supabase
      .rpc('get_system_performance_stats');
    
    // 2. Business metrics (se eventId fornecido)
    let businessMetrics = null;
    let businessError = null;
    
    if (eventId) {
      const { data, error } = await supabase
        .rpc('get_guest_business_metrics', {
          p_event_id: eventId,
          p_time_window_hours: timeWindow
        });
      businessMetrics = data;
      businessError = error;
    }
    
    // 3. Recent audit activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('guest_audit_log')
      .select('action, success, duration_ms, created_at, metadata')
      .gte('created_at', new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    
    const endTime = performance.now();
    const monitoringDuration = endTime - startTime;
    
    // Calculate performance insights
    const insights = {
      system_health: systemStats ? 'healthy' : 'unhealthy',
      connection_pressure: systemStats?.connection_usage_percent > 80 ? 'high' : 'normal',
      recent_activity_count: recentActivity?.length || 0,
      avg_response_time: businessMetrics?.avg_response_time_ms || null,
      conversion_health: businessMetrics?.conversion_rate_percent > 60 ? 'good' : 'needs_attention'
    };
    
    // Performance breakdown por action
    const performanceByAction = {};
    if (recentActivity) {
      const actionGroups = recentActivity.reduce((acc, item) => {
        if (!acc[item.action]) acc[item.action] = [];
        if (item.duration_ms) acc[item.action].push(item.duration_ms);
        return acc;
      }, {});
      
      Object.entries(actionGroups).forEach(([action, durations]) => {
        const times = durations as number[];
        if (times.length > 0) {
          performanceByAction[action] = {
            count: times.length,
            avg_ms: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100,
            min_ms: Math.min(...times),
            max_ms: Math.max(...times),
            p95_ms: Math.round(times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] * 100) / 100
          };
        }
      });
    }
    
    // ✅ ENHANCED LOGGING: Performance monitoring
    console.log('📊 PERFORMANCE MONITORING:', {
      timestamp: new Date().toISOString(),
      monitoring_duration_ms: Math.round(monitoringDuration * 100) / 100,
      system_health: insights.system_health,
      connection_usage: systemStats?.connection_usage_percent,
      recent_activity: insights.recent_activity_count,
      event_id: eventId
    });
    
    return NextResponse.json({
      system: {
        stats: systemStats,
        error: systemError?.message || null,
        insights
      },
      business: {
        metrics: businessMetrics,
        error: businessError?.message || null,
        event_id: eventId,
        time_window_hours: timeWindow
      },
      activity: {
        recent: recentActivity || [],
        error: activityError?.message || null,
        performance_by_action: performanceByAction
      },
      meta: {
        monitoring_duration_ms: Math.round(monitoringDuration * 100) / 100,
        timestamp: new Date().toISOString(),
        version: 'enhanced-9.5'
      }
    });
    
  } catch (error) {
    console.error('🚨 PERFORMANCE MONITORING FAILED:', error);
    
    return NextResponse.json({
      error: 'Performance monitoring failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
