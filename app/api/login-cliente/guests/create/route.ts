import { NextResponse, NextRequest } from 'next/server';
import { getLoginClienteSupabase } from '@/lib/login-cliente/auth-client';

/**
 * API ISOLADA para criar guests via sistema login-cliente
 * Completamente separada das APIs client-auth-v2/v3 que causam logs PHONE-CACHE-V2
 * Usa a mesma instância Supabase do sistema de login isolado
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[LOGIN-CLIENTE-GUESTS] Iniciando criação de guest...');
    
    // Extrair dados do request
    const body = await request.json();
    console.log('[LOGIN-CLIENTE-GUESTS] Dados recebidos:', {
      event_id: body.event_id,
      client_user_id: body.client_user_id ? body.client_user_id.substring(0, 8) + '...' : 'não fornecido',
      promoter_id: body.promoter_id,
      team_id: body.team_id,
      name: body.name,
      phone: body.phone ? body.phone.substring(0, 3) + '****' : 'não fornecido'
    });

    // Validar dados obrigatórios
    const { event_id, client_user_id, name, phone, promoter_id, team_id } = body;
    
    if (!event_id || !client_user_id || !promoter_id || !team_id) {
      console.error('[LOGIN-CLIENTE-GUESTS] Dados obrigatórios faltando');
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios faltando'
      }, { status: 400 });
    }

    // Usar cliente Supabase isolado
    const supabase = getLoginClienteSupabase();
    
    console.log('[LOGIN-CLIENTE-GUESTS] Verificando se guest já existe...');
    
    // Verificar se já existe guest para este evento e usuário
    const { data: existingGuest, error: checkError } = await supabase
      .from('guests')
      .select('id, qr_code_url')
      .eq('event_id', event_id)
      .eq('client_user_id', client_user_id)
      .maybeSingle();
    
    if (checkError) {
      console.error('[LOGIN-CLIENTE-GUESTS] Erro ao verificar guest existente:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar dados existentes'
      }, { status: 500 });
    }
    
    if (existingGuest) {
      console.log('[LOGIN-CLIENTE-GUESTS] Guest já existe, retornando dados existentes');
      return NextResponse.json({
        success: true,
        data: {
          id: existingGuest.id,
          qr_code_url: existingGuest.qr_code_url,
          message: 'Acesso já concedido anteriormente'
        }
      });
    }
    
    console.log('[LOGIN-CLIENTE-GUESTS] Criando novo guest...');
    
    // Criar novo guest
    const { data: newGuest, error: createError } = await supabase
      .from('guests')
      .insert({
        event_id,
        client_user_id,
        name: name || 'Convidado',
        phone: phone || '',
        promoter_id,
        team_id,
        status: 'approved' // Auto-aprovar para guest lists abertas
      })
      .select('id, qr_code_url')
      .single();
    
    if (createError) {
      console.error('[LOGIN-CLIENTE-GUESTS] Erro ao criar guest:', createError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar acesso ao evento'
      }, { status: 500 });
    }
    
    console.log('[LOGIN-CLIENTE-GUESTS] Guest criado com sucesso:', newGuest.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: newGuest.id,
        qr_code_url: newGuest.qr_code_url,
        message: 'Acesso concedido com sucesso!'
      }
    });
    
  } catch (error) {
    console.error('[LOGIN-CLIENTE-GUESTS] Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 