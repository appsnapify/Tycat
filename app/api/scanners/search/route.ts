import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ✅ FUNÇÃO AUXILIAR: Validar autenticação
function validateAuthentication(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new Error('Token de autorização necessário')
  }
  return token
}

// ✅ FUNÇÃO AUXILIAR: Validar sessão do scanner
async function validateScannerSession(supabase: any, token: string) {
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
    throw new Error('Sessão inválida')
  }

  return session
}

// ✅ FUNÇÃO AUXILIAR: Validar query de pesquisa
function validateSearchQuery(query: string) {
  if (!query || query.trim().length < 1) {
    throw new Error('Termo de pesquisa é obrigatório')
  }
  return query.trim().toLowerCase()
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 10 → <8)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { query } = body

    console.log('🔍 SEARCH REQUEST:', { query })

    const token = validateAuthentication(request)
    const session = await validateScannerSession(supabase, token)
    
    const event_id = session.event_scanners?.event_id
    if (!event_id) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 400 })
    }

    const searchTerm = validateSearchQuery(query)
    console.log('🔍 Pesquisando:', { event_id, searchTerm })

    // Primeiro, verificar quantos guests existem neste evento
    const { data: totalGuests, error: countError } = await supabase
      .from('guests')
      .select('id', { count: 'exact' })
      .eq('event_id', event_id)

    console.log('📊 Total guests no evento:', {
      count: totalGuests?.length || 0,
      error: countError
    })

    // Se for número, pesquisar também por telefone
    const isPhoneSearch = /^\d+$/.test(searchTerm)
    
    console.log('🔍 Tipo de pesquisa:', { isPhoneSearch, searchTerm })
    
    // Buscar guests primeiro
    let guestQuery = supabase
      .from('guests')
      .select('id, name, phone, checked_in, check_in_time, promoter_id')
      .eq('event_id', event_id)
    
    if (isPhoneSearch) {
      // Pesquisa por telefone ou nome
      guestQuery = guestQuery.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      console.log('📞 Pesquisando por telefone/nome:', `%${searchTerm}%`)
    } else {
      // Pesquisa por nome
      guestQuery = guestQuery.ilike('name', `%${searchTerm}%`)
      console.log('👤 Pesquisando por nome:', `%${searchTerm}%`)
    }

    const { data: guestResults, error } = await guestQuery
      .order('name')
      .limit(10)

    if (error) {
      console.error('❌ Erro na pesquisa de guests:', error)
      return NextResponse.json({ 
        error: 'Erro ao pesquisar convidados' 
      }, { status: 500 })
    }

    // Buscar promotores para os guests encontrados
    const promoterIds = [...new Set(guestResults?.map(g => g.promoter_id).filter(Boolean))]
    let promoters: any[] = []
    
    if (promoterIds.length > 0) {
      const { data: promoterData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', promoterIds)
      
      promoters = promoterData || []
    }

    // Combinar dados
    const guests = guestResults?.map(guest => {
      const promoter = promoters.find(p => p.id === guest.promoter_id)
      const promoter_name = promoter 
        ? `${promoter.first_name} ${promoter.last_name || ''}`.trim()
        : 'Sem promotor'
      
      return {
        ...guest,
        promoter_name
      }
    }) || []

    console.log('🔍 Query executada. Resultados:', {
      found: guests?.length || 0,
      sampleResults: guests?.slice(0, 3).map(g => ({ id: g.id, name: g.name, promoter: g.promoter_name }))
    })

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