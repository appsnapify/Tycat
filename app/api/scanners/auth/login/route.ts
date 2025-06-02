import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    const { username, password, device_info } = body

    console.log('🔍 LOGIN ATTEMPT:', { username, password: password ? '***' : 'MISSING' })

    // Validar campos obrigatórios
    if (!username || !password) {
      console.log('❌ Missing credentials')
      return NextResponse.json({ 
        error: 'Campos obrigatórios: username, password' 
      }, { status: 400 })
    }

    // Buscar scanner por username (sem precisar de event_id)
    const { data: scanner, error: scannerError } = await supabase
      .from('event_scanners')
      .select(`
        *,
        events(id, title, date, organization_id)
      `)
      .eq('username', username)
      .eq('is_active', true)
      .single()

    console.log('🔍 SCANNER QUERY:', { found: !!scanner, error: scannerError })

    if (scannerError || !scanner) {
      console.log('❌ Scanner não encontrado:', scannerError)
      return NextResponse.json({ 
        error: 'Credenciais inválidas' 
      }, { status: 401 })
    }

    // Verificar password
    console.log('🔍 PASSWORD CHECK:', { 
      provided: password, 
      hash: scanner.password_hash,
      hashLength: scanner.password_hash?.length 
    })
    
    const isValidPassword = await bcrypt.compare(password, scanner.password_hash)
    console.log('🔍 PASSWORD RESULT:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Password inválida')
      return NextResponse.json({ 
        error: 'Credenciais inválidas' 
      }, { status: 401 })
    }

    // Verificar se já existem sessões ativas e limite
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('scanner_sessions')
      .select('id')
      .eq('scanner_id', scanner.id)
      .eq('status', 'active')

    console.log('🔍 ACTIVE SESSIONS:', { count: activeSessions?.length || 0, limit: scanner.max_concurrent_sessions })

    if (sessionsError) {
      console.error('Erro ao verificar sessões:', sessionsError)
    }

    // Permitir apenas uma sessão ativa por scanner (simplificado)
    if (activeSessions && activeSessions.length >= scanner.max_concurrent_sessions) {
      console.log('❌ Session limit exceeded')
      return NextResponse.json({ 
        error: 'Limite de sessões ativas excedido' 
      }, { status: 429 })
    }

    // Gerar token de sessão
    const session_token = nanoid(48)
    const device_id = device_info?.id || nanoid(16)

    console.log('🔍 CREATING SESSION:', { scanner_id: scanner.id, event_id: scanner.event_id })

    // Criar sessão com estrutura correta da tabela
    const { data: session, error: sessionError } = await supabase
      .from('scanner_sessions')
      .insert({
        scanner_id: scanner.id,
        event_id: scanner.event_id, // Requerido pela estrutura da tabela
        session_token,
        device_id,
        device_info: device_info || {},
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1',
        status: 'active',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        total_scans: 0,
        successful_scans: 0,
        failed_scans: 0
      })
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Erro ao criar sessão:', sessionError)
      return NextResponse.json({ 
        error: 'Erro interno do servidor: ' + sessionError.message 
      }, { status: 500 })
    }

    console.log('✅ SESSION CREATED:', session.id)

    // Atualizar última atividade do scanner
    await supabase
      .from('event_scanners')
      .update({ 
        last_activity: new Date().toISOString(),
        device_info: device_info || {}
      })
      .eq('id', scanner.id)

    // Retornar dados da sessão (sem password_hash)
    const { password_hash, access_token, ...scannerData } = scanner
    
    console.log('✅ LOGIN SUCCESS for:', username)
    
    return NextResponse.json({
      message: 'Login realizado com sucesso',
      session_token: session.session_token,
      scanner: scannerData,
      event: scanner.events
    })

  } catch (error) {
    console.error('❌ Erro no login do scanner:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 