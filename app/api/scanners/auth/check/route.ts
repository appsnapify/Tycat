import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar token de autenticação
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ 
        error: 'Token de autorização necessário' 
      }, { status: 401 })
    }

    // Buscar sessão ativa do scanner
    const { data: session, error: sessionError } = await supabase
      .from('scanner_sessions')
      .select(`
        *,
        event_scanners(
          id,
          event_id,
          scanner_name,
          is_active,
          events(
            id,
            title,
            date,
            organization_id
          )
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

    // Verificar se o scanner ainda está ativo
    if (!session.event_scanners?.is_active) {
      return NextResponse.json({ 
        error: 'Scanner desativado' 
      }, { status: 403 })
    }

    // Atualizar última atividade da sessão
    await supabase
      .from('scanner_sessions')
      .update({ 
        last_activity: new Date().toISOString() 
      })
      .eq('id', session.id)

    // Formatar resposta
    const scannerData = {
      scanner: {
        id: session.event_scanners.id,
        event_id: session.event_scanners.event_id,
        scanner_name: session.event_scanners.scanner_name,
        is_active: session.event_scanners.is_active,
        events: session.event_scanners.events
      },
      event: session.event_scanners.events
    }

    return NextResponse.json(scannerData)

  } catch (error) {
    console.error('❌ Erro ao verificar sessão do scanner:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 