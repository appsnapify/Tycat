import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    const { query } = body

    console.log('🔍 SEARCH REQUEST:', { query })

    // Verificar autenticação do scanner
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
        event_scanners(event_id, scanner_name)
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

    const event_id = session.event_scanners?.event_id
    if (!event_id) {
      return NextResponse.json({ 
        error: 'Evento não encontrado' 
      }, { status: 400 })
    }

    // Validar query
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Termo de pesquisa deve ter pelo menos 2 caracteres' 
      }, { status: 400 })
    }

    const searchTerm = query.trim().toLowerCase()
    console.log('🔍 Pesquisando:', { event_id, searchTerm })

    // Pesquisa por nome (usando ILIKE para case-insensitive)
    let searchQuery = supabase
      .from('guests')
      .select('id, name, phone, checked_in, checked_in_at')
      .eq('event_id', event_id)

    // Se for número, pesquisar também por telefone
    const isPhoneSearch = /^\d+$/.test(searchTerm)
    
    if (isPhoneSearch) {
      // Pesquisa por telefone
      searchQuery = searchQuery.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    } else {
      // Pesquisa por nome
      searchQuery = searchQuery.ilike('name', `%${searchTerm}%`)
    }

    const { data: guests, error } = await searchQuery
      .order('name')
      .limit(10)

    if (error) {
      console.error('❌ Erro na pesquisa:', error)
      return NextResponse.json({ 
        error: 'Erro ao pesquisar convidados' 
      }, { status: 500 })
    }

    // Calcular relevância e ordenar
    const results = guests?.map(guest => {
      let relevance_score = 0
      const guestName = guest.name.toLowerCase()
      const guestPhone = guest.phone.replace(/\D/g, '')
      
      // Pontuação por correspondência exata
      if (guestName === searchTerm) relevance_score += 100
      else if (guestName.startsWith(searchTerm)) relevance_score += 80
      else if (guestName.includes(searchTerm)) relevance_score += 60
      
      // Pontuação por telefone
      if (isPhoneSearch && guestPhone.includes(searchTerm)) {
        relevance_score += 50
      }
      
      return {
        ...guest,
        relevance_score
      }
    }).sort((a, b) => b.relevance_score - a.relevance_score) || []

    console.log('🔍 SEARCH RESULTS:', { 
      query: searchTerm, 
      found: results.length,
      isPhoneSearch 
    })

    // Atualizar última atividade da sessão
    await supabase
      .from('scanner_sessions')
      .update({ 
        last_activity: new Date().toISOString() 
      })
      .eq('id', session.id)

    return NextResponse.json({
      results,
      total: results.length,
      query: searchTerm,
      event_id
    })

  } catch (error) {
    console.error('❌ Erro na pesquisa:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 