import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const checks: Record<string, any> = {}
    
    // 1. Verificar conectividade com Supabase
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .limit(1)
      
      checks.database = {
        status: error ? 'error' : 'ok',
        message: error?.message || 'Conectividade OK'
      }
    } catch (error) {
      checks.database = {
        status: 'error',
        message: 'Falha na conectividade'
      }
    }

    // 2. Verificar sessões zombies (problemas de limpeza)
    try {
      const { data: zombieSessions } = await supabase
        .from('scanner_sessions')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())

      checks.session_cleanup = {
        status: (zombieSessions && zombieSessions.length > 10) ? 'warning' : 'ok',
        zombie_count: zombieSessions?.length || 0,
        message: `${zombieSessions?.length || 0} sessões zombie detectadas`
      }
    } catch (error) {
      checks.session_cleanup = {
        status: 'error',
        message: 'Erro ao verificar sessões'
      }
    }

    // 3. Verificar eventos próximos sem scanners
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const { data: eventsWithoutScanners } = await supabase
        .from('events')
        .select(`
          id, 
          title,
          event_scanners(id)
        `)
        .gte('date', new Date().toISOString())
        .lte('date', tomorrow.toISOString())

      const eventsNeedingScanners = eventsWithoutScanners?.filter(
        event => !event.event_scanners || event.event_scanners.length === 0
      ) || []

      checks.scanner_coverage = {
        status: eventsNeedingScanners.length > 0 ? 'warning' : 'ok',
        events_without_scanners: eventsNeedingScanners.length,
        message: `${eventsNeedingScanners.length} eventos próximos sem scanners configurados`
      }
    } catch (error) {
      checks.scanner_coverage = {
        status: 'error',
        message: 'Erro ao verificar cobertura de scanners'
      }
    }

    // 4. Verificar RLS policies essenciais
    try {
      // Tentar operação que requer RLS correto
      const { error: rlsTest } = await supabase
        .from('guests')
        .select('id')
        .limit(1)

      checks.rls_policies = {
        status: rlsTest ? 'warning' : 'ok',
        message: rlsTest ? 'Possível problema com RLS policies' : 'RLS policies funcionando'
      }
    } catch (error) {
      checks.rls_policies = {
        status: 'error',
        message: 'Erro ao verificar RLS policies'
      }
    }

    // Determinar status geral
    const hasErrors = Object.values(checks).some(check => check.status === 'error')
    const hasWarnings = Object.values(checks).some(check => check.status === 'warning')
    
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok'

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    })

  } catch (error) {
    console.error('❌ Erro no healthcheck:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Falha no healthcheck',
      checks: {}
    }, { status: 500 })
  }
} 