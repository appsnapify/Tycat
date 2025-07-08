import { NextResponse, NextRequest } from 'next/server';
import { getLoginClienteSupabase } from '@/lib/login-cliente/auth-client';

/**
 * API ISOLADA para criar guests via organizador usando sistema login-cliente
 * Completamente separada das APIs client-auth-v2/v3 que causam logs PHONE-CACHE-V2
 * Usa a mesma instância Supabase do sistema de login isolado
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[LOGIN-CLIENTE-ORGANIZADOR] Iniciando criação de guest via organização...');
    
    // Extrair dados do request
    const body = await request.json();
    console.log('[LOGIN-CLIENTE-ORGANIZADOR] Dados recebidos:', {
      event_id: body.event_id,
      client_user_id: body.client_user_id ? body.client_user_id.substring(0, 8) + '...' : 'não fornecido',
      name: body.name,
      phone: body.phone ? body.phone.substring(0, 3) + '****' : 'não fornecido'
    });

    // Validar dados obrigatórios
    const { event_id, client_user_id, name, phone } = body;
    
    if (!event_id || !client_user_id) {
      console.error('[LOGIN-CLIENTE-ORGANIZADOR] Dados obrigatórios faltando');
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios faltando'
      }, { status: 400 });
    }

    // Usar cliente Supabase isolado
    const supabase = getLoginClienteSupabase();
    
    console.log('[LOGIN-CLIENTE-ORGANIZADOR] Verificando se guest já existe...');
    
    // Verificar se já existe guest para este evento e usuário
    const { data: existingGuest, error: checkError } = await supabase
      .from('guests')
      .select('id, qr_code_url')
      .eq('event_id', event_id)
      .eq('client_user_id', client_user_id)
      .maybeSingle();
    
    if (checkError) {
      console.error('[LOGIN-CLIENTE-ORGANIZADOR] Erro ao verificar guest existente:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar dados existentes'
      }, { status: 500 });
    }
    
    if (existingGuest) {
      console.log('[LOGIN-CLIENTE-ORGANIZADOR] Guest já existe, retornando dados existentes');
      return NextResponse.json({
        success: true,
        data: {
          id: existingGuest.id,
          qr_code_url: existingGuest.qr_code_url,
          message: 'Você já está na guest list deste evento!'
        },
        isExisting: true
      });
    }
    
    console.log('[LOGIN-CLIENTE-ORGANIZADOR] Criando novo guest via organização...');
    
    // Criar novo guest (sem promoter_id e team_id para organização)
    const { data: newGuest, error: createError } = await supabase
      .from('guests')
      .insert({
        event_id,
        client_user_id,
        name: name || 'Convidado',
        phone: phone || '',
        status: 'approved', // Auto-aprovar para organização
        created_via: 'organizacao' // Marcar origem
      })
      .select('id, qr_code_url')
      .single();
    
    if (createError) {
      console.error('[LOGIN-CLIENTE-ORGANIZADOR] Erro ao criar guest:', createError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar acesso ao evento'
      }, { status: 500 });
    }
    
    console.log('[LOGIN-CLIENTE-ORGANIZADOR] Guest criado com sucesso:', newGuest.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: newGuest.id,
        qr_code_url: newGuest.qr_code_url,
        message: 'Acesso concedido pela organização!'
      },
      isExisting: false
    });
    
  } catch (error) {
    console.error('[LOGIN-CLIENTE-ORGANIZADOR] Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 