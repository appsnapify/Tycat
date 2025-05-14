import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Criar cliente Supabase do lado do servidor
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autenticação
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('[API] Erro de autenticação ao duplicar evento:', authError);
      return NextResponse.json(
        { error: 'Não autorizado. Faça login novamente.' }, 
        { status: 401 }
      );
    }
    
    // Extrair dados do evento do corpo da requisição
    const eventData = await request.json();
    
    if (!eventData.organization_id) {
      return NextResponse.json(
        { error: 'Dados do evento incompletos. O ID da organização é obrigatório.' }, 
        { status: 400 }
      );
    }
    
    console.log('[API] Recebido pedido para duplicar evento:', eventData.title);
    
    // Preparar dados para inserção
    const newEvent = {
      ...eventData,
      // Garantir que não haja IDs ou timestamps que possam causar conflitos
      created_at: undefined,
      updated_at: undefined,
      id: undefined
    };
    
    // Remover o campo status se existir (será definido automaticamente por triggers)
    if ('status' in newEvent) {
      delete newEvent.status;
    }
    
    console.log('[API] Inserindo novo evento no Supabase:', newEvent.title);
    
    // Inserir no banco de dados com o cliente server-side Supabase
    const { data, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();
    
    if (error) {
      console.error('[API] Erro do Supabase ao inserir evento:', error);
      
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Violação de política de segurança. Você não tem permissão para esta operação.' }, 
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: `Erro ao duplicar evento: ${error.message}` }, 
        { status: 500 }
      );
    }
    
    console.log('[API] Evento duplicado com sucesso:', data.id);
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] Erro não tratado ao duplicar evento:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    );
  }
} 