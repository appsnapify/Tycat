import { NextRequest, NextResponse } from 'next/server'
import { createUserAdminClient } from '@/lib/user/supabase'
import { maskUserId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId é obrigatório'
      }, { status: 400 })
    }

    console.log('🔍 [USER-EVENTS] Buscando eventos para userId:', maskUserId(userId))

    const supabase = createUserAdminClient()

    // Buscar eventos onde o user é convidado (guest) - usando tabela 'guests' com client_user_id
    const { data: events, error } = await supabase
      .from('guests')
      .select(`
        id,
        event_id,
        qr_code_url,
        checked_in,
        check_in_time,
        events!inner (
          title,
          date,
          location,
          flyer_url,
          description,
          time,
          type
        )
      `)
      .eq('client_user_id', userId)
      .order('date', { foreignTable: 'events', ascending: false })

    if (error) {
      console.error('❌ [USER-EVENTS] Erro na query:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar eventos'
      }, { status: 500 })
    }

    // Transformar dados para o formato esperado
    const formattedEvents = events?.map(guest => ({
      id: guest.id,
      event_id: guest.event_id,
      qr_code_url: guest.qr_code_url,
      checked_in: guest.checked_in,
      check_in_time: guest.check_in_time,
      title: guest.events.title,
      date: guest.events.date,
      location: guest.events.location,
      flyer_url: guest.events.flyer_url,
      description: guest.events.description,
      time: guest.events.time,
      type: guest.events.type
    })) || []

    console.log(`✅ [USER-EVENTS] ${formattedEvents.length} eventos encontrados`)

    return NextResponse.json({
      success: true,
      events: formattedEvents
    })

  } catch (error) {
    console.error('❌ [USER-EVENTS] Erro geral:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 