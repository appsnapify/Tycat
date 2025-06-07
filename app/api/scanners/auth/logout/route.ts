import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // ✅ SUPORTE PARA MÚLTIPLOS FORMATOS DE TOKEN
    let token: string | null = null
    
    // Tentar extrair token do header Authorization primeiro
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      token = authHeader.replace('Bearer ', '')
    }
    
    // Se não houver header, tentar FormData (sendBeacon)
    if (!token) {
      try {
        const formData = await request.formData()
        token = formData.get('token') as string
      } catch (error) {
        // Se não for FormData, tentar JSON body
        try {
          const body = await request.json()
          token = body.token
        } catch (jsonError) {
          // Ignorar se não conseguir parsear
        }
      }
    }

    console.log('🔍 LOGOUT ATTEMPT:', { hasToken: !!token, method: authHeader ? 'header' : 'formdata' })

    if (!token) {
      return NextResponse.json({ 
        error: 'Token de sessão requerido' 
      }, { status: 401 })
    }

    // Buscar sessão ativa pelo token
    const { data: session, error: sessionError } = await supabase
      .from('scanner_sessions')
      .select('id, scanner_id, device_id')
      .eq('session_token', token)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      console.log('❌ Sessão não encontrada ou já inválida')
      return NextResponse.json({ 
        error: 'Sessão inválida' 
      }, { status: 401 })
    }

    console.log('🔍 SESSION FOUND:', { id: session.id, scanner_id: session.scanner_id })

    // Invalidar sessão
    const { error: logoutError } = await supabase
      .from('scanner_sessions')
      .update({ 
        status: 'logged_out',
        ended_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq('id', session.id)

    if (logoutError) {
      console.error('❌ Erro ao invalidar sessão:', logoutError)
      return NextResponse.json({ 
        error: 'Erro interno do servidor' 
      }, { status: 500 })
    }

    console.log('✅ LOGOUT SUCCESS for session:', session.id)
    
    return NextResponse.json({
      message: 'Logout realizado com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro no logout do scanner:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 