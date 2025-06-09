import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')
    
    if (!eventId) {
      return NextResponse.json({
        error: 'event_id é obrigatório'
      }, { status: 400 })
    }

    // Buscar guests do evento
    const { data: guests, error } = await supabase
      .from('guests')
      .select('id, name, phone, checked_in')
      .eq('event_id', eventId)
      .order('name')
      .limit(20)

    if (error) {
      console.error('❌ Erro ao buscar guests:', error)
      return NextResponse.json({
        error: 'Erro ao buscar guests',
        details: error
      }, { status: 500 })
    }

    // Estatísticas
    const total = guests?.length || 0
    const checkedIn = guests?.filter(g => g.checked_in).length || 0

    return NextResponse.json({
      success: true,
      event_id: eventId,
      stats: {
        total,
        checkedIn,
        notCheckedIn: total - checkedIn
      },
      sampleGuests: guests?.slice(0, 10).map(g => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        checked_in: g.checked_in
      })) || [],
      allGuestNames: guests?.map(g => g.name) || []
    })

  } catch (error) {
    console.error('❌ Erro na API debug:', error)
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 