import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Schema de validação para login direto
const directLoginSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    // Criar cliente Supabase com manipulação assíncrona de cookies
    const supabase = await createClient();
    
    // Extrair e validar o corpo da requisição
    let body;
    try {
      body = await request.json();
      console.log('Dados recebidos para login direto:', { ...body, password: '***' });
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      return NextResponse.json(
        { error: 'Erro ao processar dados de requisição' },
        { status: 400 }
      );
    }
    
    const result = directLoginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados de login inválidos', details: result.error },
        { status: 400 }
      );
    }
    
    const { userId, password } = result.data;
    
    console.log('Tentando autenticação direta para o usuário com ID:', userId);
    
    try {
      // Usar a função verify_user_login que criamos
      const { data: authResult, error: authError } = await supabase.rpc('verify_user_login', {
        user_id: userId,
        user_password: password
      });
      
      console.log('Resultado da verificação de login:', {
        sucesso: authResult?.success,
        erro: authError ? authError.message : null
      });
      
      if (authError) {
        console.error('Erro ao verificar login:', authError);
        return NextResponse.json(
          { error: 'Erro ao verificar credenciais' },
          { status: 500 }
        );
      }
      
      if (!authResult || authResult.success !== true) {
        console.error('Senha incorreta ou problema na verificação');
        return NextResponse.json(
          { error: 'Senha incorreta ou usuário não encontrado' },
          { status: 401 }
        );
      }
      
      console.log('Login verificado com sucesso via RPC');
      
      // Buscar o email associado ao usuário para autenticação
      if (!authResult.email) {
        return NextResponse.json(
          { error: 'Usuário sem email associado. Contate o suporte.' },
          { status: 400 }
        );
      }
      
      // Como não vamos usar cookies do lado do servidor, podemos simplesmente retornar 
      // os dados ao cliente para que ele faça a autenticação do lado do browser
      
      return NextResponse.json({
        success: true,
        user: {
          id: authResult.id,
          firstName: authResult.first_name,
          lastName: authResult.last_name,
          phone: authResult.phone,
          email: authResult.email
        }
      });
    } catch (rpcError) {
      console.error('Erro ao executar verificação de login via RPC:', rpcError);
      return NextResponse.json(
        { error: 'Erro interno ao processar autenticação' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro no login direto de cliente:', error);
    return NextResponse.json(
      { error: 'Falha ao processar solicitação de login' },
      { status: 500 }
    );
  }
} 