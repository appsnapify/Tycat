import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    console.log('🧹 Iniciando limpeza automática de scanners...')

    // 1. Identificar scanners para limpeza usando a função SQL
    const { data: expiredScanners, error: queryError } = await supabase
      .rpc('cleanup_expired_scanners')

    if (queryError) {
      console.error('❌ Erro ao buscar scanners expirados:', queryError)
      return NextResponse.json({ 
        error: 'Erro ao identificar scanners para limpeza',
        details: queryError.message 
      }, { status: 500 })
    }

    console.log(`📊 Encontrados ${expiredScanners?.length || 0} scanners para limpeza:`)
    expiredScanners?.forEach(scanner => {
      console.log(`- Scanner "${scanner.username}" do evento "${scanner.event_title}" (${scanner.hours_since_ended}h ago)`)
    })

    if (!expiredScanners || expiredScanners.length === 0) {
      console.log('✅ Nenhum scanner precisa ser limpo')
      return NextResponse.json({
        message: 'Nenhum scanner encontrado para limpeza',
        cleaned: 0,
        details: []
      })
    }

    const scannerIds = expiredScanners.map(s => s.scanner_id)
    
    // 2. Primeiro, expirar todas as sessões ativas (preservar logs)
    console.log('🔄 Expirando sessões ativas...')
    const { data: expiredSessions, error: sessionError } = await supabase
      .from('scanner_sessions')
      .update({ 
        status: 'expired_by_cleanup',
        end_time: new Date().toISOString()
      })
      .in('scanner_id', scannerIds)
      .eq('status', 'active')
      .select('id')

    if (sessionError) {
      console.warn('⚠️ Erro ao expirar sessões (continuando):', sessionError)
    } else {
      console.log(`✅ ${expiredSessions?.length || 0} sessões expiradas`)
    }

    // 3. Hard delete dos scanners (trigger preservará info nos logs)
    console.log('🗑️ Removendo scanners expirados...')
    const { data: deletedScanners, error: deleteError } = await supabase
      .from('event_scanners')
      .delete()
      .in('id', scannerIds)
      .select('id, username, scanner_name')

    if (deleteError) {
      console.error('❌ Erro ao remover scanners:', deleteError)
      return NextResponse.json({ 
        error: 'Erro ao remover scanners',
        details: deleteError.message,
        expired_sessions: expiredSessions?.length || 0
      }, { status: 500 })
    }

    console.log(`✅ ${deletedScanners?.length || 0} scanners removidos com sucesso`)

    // 4. Log da operação para auditoria
    const cleanupLog = {
      timestamp: new Date().toISOString(),
      operation: 'auto_cleanup_scanners_48h',
      scanners_cleaned: deletedScanners?.length || 0,
      sessions_expired: expiredSessions?.length || 0,
      details: expiredScanners.map(s => ({
        username: s.username,
        event_title: s.event_title,
        hours_since_ended: s.hours_since_ended
      }))
    }

    console.log('📝 Log da limpeza:', cleanupLog)

    return NextResponse.json({
      message: `Limpeza concluída: ${deletedScanners?.length || 0} scanners removidos`,
      cleaned: deletedScanners?.length || 0,
      sessions_expired: expiredSessions?.length || 0,
      details: cleanupLog.details
    })

  } catch (error) {
    console.error('❌ Erro geral na limpeza:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 