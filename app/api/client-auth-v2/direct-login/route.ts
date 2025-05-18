import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
// import { cookies } from 'next/headers'; // Comentado
// import { sign } from 'jsonwebtoken'; // Comentado
// import { JWT_SECRET, JWT_EXPIRY } from '@/lib/constants'; // Comentado

// Schema de validação
const loginSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  password: z.string().min(1, "Senha é obrigatória")
});

export async function POST(request: Request) {
  try {
    console.log('[V2] Iniciando login direto de cliente');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('[V2] Dados recebidos para login direto:', { 
      userId: body.userId ? `${body.userId.substring(0, 8)}...` : 'não informado',
      has_password: !!body.password
    });
    
    // Validar dados
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      console.error('[V2] Erro de validação:', result.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { userId, password } = result.data;
    
    // Inicializar cliente Supabase
    const supabase = createAdminClient();
    
    // SOLUÇÃO: Usar consulta direta em vez de função RPC
    console.log('[V2] Buscando usuário pelo ID:', userId.substring(0, 8) + '...');
    
    // Buscar o usuário diretamente pelo ID
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email, password')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('[V2] Erro ao buscar usuário:', userError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar usuário' 
      }, { status: 500 });
    }
    
    // Verificar se o usuário foi encontrado
    if (!userData) {
      console.log('[V2] Nenhum usuário encontrado com o ID informado');
      return NextResponse.json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      }, { status: 404 });
    }
    
    // Verificar senha
    console.log('[V2] Verificando senha para usuário:', userData.id);
    
    // Comparação direta de senha - em produção usar bcrypt ou similar
    if (userData.password !== password) {
      console.log('[V2] Senha incorreta para o usuário:', userData.id);
      return NextResponse.json({ 
        success: false, 
        error: 'Senha incorreta' 
      }, { status: 401 });
    }
    
    // Criar token JWT - LÓGICA COMENTADA
    /*
    const token = sign(
      { 
        id: userData.id,
        phone: userData.phone,
        email: userData.email 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );
    */
    
    // console.log('Token gerado para o cliente:', token); // Comentado

    // Definir o cookie de autenticação - JÁ COMENTADO ANTERIORMENTE
    // cookies().set('client_auth_token', token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV !== 'development',
    //   maxAge: 60 * 60 * 24 * 7, // 1 semana
    //   path: '/',
    //   sameSite: 'lax'
    // });
    
    console.log('[V2] Login direto realizado com sucesso:', { id: userData.id });
    
    // Retornar dados do usuário (sem senha)
    return NextResponse.json({ 
      success: true, 
      user: {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        email: userData.email
      }
    });
    
  } catch (error) {
    console.error('[V2] Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 