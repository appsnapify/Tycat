import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validar configuração
if (!supabaseUrl || !serviceRoleKey) {
  console.error('API - ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas corretamente.');
}

// Cliente Supabase Admin com configuração explícita
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // Versão global explícita para evitar conflitos
  global: {
    headers: { 
      'X-Client-Info': 'supabase-js/2.38.4'
    }
  }
});

/**
 * API para criar registro de convidado no banco de dados
 */
export async function POST(request: NextRequest) {
  try {
    console.log('API - Iniciando processamento de requisição POST');
    
    const body = await request.json();
    const { eventId } = body;
    
    // Verificar se o evento existe e não passou
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('date, is_active')
      .eq('id', eventId)
      .single();
      
    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }
    
    // Verificar se o evento já passou
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      return NextResponse.json(
        { error: 'Este evento já foi realizado. Não é possível criar nova guest list.' },
        { status: 400 }
      );
    }
    
    if (!event.is_active) {
      return NextResponse.json(
        { error: 'Este evento não está ativo.' },
        { status: 400 }
      );
    }
    
    // Extração de dados do request
    const data = await request.json();
    const { 
      event_id, 
      name, 
      phone, 
      client_user_id, 
      promoter_id, 
      team_id 
    } = data;
    
    console.log('API - Dados recebidos:', {
      event_id,
      client_user_id,
      promoter_id,
      team_id,
      nome: name || 'não informado',
      phone: phone ? phone.substring(0, 3) + '****' : 'não informado'
    });
    
    // Validação básica
    if (!event_id || !client_user_id) {
      console.log('API - Erro: Parâmetros obrigatórios ausentes');
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios ausentes: event_id e client_user_id'
      }, { status: 400 });
    }
    
    // Usar nossa função segura que contorna o RLS
    try {
      console.log('API - Usando função create_guest_safely para contornar RLS');
      
      const { data: result, error } = await supabaseAdmin.rpc('create_guest_safely', {
        p_event_id: event_id,
        p_client_user_id: client_user_id,
        p_promoter_id: promoter_id,
        p_team_id: team_id,
        p_name: name || 'Convidado',
        p_phone: phone || ''
      });
      
      if (error) {
        console.error('API - Erro ao chamar create_guest_safely:', error);
        return NextResponse.json({
          success: false,
          error: 'Erro ao criar convidado: ' + error.message
        }, { status: 500 });
      }
      
      if (!result || result.length === 0) {
        console.error('API - create_guest_safely não retornou dados');
        return NextResponse.json({
          success: false,
          error: 'Erro ao criar convidado: Nenhum dado retornado'
        }, { status: 500 });
      }
      
      const guestData = result[0];
      console.log('API - Convidado criado com sucesso:', guestData);
      
      return NextResponse.json({
        success: true,
        data: {
          id: guestData.id,
          qr_code_url: guestData.qr_code_url
        },
        message: 'Convidado criado com sucesso via função segura'
      });
    } catch (fnError) {
      console.error('API - Erro ao executar create_guest_safely:', fnError);
    }
    
    // Se a função falhar, tenta o método antigo como fallback
    console.log('API - Gerando ID único para o convidado (método antigo)');
    const guestId = uuidv4();
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${guestId}`;
    
    // Verificação se o convidado já existe usando try-catch individual
    let existingGuest = null;
    
    try {
      const { data: existingData, error: existingError } = await supabaseAdmin
        .from('guests')
        .select('id, qr_code_url')
        .eq('event_id', event_id)
        .eq('client_user_id', client_user_id)
        .maybeSingle();
      
      if (existingError) {
        console.error('API - Erro ao verificar convidado existente:', 
          existingError.code, existingError.message);
      } else if (existingData) {
        existingGuest = existingData;
        console.log('API - Convidado já existente:', existingGuest);
      }
    } catch (checkError) {
      console.error('API - Exceção ao verificar convidado existente:', checkError);
    }
    
    // Se o convidado já existe, retornar seus dados
    if (existingGuest) {
      console.log('API - Retornando dados do convidado existente:', existingGuest.id);
      
      return NextResponse.json({
        success: true,
        data: {
          id: existingGuest.id,
          qr_code_url: existingGuest.qr_code_url || qrCodeUrl
        },
        message: 'Convidado já existe'
      });
    }
    
    // Dados básicos para inserção - apenas campos essenciais conhecidos
    const insertData = {
      id: guestId,
      event_id,
      client_user_id,
      promoter_id,
      team_id,
      name: name || 'Convidado',
      phone: phone || '',
      qr_code_url: qrCodeUrl
    };
    
    console.log('API - Dados para inserção preparados:', {
      ...insertData,
      id: insertData.id.substring(0, 8) + '...',
      phone: insertData.phone ? insertData.phone.substring(0, 3) + '****' : ''
    });
    
    // Tentativa #1: Inserção direta com cliente admin
    try {
      console.log('API - Tentativa #1: Inserção direta com cliente admin');
      
      const { data: newGuest, error: insertError } = await supabaseAdmin
        .from('guests')
        .insert([insertData])
        .select('id')
        .single();
      
      if (insertError) {
        console.error('API - Erro #1 ao inserir convidado:', 
          insertError.code, insertError.message, insertError.details || '');
        
        // Verificar tipo de erro e continuar com próxima tentativa
        throw new Error(insertError.message);
      }
      
      // Sucesso na inserção direta
      console.log('API - Registro criado com sucesso via método direto:', newGuest?.id);
      
      return NextResponse.json({
        success: true,
        data: {
          id: newGuest?.id || guestId,
          qr_code_url: qrCodeUrl
        },
        message: 'Novo registro criado com sucesso'
      });
    } catch (directError) {
      console.error('API - Erro na tentativa de inserção direta:', directError);
      
      // Continuar para próxima tentativa
      console.log('API - Tentando método alternativo...');
    }
    
    // Tentativa final de fallback: Executar SQL personalizado
    try {
      console.log('API - Tentativa final: SQL personalizado com bypass de RLS');
      
      // Preparar os valores para inserção segura
      const insertSQL = `
        INSERT INTO guests (
          id, event_id, client_user_id, promoter_id, team_id, 
          name, phone, qr_code_url, created_at
        ) 
        VALUES (
          '${guestId}', 
          '${event_id}', 
          '${client_user_id}', 
          ${promoter_id ? `'${promoter_id}'` : 'NULL'}, 
          ${team_id ? `'${team_id}'` : 'NULL'}, 
          '${(name || 'Convidado').replace(/'/g, "''")}', 
          '${(phone || '').replace(/'/g, "''")}',
          '${qrCodeUrl}',
          NOW()
        )
        RETURNING id;
      `;
      
      const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { 
        sql: insertSQL 
      });
      
      if (sqlError) {
        console.error('API - Erro na inserção via SQL personalizado:', 
          sqlError.code, sqlError.message, sqlError.details || '');
        
        throw new Error(`Erro detalhado ao criar pedido: "${sqlError.message}"`);
      }
      
      // Sucesso com SQL personalizado
      console.log('API - Registro criado com sucesso via SQL personalizado');
      
      return NextResponse.json({
        success: true,
        data: {
          id: guestId,
          qr_code_url: qrCodeUrl
        },
        message: 'Novo registro criado com sucesso via SQL'
      });
      
    } catch (finalError) {
      // Todos os métodos falharam, retornar erro detalhado
      console.error('API - Todas as tentativas falharam:', finalError);
      
      return NextResponse.json({
        success: false,
        error: `Erro detalhado ao criar pedido: "${finalError.message}"`,
      }, { status: 500 });
    }
    
  } catch (e) {
    // Erro global na rota
    console.error('API - Erro global na rota:', e);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
} 