import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID do utilizador é obrigatório' 
      }, { status: 400 });
    }

    console.log('Buscando eventos para utilizador:', userId);

    const supabase = createAdminClient();

    // Buscar eventos onde o utilizador está na guest list
    const { data: events, error } = await supabase
      .from('guests')
      .select(`
        id,
        event_id,
        qr_code_url,
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar eventos' 
      }, { status: 500 });
    }

    // Filtrar e formatar dados para o frontend
    const formattedEvents = events
      ?.filter(guest => guest.events && guest.events.is_active && guest.events.is_published)
      .map(guest => ({
        id: guest.id,
        event_id: guest.event_id,
        qr_code_url: guest.qr_code_url || '',
        title: guest.events.title,
        date: guest.events.date,
        location: guest.events.location || 'Local não definido',
        flyer_url: guest.events.flyer_url || '',
        description: guest.events.description || '',
        time: guest.events.time || ''
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

    console.log(`Encontrados ${formattedEvents.length} eventos para o utilizador`);

    return NextResponse.json({ 
      success: true, 
      events: formattedEvents 
    });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 