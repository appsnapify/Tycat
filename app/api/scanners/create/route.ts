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
    
    // ✅ VALIDAÇÃO INTELIGENTE DE USERNAME (considera eventos terminados há 48h)
    const { data: conflictingScanners, error: checkError } = await supabase
      .from('event_scanners')
      .select(`
        id, 
        username,
        scanner_name,
        event_id,
        events!inner(
          title, 
          date, 
          end_date, 
          end_time,
          is_active
        )
      `)
      .eq('username', username)
      .eq('is_active', true)

    if (checkError) {
      console.error('Erro ao verificar username:', checkError)
      return NextResponse.json({ 
        error: 'Erro ao verificar disponibilidade do username' 
      }, { status: 500 })
    }

    // Verificar se há conflito real (eventos ainda ativos ou terminados há menos de 48h)
    const activeConflicts = conflictingScanners?.filter(scanner => {
      const event = scanner.events
      if (!event.end_date || !event.end_time) return true // Sem data fim = assumir ativo
      
      const eventEndDate = new Date(`${event.end_date}T${event.end_time}`)
      const now = new Date()
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
      

      
      // Conflito APENAS se evento terminou há menos de 48h
      return eventEndDate > fortyEightHoursAgo
    })

    if (activeConflicts && activeConflicts.length > 0) {
      const conflict = activeConflicts[0]
      let details = ''
      
      if (conflict.events.end_date && conflict.events.end_time) {
        const eventEndDate = new Date(`${conflict.events.end_date}T${conflict.events.end_time}`)
        const now = new Date()
        const hoursAgo = Math.round((now.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60))
        

        
        if (hoursAgo > 0) {
          const hoursRemaining = 48 - hoursAgo
          details = `Em uso no evento "${conflict.events.title}" (terminou há ${hoursAgo}h, libera em ${hoursRemaining}h)`
        } else {
          details = `Em uso no evento ativo "${conflict.events.title}"`
        }
      } else {
        details = `Em uso no evento ativo "${conflict.events.title}"`
      }

      return NextResponse.json({ 
        error: "Username em uso, tente outro"
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