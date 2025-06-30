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
    const body = await request.json();
    const { 
      event_id, 
      client_user_id, 
      promoter_id, 
      team_id, 
      name, 
      phone 
    } = body;
    
    // Validação básica
    if (!event_id || !client_user_id) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios ausentes'
      }, { status: 400 });
    }
    
    // Verificar se guest já existe
    const { data: existingGuest, error: guestCheckError } = await supabaseAdmin
      .from('guests')
      .select('id, qr_code_url')
      .eq('client_user_id', client_user_id)
      .eq('event_id', event_id)
      .maybeSingle();
      
    if (existingGuest) {
      return NextResponse.json({
        success: true,
        data: {
          id: existingGuest.id,
          qr_code_url: existingGuest.qr_code_url
        },
        message: 'Você já está na Guest List!',
        isExisting: true
      });
    }
    
    // Criar guest
    const { data: result, error: createError } = await supabaseAdmin.rpc('create_guest_safely', {
      p_event_id: event_id,
      p_client_user_id: client_user_id,
      p_promoter_id: promoter_id || null,
      p_team_id: team_id || null,
      p_name: name || 'Convidado',
      p_phone: phone || '',
      p_source: 'PROMOTER'
    });
    
    if (createError || !result || result.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar convidado'
      }, { status: 500 });
    }
    
    const guestData = result[0];
    
    return NextResponse.json({
      success: true,
      data: {
        id: guestData.id,
        qr_code_url: guestData.qr_code_url
      },
      message: 'Guest list criada com sucesso!'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 