import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Forçar rota dinâmica para evitar cache
export const dynamic = 'force-dynamic'
export const runtime = 'edge' // Opcional: usar edge runtime para melhor performance

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar token de autenticação
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log('❌ Token não fornecido')
      return NextResponse.json({ 
        error: 'Token de autorização necessário' 
      }, { status: 401 })
    }

    console.log('🔍 Buscando sessão para token:', token ? '***' : null)

    // Buscar sessão ativa do scanner
    const { data: session, error: sessionError } = await supabase
      .from('scanner_sessions')
      .select(`
        id,
        status,
        created_at,
        expires_at,
        event_scanners!inner(
          id,
          event_id,
          scanner_name,
          is_active
        )
      `)
      .eq('session_token', token)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      console.log('❌ Sessão inválida:', sessionError)
      return NextResponse.json({ 
        error: 'Sessão inválida' 
      }, { status: 401 })
    }

    // Verificar se o scanner está ativo
    if (!session.event_scanners?.is_active) {
      console.log('❌ Scanner inativo')
      return NextResponse.json({ 
        error: 'Scanner inativo' 
      }, { status: 403 })
    }

    const event_id = session.event_scanners?.event_id
    if (!event_id) {
      console.log('❌ Evento não encontrado')
      return NextResponse.json({ 
        error: 'Evento não encontrado' 
      }, { status: 400 })
    }

    console.log('📊 Buscando stats para evento:', event_id)

    // Buscar total de convidados e check-ins do evento
    const { data: stats, error: statsError } = await supabase
      .from('guests')
      .select('id, checked_in', { count: 'exact' })
      .eq('event_id', event_id)

    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError)
      return NextResponse.json({ 
        error: 'Erro ao buscar estatísticas' 
      }, { status: 500 })
    }

    // Garantir que stats é um array
    const guestArray = Array.isArray(stats) ? stats : []
    
    // Calcular totais
    const total = guestArray.length
    const checkedIn = guestArray.filter(guest => guest.checked_in).length

    console.log('📊 Stats calculadas:', { total, checkedIn })

    // 🧹 LIMPEZA PREVENTIVA: Remover sessões expiradas automaticamente
    const cleanupResult = await supabase
      .from('scanner_sessions')
      .update({ status: 'expired' })
      .eq('scanner_id', session.event_scanners?.id)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    if (cleanupResult.count && cleanupResult.count > 0) {
      console.log(`🧹 Limpeza preventiva: ${cleanupResult.count} sessões expiradas removidas`)
    }

    // ⏰ EXTENSÃO AUTOMÁTICA: Estender sessão se está próxima do fim
    const sessionExpiresAt = new Date(session.expires_at || session.created_at)
    const now = new Date()
    const hoursUntilExpiry = (sessionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    let sessionUpdate: any = { 
      last_activity: new Date().toISOString() 
    }

    // Se a sessão expira em menos de 2 horas, estender por mais 24h
    if (hoursUntilExpiry < 2) {
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      sessionUpdate.expires_at = newExpiresAt.toISOString()
      console.log('⏰ Sessão estendida automaticamente até:', newExpiresAt.toISOString())
    }

    // Atualizar última atividade (e possivelmente estender sessão)
    const { error: updateError } = await supabase
      .from('scanner_sessions')
      .update(sessionUpdate)
      .eq('id', session.id)

    if (updateError) {
      console.error('⚠️ Erro ao atualizar sessão (não crítico):', updateError)
    }

    return NextResponse.json({
      success: true,
      count: total,
      checkedIn: checkedIn
    })

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 