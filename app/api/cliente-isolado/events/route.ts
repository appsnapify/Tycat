import { NextRequest, NextResponse } from 'next/server'
import { createClienteIsoladoAdminClient } from '@/lib/cliente-isolado/supabase'
import { handleAuthError } from '@/lib/cliente-isolado/auth'

/**
 * API DE EVENTOS ISOLADA PARA SISTEMA CLIENTE
 * 
 * Características:
 * - Performance otimizada (< 150ms)
 * - Zero dependências de outros sistemas
 * - Acesso direto à base de dados
 * - Formatação otimizada para frontend
 */

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID do utilizador é obrigatório'
      }, { status: 400 })
    }

    console.log('🔥 [CLIENTE-ISOLADO-EVENTS] Buscando eventos para utilizador:', userId)

    // ✅ Cliente admin isolado - bypassa RLS
    const supabase = createClienteIsoladoAdminClient()

    // ✅ Buscar eventos onde utilizador está na guest list
    const { data: events, error } = await supabase
      .from('guests')
      .select(`
        id,
        event_id,
        qr_code_url,
        checked_in,
        check_in_time,
        created_at,
        events (
          id,
          title,
          description,
          date,
          time,
          location,
          flyer_url,
          is_active,
          is_published
        )
      `)
      .eq('client_user_id', userId)
      .not('events', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [CLIENTE-ISOLADO-EVENTS] Erro BD:', error)
      throw new Error(`Erro ao buscar eventos: ${error.message}`)
    }

    // ✅ Filtrar e formatar dados otimizados
    const formattedEvents = events
      ?.filter(guest => guest.events && guest.events.is_active && guest.events.is_published)
      .map(guest => ({
        // ✅ Dados do guest
        id: guest.id,
        event_id: guest.event_id,
        qr_code_url: guest.qr_code_url || '',
        checked_in: guest.checked_in || false,
        check_in_time: guest.check_in_time || null,
        guest_created_at: guest.created_at,
        
        // ✅ Dados do evento
        title: guest.events.title,
        description: guest.events.description || '',
        date: guest.events.date,
        time: guest.events.time || '',
        location: guest.events.location || 'Local não definido',
        flyer_url: guest.events.flyer_url || '',
        
        // ✅ Status derivado para frontend
        status: guest.checked_in ? 'checked_in' : 'registered',
        event_datetime: new Date(`${guest.events.date} ${guest.events.time || '00:00'}`).toISOString()
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || []

    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-EVENTS] ${formattedEvents.length} eventos encontrados em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      count: formattedEvents.length
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'cliente-isolado-v1'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    const authError = handleAuthError(error)
    
    console.error(`❌ [CLIENTE-ISOLADO-EVENTS] Erro após ${duration.toFixed(2)}ms:`, authError)

    return NextResponse.json({
      success: false,
      error: authError.message
    }, { 
      status: authError.statusCode,
      headers: {
        'X-Response-Time': duration.toFixed(2),
        'X-Error-Code': authError.code
      }
    })
  }
}

/**
 * Método POST para health check
 */
export async function POST() {
  return NextResponse.json({
    service: 'cliente-isolado-events',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v1.0'
  })
} 