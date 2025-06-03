import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Parse dos dados do body
    const body = await request.json();
    const { event_id, client_user_id, name, phone } = body;

    // Validação dos dados obrigatórios
    if (!event_id || !client_user_id || !name || !phone) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados obrigatórios em falta: event_id, client_user_id, name, phone' 
        },
        { status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabase = createClient();

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone')
      .eq('id', client_user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário não encontrado' 
        },
        { status: 404 }
      );
    }

    // Verificar se o evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Evento não encontrado' 
        },
        { status: 404 }
      );
    }

    // Usar função create_guest_safely com source='ORGANIZATION'
    const { data: guestData, error: guestError } = await supabase
      .rpc('create_guest_safely', {
        p_event_id: event_id,
        p_client_user_id: client_user_id,
        p_promoter_id: null,      // ORGANIZAÇÃO: sem promoter
        p_team_id: null,          // ORGANIZAÇÃO: sem team
        p_name: name,
        p_phone: phone,
        p_source: 'ORGANIZATION'  // ← DIFERENÇA PRINCIPAL
      });

    if (guestError) {
      console.error('Erro ao criar guest:', guestError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Erro ao criar convidado: ${guestError.message}` 
        },
        { status: 500 }
      );
    }

    // Verificar se retornou dados
    if (!guestData || guestData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar convidado: nenhum dado retornado' 
        },
        { status: 500 }
      );
    }

    const guest = guestData[0];

    // Verificar se é guest existente ou novo
    const { data: existingGuest } = await supabase
      .from('guests')
      .select('created_at')
      .eq('id', guest.id)
      .single();

    const isExisting = existingGuest && 
      new Date(existingGuest.created_at).getTime() < (Date.now() - 5000); // 5 segundos de margem

    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        qr_code_url: guest.qr_code_url,
        event_title: event.title,
        user_name: `${user.first_name} ${user.last_name}`,
        source: 'ORGANIZATION'
      },
      isExisting,
      message: isExisting 
        ? 'Você já está na Guest List da Organização! Aqui está seu QR Code.'
        : 'Parabéns! Você foi adicionado à Guest List da Organização. Seu QR Code foi gerado com sucesso!'
    });

  } catch (error) {
    console.error('Erro interno na API organizador/guests/create:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 