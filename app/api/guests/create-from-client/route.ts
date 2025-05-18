import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { cookies } from 'next/headers';
// import { verify } from 'jsonwebtoken'; // Removido - não mais usado
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Adicionado
import { type Database } from '@/types/supabase'; // Adicionado para tipagem do cliente Supabase

// Schema de validação
const createGuestSchema = z.object({
  event_id: z.string().uuid("ID do evento inválido"),
  promoter_id: z.string().uuid("ID do promotor inválido").optional(),
  team_id: z.string().uuid("ID da equipe inválido").optional()
});

// const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-temporaria'; // Removido - não mais usado

/**
 * API para criar registro de convidado a partir de um client_user autenticado (via Supabase session)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('API - Iniciando processamento de requisição POST para criar guest com client (Supabase Auth)');
    
    const supabaseRouteHandler = createRouteHandlerClient<Database>({ cookies });
    const { data: { session }, error: sessionError } = await supabaseRouteHandler.auth.getSession();

    if (sessionError) {
      console.error('API - Erro ao obter sessão Supabase:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar autenticação'
      }, { status: 500 });
    }

    if (!session || !session.user) {
      console.log('API - Erro: Usuário não autenticado (Supabase)');
      return NextResponse.json({
        success: false,
        error: 'Usuário não autenticado'
      }, { status: 401 });
    }
    
    const clientUserId = session.user.id;
    console.log('API - Usuário Supabase autenticado:', { id: clientUserId });
    
    // Extrair dados do request
    const data = await request.json();
    console.log('API - Dados recebidos:', {
      event_id: data.event_id,
      promoter_id: data.promoter_id || 'não informado',
      team_id: data.team_id || 'não informado'
    });
    
    // Validar dados
    const result = createGuestSchema.safeParse(data);
    if (!result.success) {
      console.error('API - Erro de validação:', result.error.format());
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: result.error.format()
      }, { status: 400 });
    }
    
    const { event_id, promoter_id, team_id } = result.data;
    
    // Inicializar cliente Supabase com privilégios de admin para a chamada RPC
    // Nota: Idealmente, a RPC create_guest_with_client seria segura para ser chamada
    // com as permissões do utilizador autenticado (via supabaseRouteHandler), não necessitando de adminClient.
    // Manter adminClient aqui pressupõe que a RPC requer elevações especiais.
    const supabaseAdmin = createAdminClient(); 
    
    // Usar função RPC para criar convidado
    const { data: guestData, error: guestError } = await supabaseAdmin.rpc('create_guest_with_client', {
      p_event_id: event_id,
      p_client_user_id: clientUserId, // ID do utilizador Supabase autenticado
      p_promoter_id: promoter_id || null,
      p_team_id: team_id || null,
      p_name: null, 
      p_phone: null 
    });
    
    if (guestError) {
      console.error('API - Erro ao criar convidado:', guestError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar convidado: ' + guestError.message
      }, { status: 500 });
    }
    
    if (!guestData || guestData.length === 0) {
      console.error('API - create_guest_with_client não retornou dados');
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar convidado: Nenhum dado retornado'
      }, { status: 500 });
    }
    
    const guest = guestData[0];
    console.log('API - Convidado criado com sucesso:', guest);
    
    // Retornar dados do convidado criado
    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        qr_code_url: guest.qr_code_url
      },
      message: 'Convidado criado com sucesso'
    });
    
  } catch (error) {
    console.error('API - Erro global na rota:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
} 