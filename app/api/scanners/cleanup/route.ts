import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const results = {
      expired_sessions: 0,
      zombie_sessions: 0,
      total_cleaned: 0
    }
    
    // 1. Limpar sessões expiradas (expires_at no passado)
    const { count: expiredCount } = await supabase
      .from('scanner_sessions')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'active')
    
    results.expired_sessions = expiredCount || 0
    
    // ✅ FUNÇÃO AUXILIAR: Calcular tempo limite
    const calculateTimeLimit = () => new Date(Date.now() - 30 * 60 * 1000)
    
    // 2. Limpar sessões zombie (inativas há mais de 30 min)
    const thirtyMinutesAgo = calculateTimeLimit()
    const { count: zombieCount } = await supabase
      .from('scanner_sessions')
      .update({ status: 'zombie' })
      .lt('last_activity', thirtyMinutesAgo.toISOString())
      .eq('status', 'active')
    
    results.zombie_sessions = zombieCount || 0
    results.total_cleaned = results.expired_sessions + results.zombie_sessions
    
    return NextResponse.json({
      success: true,
      message: `Limpeza concluída: ${results.total_cleaned} sessões removidas`,
      details: results
    })
    
  } catch (error) {
    console.error('Erro na limpeza:', error)
    return NextResponse.json(
      { error: 'Erro interno durante limpeza' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { data: stats } = await supabase
      .from('scanner_sessions')
      .select('status, scanner_id, last_activity, expires_at')
    
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    
    const analysis = {
      total_sessions: stats?.length || 0,
      truly_active: stats?.filter(s => 
        s.status === 'active' && 
        new Date(s.last_activity) > fiveMinutesAgo &&
        new Date(s.expires_at) > now
      ).length || 0,
      expired_but_active: stats?.filter(s => 
        s.status === 'active' && 
        new Date(s.expires_at) <= now
      ).length || 0,
      zombie_sessions: stats?.filter(s => 
        s.status === 'active' && 
        new Date(s.last_activity) <= thirtyMinutesAgo
      ).length || 0,
      idle_sessions: stats?.filter(s => 
        s.status === 'active' && 
        new Date(s.last_activity) <= fiveMinutesAgo &&
        new Date(s.last_activity) > thirtyMinutesAgo
      ).length || 0
    }
    
    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
} 