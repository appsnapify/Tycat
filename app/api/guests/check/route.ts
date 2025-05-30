import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Função auxiliar para validar UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

// Função simples para validar telefone
function isValidPhone(phone: string): boolean {
  // Remove espaços e caracteres especiais
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  // Verifica se tem entre 8 e 15 dígitos (padrão internacional)
  return /^\+?[1-9]\d{7,14}$/.test(cleanPhone);
}

export async function POST(request: Request) {
  try {
    const { phone, eventId, promoterId, teamId } = await request.json();
    console.log('[DEBUG] Check - Dados recebidos:', { phone, eventId, promoterId, teamId });

    // Validação dos campos obrigatórios
    if (!phone || !eventId) {
      return NextResponse.json(
        { message: 'Telefone e ID do evento são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação do formato do telefone
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { message: 'Formato de telefone inválido' },
        { status: 400 }
      );
    }

    // Validação de UUIDs se fornecidos
    if (eventId && !isValidUUID(eventId)) {
      return NextResponse.json(
        { message: 'ID do evento inválido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar se o telefone já está registrado para este evento
    console.log('[DEBUG] Verificando registro existente:', { phone, eventId });
    const { data: existingGuest, error: guestError } = await supabase
      .from('guests')
      .select('id, status')
      .eq('phone', phone)
      .eq('event_id', eventId)
      .maybeSingle();

    if (guestError) {
      console.error('[ERROR] Erro ao verificar registro:', guestError);
      return NextResponse.json(
        { message: 'Erro ao verificar registro' },
        { status: 500 }
      );
    }

    // Verificação simplificada se é promotor do evento
    let isEventPromoter = false;

    if (promoterId && teamId) {
      console.log('[DEBUG] Verificando se é promotor do evento:', { promoterId, eventId });
      
      // Verificar se existe um usuário client_users com este telefone e se é o mesmo promoter
      const { data: clientUser, error: clientError } = await supabase
        .from('client_users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (!clientError && clientUser) {
        // Verificar se este client_user corresponde ao promoterId
        if (clientUser.id === promoterId) {
          // Verificar se este promotor está associado ao evento
          const { data: promoterAssociation, error: associationError } = await supabase
            .from('event_promoters')
            .select('id')
            .eq('event_id', eventId)
            .eq('promoter_id', promoterId)
            .maybeSingle();

          if (!associationError && promoterAssociation) {
            isEventPromoter = true;
            console.log('[INFO] Usuário é promotor deste evento');
          }
        }
      }
    }

    const response = {
      alreadyRegistered: !!existingGuest,
      isEventPromoter,
      guestStatus: existingGuest?.status || null,
      message: existingGuest 
        ? `Telefone já registrado com status: ${existingGuest.status}` 
        : 'Telefone disponível para registro'
    };

    console.log('[DEBUG] Resposta da verificação:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[ERROR] Erro ao processar requisição:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 