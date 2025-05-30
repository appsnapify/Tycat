import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validar configuração
if (!supabaseUrl || !serviceRoleKey) {
  console.error('[CLIENT-AUTH-GUESTS] ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas corretamente.');
}

// Cliente Supabase Admin para client-auth
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: { 
      'X-Client-Info': 'supabase-js-client-auth/2.38.4'
    }
  }
});

/**
 * API especializada para criar guests via client-auth
 * Usa a função create_guest_safely para contornar RLS
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CLIENT-AUTH-GUESTS] Iniciando criação de guest via client-auth');
    
    // Extrair dados do request
    const body = await request.json();
    const { 
      event_id, 
      client_user_id, 
      promoter_id, 
      team_id, 
      name, 
      phone 
    } = body;
    
    console.log('[CLIENT-AUTH-GUESTS] Dados recebidos:', {
      event_id: event_id?.substring(0, 8) + '...',
      client_user_id: client_user_id?.substring(0, 8) + '...',
      promoter_id: promoter_id?.substring(0, 8) + '...',
      team_id: team_id?.substring(0, 8) + '...',
      name: name || 'não informado',
      phone: phone ? phone.substring(0, 3) + '****' : 'não informado'
    });
    
    // Validação obrigatória
    if (!event_id || !client_user_id) {
      console.log('[CLIENT-AUTH-GUESTS] Erro: Parâmetros obrigatórios ausentes');
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios ausentes: event_id e client_user_id'
      }, { status: 400 });
    }
    
    // Verificar se evento existe e está ativo
    try {
      console.log('[CLIENT-AUTH-GUESTS] Verificando evento...');
      
      const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select('date, is_active, title')
        .eq('id', event_id)
        .single();
        
      if (eventError || !event) {
        console.error('[CLIENT-AUTH-GUESTS] Evento não encontrado:', eventError);
        return NextResponse.json({ 
          success: false, 
          error: 'Evento não encontrado' 
        }, { status: 404 });
      }
      
      // Verificar se evento está ativo
      if (!event.is_active) {
        console.log('[CLIENT-AUTH-GUESTS] Evento não está ativo');
        return NextResponse.json({
          success: false,
          error: 'Este evento não está ativo.'
        }, { status: 400 });
      }
      
      // Verificar se evento já passou
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        console.log('[CLIENT-AUTH-GUESTS] Evento já passou');
        return NextResponse.json({
          success: false,
          error: 'Este evento já foi realizado. Não é possível criar nova guest list.'
        }, { status: 400 });
      }
      
      console.log('[CLIENT-AUTH-GUESTS] Evento válido:', event.title);
      
    } catch (eventCheckError) {
      console.error('[CLIENT-AUTH-GUESTS] Erro ao verificar evento:', eventCheckError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar evento'
      }, { status: 500 });
    }
    
    // Verificar se client_user existe
    try {
      console.log('[CLIENT-AUTH-GUESTS] Verificando client_user...');
      
      const { data: clientUser, error: userError } = await supabaseAdmin
        .from('client_users')
        .select('id, first_name, last_name, phone')
        .eq('id', client_user_id)
        .single();
        
      if (userError || !clientUser) {
        console.error('[CLIENT-AUTH-GUESTS] Client user não encontrado:', userError);
        return NextResponse.json({ 
          success: false, 
          error: 'Usuário cliente não encontrado' 
        }, { status: 404 });
      }
      
      console.log('[CLIENT-AUTH-GUESTS] Client user válido:', 
        `${clientUser.first_name} ${clientUser.last_name}`);
      
    } catch (userCheckError) {
      console.error('[CLIENT-AUTH-GUESTS] Erro ao verificar client_user:', userCheckError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar usuário cliente'
      }, { status: 500 });
    }
    
    // 🔒 VERIFICAÇÃO ANTI-DUPLICATA: Verificar se o usuário já é guest deste evento
    try {
      console.log('[CLIENT-AUTH-GUESTS] Verificando se usuário já é guest deste evento...');
      
      const { data: existingGuest, error: guestCheckError } = await supabaseAdmin
        .from('guests')
        .select('id, qr_code_url, name, created_at')
        .eq('client_user_id', client_user_id)
        .eq('event_id', event_id)
        .single();
        
      if (guestCheckError && guestCheckError.code !== 'PGRST116') {
        // PGRST116 = "The result contains 0 rows" - isto é OK, significa que não existe guest
        console.error('[CLIENT-AUTH-GUESTS] Erro ao verificar guest existente:', guestCheckError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao verificar guest existente'
        }, { status: 500 });
      }
      
      // Se encontrou guest existente, retornar os dados dele
      if (existingGuest) {
        console.log('[CLIENT-AUTH-GUESTS] Guest já existe! Retornando QR code existente:', 
          existingGuest.id?.substring(0, 8) + '...');
        
        return NextResponse.json({
          success: true,
          data: {
            id: existingGuest.id,
            qr_code_url: existingGuest.qr_code_url
          },
          message: 'Você já está na Guest List! Aqui está seu QR Code.',
          isExisting: true // Flag para indicar que é um guest existente
        });
      }
      
      console.log('[CLIENT-AUTH-GUESTS] Usuário não é guest ainda, prosseguindo com criação...');
      
    } catch (duplicateCheckError) {
      console.error('[CLIENT-AUTH-GUESTS] Erro ao verificar duplicatas:', duplicateCheckError);
      return NextResponse.json({
        success: false,
        error: 'Erro interno ao verificar duplicatas'
      }, { status: 500 });
    }
    
    // Usar função create_guest_safely para inserção segura
    try {
      console.log('[CLIENT-AUTH-GUESTS] Usando create_guest_safely...');
      
      const { data: result, error: createError } = await supabaseAdmin.rpc('create_guest_safely', {
        p_event_id: event_id,
        p_client_user_id: client_user_id,
        p_promoter_id: promoter_id || null,
        p_team_id: team_id || null,
        p_name: name || 'Convidado',
        p_phone: phone || ''
      });
      
      if (createError) {
        console.error('[CLIENT-AUTH-GUESTS] Erro ao chamar create_guest_safely:', createError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao criar convidado: ' + createError.message
        }, { status: 500 });
      }
      
      if (!result || result.length === 0) {
        console.error('[CLIENT-AUTH-GUESTS] create_guest_safely não retornou dados');
        return NextResponse.json({
          success: false,
          error: 'Erro ao criar convidado: Nenhum dado retornado'
        }, { status: 500 });
      }
      
      const guestData = result[0];
      console.log('[CLIENT-AUTH-GUESTS] Convidado criado com sucesso:', 
        guestData.id?.substring(0, 8) + '...');
      
      return NextResponse.json({
        success: true,
        data: {
          id: guestData.id,
          qr_code_url: guestData.qr_code_url
        },
        message: 'Parabéns! Você foi adicionado à Guest List. Seu QR Code foi gerado com sucesso!'
      });
      
    } catch (createGuestError) {
      console.error('[CLIENT-AUTH-GUESTS] Erro ao executar create_guest_safely:', createGuestError);
      return NextResponse.json({
        success: false,
        error: 'Erro interno ao criar convidado: ' + createGuestError.message
      }, { status: 500 });
    }
    
  } catch (globalError) {
    console.error('[CLIENT-AUTH-GUESTS] Erro global na rota:', globalError);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
} 