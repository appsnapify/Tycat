import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

// Schema de validação
const createGuestSchema = z.object({
  event_id: z.string().uuid("ID do evento inválido"),
  promoter_id: z.string().uuid("ID do promotor inválido").optional(),
  team_id: z.string().uuid("ID da equipe inválido").optional()
});

// Chave JWT secreta
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-temporaria';

/**
 * API para criar registro de convidado a partir de um client_user autenticado
 */
export async function POST(request: NextRequest) {
  try {
    console.log('API - Iniciando processamento de requisição POST para criar guest com client');
    
    // Verificar autenticação do cliente
    const token = cookies().get('client_auth_token')?.value;
    if (!token) {
      console.log('API - Erro: Cliente não autenticado');
      return NextResponse.json({
        success: false,
        error: 'Cliente não autenticado'
      }, { status: 401 });
    }
    
    // Verificar JWT
    let clientUserId;
    try {
      const decoded = verify(token, JWT_SECRET) as any;
      clientUserId = decoded.id;
      
      if (!clientUserId) {
        throw new Error('Token inválido ou expirado');
      }
      
      console.log('API - Cliente autenticado:', { id: clientUserId });
    } catch (tokenError) {
      console.error('API - Erro ao verificar token:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Token inválido ou expirado'
      }, { status: 401 });
    }
    
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
    
    // Inicializar cliente Supabase
    const supabase = createAdminClient();
    
    // Usar função RPC para criar convidado
    const { data: guestData, error: guestError } = await supabase.rpc('create_guest_with_client', {
      p_event_id: event_id,
      p_client_user_id: clientUserId,
      p_promoter_id: promoter_id || null,
      p_team_id: team_id || null,
      p_name: null, // Usar o nome do client_user automaticamente
      p_phone: null // Usar o telefone do client_user automaticamente
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