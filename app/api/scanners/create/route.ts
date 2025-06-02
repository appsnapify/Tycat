import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { event_id, scanner_name, username, password, max_concurrent_sessions = 1 } = body

    // Validar campos obrigatórios
    if (!event_id || !scanner_name || !username || !password) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: event_id, scanner_name, username, password' 
      }, { status: 400 })
    }

    // Verificação simplificada: apenas verificar se o evento existe e está ativo
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organization_id, title, is_active')
      .eq('id', event_id)
      .eq('is_active', true)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ 
        error: 'Evento não encontrado ou inativo' 
      }, { status: 404 })
    }

    // Para organizadores, assumimos que se eles conseguem acessar a página,
    // eles têm permissão para criar scanners (verificação será feita no middleware/RLS)
    
    // Verificar se o username já existe para este evento
    const { data: existingScanner, error: checkError } = await supabase
      .from('event_scanners')
      .select('id')
      .eq('event_id', event_id)
      .eq('username', username)
      .single()

    if (existingScanner) {
      return NextResponse.json({ 
        error: 'Username já existe para este evento' 
      }, { status: 409 })
    }

    // Hash da password
    const password_hash = await bcrypt.hash(password, 12)
    
    // Gerar access token único
    const access_token = nanoid(32)

    // Criar scanner
    const { data: scanner, error: createError } = await supabase
      .from('event_scanners')
      .insert({
        event_id,
        created_by: user.id,
        scanner_name,
        username,
        password_hash,
        access_token,
        max_concurrent_sessions
      })
      .select()
      .single()

    if (createError) {
      console.error('Erro ao criar scanner:', createError)
      return NextResponse.json({ 
        error: 'Erro interno do servidor' 
      }, { status: 500 })
    }

    // Retornar dados do scanner (sem password_hash)
    const { password_hash: _, ...scannerResponse } = scanner
    
    return NextResponse.json({
      message: 'Scanner criado com sucesso',
      scanner: scannerResponse
    })

  } catch (error) {
    console.error('Erro ao criar scanner:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 