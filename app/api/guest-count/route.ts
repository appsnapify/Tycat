import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase com service role para ter acesso completo
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    // Obter ID do evento da URL
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ 
        success: false,
        error: 'ID do evento é obrigatório' 
      }, { status: 400 });
    }
    
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`API GuestCount - Buscando contagem para evento: ${eventId}`);
    }
    
    // 1. Buscar total de convidados na tabela guests
    const { data: guestsData, error: guestsError, count: totalCount } = await supabaseAdmin
      .from('guests')
      .select('*', { count: 'exact', head: false })
      .eq('event_id', eventId);
    
    if (guestsError) {
      console.error(`API GuestCount - Erro ao buscar guests: ${guestsError.message}`);
      return NextResponse.json({ 
        success: false,
        error: guestsError.message 
      }, { status: 500 });
    }
    
    // 2. Buscar convidados com check-in
    const { data: checkedInData, error: checkedInError, count: checkedInCount } = await supabaseAdmin
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('checked_in', true);
    
    if (checkedInError) {
      console.error(`API GuestCount - Erro ao buscar checked in: ${checkedInError.message}`);
      return NextResponse.json({ 
        success: false,
        error: checkedInError.message 
      }, { status: 500 });
    }
    
    // Calcular manualmente a contagem, já que o Supabase às vezes não retorna count corretamente
    const total = totalCount ?? (guestsData?.length || 0);
    const checkedIn = checkedInCount ?? 0;
    
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`API GuestCount - Encontrados ${total} convidados para evento ${eventId}, com ${checkedIn} check-ins`);
    }
    
    // Retornar a contagem com cache de 5 minutos para otimizar performance
    return NextResponse.json(
      {
        success: true,
        count: total,
        checkedIn: checkedIn,
        timestamp: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutos de cache
          'Pragma': 'cache',
          'Expires': new Date(Date.now() + 5 * 60 * 1000).toUTCString(), // 5 minutos
        }
      }
    );
    
  } catch (error) {
    console.error('API GuestCount - Erro:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno no servidor' 
    }, { status: 500 });
  }
} 