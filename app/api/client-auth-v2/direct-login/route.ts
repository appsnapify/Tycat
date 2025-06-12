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
    
    // CORREÇÃO SIMPLIFICADA: Criar sessão Supabase Auth
    console.log('[V2] Criando sessão Supabase Auth...');
    
    // Determinar email para autenticação
    const loginEmail = userData.email || `${userData.phone}@cliente.snapify.app`;
    console.log('[V2] Email para sessão:', loginEmail);
    
    try {
      // Tentar criar o usuário no Auth (mais direto)
      console.log('[V2] Criando usuário no Auth...');
      const { data: createAuthData, error: createAuthError } = await supabase.auth.admin.createUser({
        email: loginEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          client_user_id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone
        }
      });
      
      if (createAuthError && !createAuthError.message.includes('already been registered')) {
        console.error('[V2] Erro ao criar usuário no Auth:', createAuthError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao criar usuário no sistema de autenticação'
        }, { status: 500 });
      }
      
      // Fazer login para criar sessão
      console.log('[V2] Fazendo login para criar sessão...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });
      
      if (authError) {
        console.error('[V2] Erro no login:', authError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao criar sessão de autenticação'
        }, { status: 500 });
      }
      
      console.log('[V2] Sessão criada com sucesso');
      
      // Limpar password da tabela após migração bem-sucedida
      await supabase
        .from('client_users')
        .update({ password: null })
        .eq('id', userData.id);
        
      console.log('[V2] Password removida da tabela após migração');
      
    } catch (authSetupError) {
      console.error('[V2] Erro no setup de autenticação:', authSetupError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao configurar sessão de autenticação'
      }, { status: 500 });
    }
    
    console.log('[V2] Login direto realizado com sucesso e sessão criada:', { id: userData.id });
    
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