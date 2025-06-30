import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { checkDuplicateGuest, setGuestExists, invalidateGuestCache } from '@/lib/cache/guest-cache';
import { recordGuestCacheHit, recordGuestCacheMiss } from '@/lib/monitoring/cache-metrics';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS, checkCircuitBreaker, createCircuitBreakerResponse, recordCircuitBreakerSuccess, recordCircuitBreakerFailure } from '@/lib/security/advanced-rate-limit';

// Função auxiliar para validar UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

export async function POST(request: Request) {
  try {
    // ✅ RATE LIMITING - PROTEÇÃO CONTRA DDOS
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.GUEST_CREATION);
    if (!rateLimitResult.allowed) {
      console.warn('[RATE_LIMIT] Request bloqueado:', {
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        retryAfter: rateLimitResult.retryAfter
      });
      return createRateLimitResponse(rateLimitResult);
    }
    
    // ✅ CIRCUIT BREAKER - PROTEÇÃO CONTRA FALHAS EM CASCATA
    const circuitCheck = checkCircuitBreaker('supabase-guests');
    if (!circuitCheck.allowed) {
      console.error('[CIRCUIT_BREAKER] Supabase guests service indisponível:', circuitCheck.reason);
      return createCircuitBreakerResponse('supabase-guests', circuitCheck.reason!);
    }
    
    const { phone, eventId, promoterId, teamId } = await request.json();
    console.log('[DEBUG] Dados recebidos:', { phone, eventId, promoterId, teamId });

    // Validação dos campos obrigatórios e formato
    if (!phone || !eventId || !promoterId || !teamId) {
      console.error('[ERROR] Campos obrigatórios faltando:', { phone, eventId, promoterId, teamId });
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de UUIDs
    if (!isValidUUID(eventId) || !isValidUUID(promoterId) || !isValidUUID(teamId)) {
      console.error('[ERROR] IDs inválidos:', { eventId, promoterId, teamId });
      return NextResponse.json(
        { message: 'IDs inválidos fornecidos' },
        { status: 400 }
      );
    }

    // Validação do formato do telefone
    if (!isValidPhoneNumber(phone)) {
      console.error('[ERROR] Número de telefone inválido:', phone);
      return NextResponse.json(
        { message: 'Formato de telefone inválido' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Verificar se o evento existe e está ativo
    console.log('[DEBUG] Verificando evento:', eventId);
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, is_active, guest_list_open_datetime, guest_list_close_datetime')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('[ERROR] Erro ao buscar evento:', eventError);
      recordCircuitBreakerFailure('supabase-guests');
      return NextResponse.json(
        { message: 'Erro ao verificar evento' },
        { status: 500 }
      );
    }

    if (!event) {
      console.error('[ERROR] Evento não encontrado:', eventId);
      recordCircuitBreakerFailure('supabase-guests');
      return NextResponse.json(
        { message: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    if (!event.is_active) {
      console.error('[ERROR] Evento inativo:', eventId);
      return NextResponse.json(
        { message: 'Este evento não está mais aceitando registros' },
        { status: 400 }
      );
    }

    // Verificar se a guest list está aberta
    const now = new Date();
    const openTime = event.guest_list_open_datetime ? new Date(event.guest_list_open_datetime) : null;
    const closeTime = event.guest_list_close_datetime ? new Date(event.guest_list_close_datetime) : null;

    if (openTime && now < openTime) {
      console.error('[ERROR] Guest list ainda não aberta:', { now, openTime });
      return NextResponse.json(
        { 
          message: `A guest list abre apenas em ${openTime.toLocaleString('pt-BR', { timeZone: 'Europe/Lisbon' })}` 
        },
        { status: 400 }
      );
    }

    if (closeTime && now > closeTime) {
      console.error('[ERROR] Guest list já fechada:', { now, closeTime });
      return NextResponse.json(
        { message: 'A guest list já está fechada' },
        { status: 400 }
      );
    }

    // Verificar se o promotor está associado ao evento e equipe
    console.log('[DEBUG] Verificando associação do promotor:', { promoterId, teamId, eventId });
    const { data: association, error: associationError } = await supabase
      .from('event_promoters')
      .select('id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (associationError) {
      console.error('[ERROR] Erro ao verificar associação:', associationError);
      recordCircuitBreakerFailure('supabase-guests');
      return NextResponse.json(
        { message: 'Erro ao verificar associação do promotor' },
        { status: 500 }
      );
    }

    if (!association) {
      console.error('[ERROR] Promotor não associado:', { promoterId, teamId, eventId });
      return NextResponse.json(
        { message: 'Promotor não está associado a este evento/equipe' },
        { status: 403 }
      );
    }

    // Verificar se o telefone já está registrado
    console.log('[DEBUG] Verificando registro existente:', phone);
    
    // ✅ CACHE HIT - VERIFICAÇÃO INSTANTÂNEA DE DUPLICATAS
    // Note: checkDuplicateGuest verifica por client_user_id + event_id, mas aqui estamos usando phone + event_id
    // Fazer consulta direta por enquanto até ter cache específico para phone
    const { data: existingGuest, error: checkError } = await supabase
      .from('guests')
      .select('id')
      .eq('phone', phone)
      .eq('event_id', eventId)
      .maybeSingle();

    if (checkError) {
      console.error('[ERROR] Erro ao verificar registro existente:', checkError);
      recordCircuitBreakerFailure('supabase-guests');
      return NextResponse.json(
        { message: 'Erro ao verificar registro existente' },
        { status: 500 }
      );
    }

    if (existingGuest) {
      console.log('[INFO] Telefone já registrado:', phone);
      return NextResponse.json(
        { message: 'Este telefone já está registrado para este evento' },
        { status: 409 }
      );
    }

    // Criar o registro do convidado
    console.log('[DEBUG] Criando registro do convidado');
    const { data: guest, error: insertError } = await supabase
      .from('guests')
      .insert({
        phone,
        event_id: eventId,
        promoter_id: promoterId,
        team_id: teamId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ERROR] Erro ao criar registro:', insertError);
      recordCircuitBreakerFailure('supabase-guests');
      return NextResponse.json(
        { message: 'Erro ao criar registro' },
        { status: 500 }
      );
    }

    // ✅ INVALIDAR CACHE APÓS CRIAÇÃO BEM-SUCEDIDA
    invalidateGuestCache(cacheKey);
    console.log('[DEBUG] Cache invalidado para:', cacheKey);

    // ✅ REGISTRO DE SUCESSO NO CIRCUIT BREAKER
    recordCircuitBreakerSuccess('supabase-guests');

    console.log('[SUCCESS] Registro criado com sucesso:', guest);
    return NextResponse.json({
      message: 'Registro criado com sucesso',
      guest
    });

  } catch (error) {
    console.error('[ERROR] Erro não tratado:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 