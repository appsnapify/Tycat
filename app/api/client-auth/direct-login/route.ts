import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
// import { cookies } from 'next/headers'; // Comentado
// import { sign } from 'jsonwebtoken'; // Comentado

// Schema de validação
const loginSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  password: z.string().min(1, "Senha é obrigatória")
});

// Chave JWT secreta e expiração - Comentadas
// const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-temporaria';
// const JWT_EXPIRY = '7d'; 

export async function POST(request: Request) {
  try {
    // Verificar variáveis de ambiente primeiro
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuração do servidor incompleta' 
      }, { status: 500 });
    }
    
    // Extrair body da requisição
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados de requisição inválidos' 
      }, { status: 400 });
    }
    
    // Validar dados
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos'
      }, { status: 400 });
    }
    
    const { userId, password } = result.data;
    
    // Inicializar cliente Supabase Admin
    let supabase;
    try {
      supabase = createAdminClient();
      console.log('[DIRECT-LOGIN] Cliente Admin Supabase criado');
    } catch (clientError) {
      console.error('[DIRECT-LOGIN] Erro ao criar cliente Supabase:', clientError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro de configuração do banco de dados' 
      }, { status: 500 });
    }
    
    console.log('[DIRECT-LOGIN] Buscando usuário pelo ID:', userId.substring(0, 8) + '...');
    
    // Buscar usuário
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email, password')
      .eq('id', userId)
      .maybeSingle();
      
    if (userError) {
      console.error('[DIRECT-LOGIN] Erro ao buscar usuário:', userError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar usuário: ' + userError.message 
      }, { status: 500 });
    }
    
    // Verificar se o usuário foi encontrado
    if (!userData) {
      console.log('[DIRECT-LOGIN] Nenhum usuário encontrado com o ID informado');
      return NextResponse.json({ 
        success: false, 
        error: 'Usuário não encontrado ou senha incorreta' 
      }, { status: 401 });
    }
    
    console.log('[DIRECT-LOGIN] Usuário encontrado:', {
      id: userData.id,
      firstName: userData.first_name,
      hasEmail: !!userData.email,
      hasPassword: !!userData.password
    });
    
    // Verificar senha - SOLUÇÃO HÍBRIDA SEGURA
    console.log('[DIRECT-LOGIN] Verificando senha para usuário:', userData.id);
    
    // MÉTODO 1: Tentar Supabase Auth primeiro (para utilizadores novos e migrados)
    let authSuccess = false;
    let userEmail = userData.email;
    if (!userEmail) {
      userEmail = `client_${userData.id}@temp.snap.com`;
    }
    
    console.log('[DIRECT-LOGIN] Tentando login via Supabase Auth com email:', userEmail);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      });
      
      if (!authError && authData.user) {
        console.log('[DIRECT-LOGIN] Login bem-sucedido via Supabase Auth');
        authSuccess = true;
      } else {
        console.log('[DIRECT-LOGIN] Falha no Auth:', authError?.message || 'Erro desconhecido');
      }
    } catch (authAttemptError) {
      console.log('[DIRECT-LOGIN] Exceção no Auth:', authAttemptError);
    }
    
    // MÉTODO 2: Se Auth falhou, tentar password da tabela (utilizadores antigos)
    if (!authSuccess && userData.password) {
      console.log('[DIRECT-LOGIN] Tentando login via password da tabela (utilizador antigo)');
      
      if (userData.password === password) {
        console.log('[DIRECT-LOGIN] Password da tabela correcta, migrando para Auth...');
        
        // MIGRAÇÃO AUTOMÁTICA: Criar/actualizar no Supabase Auth
        try {
          // Tentar criar no Auth se não existir
          const { data: migrationData, error: migrationError } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              client_user_id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              phone: userData.phone
            }
          });
          
          if (!migrationError) {
            console.log('[DIRECT-LOGIN] Utilizador migrado com sucesso para Auth');
            
            // Limpar password da tabela após migração bem-sucedida
            await supabase
              .from('client_users')
              .update({ password: null })
              .eq('id', userData.id);
              
            authSuccess = true;
          } else if (migrationError.message.includes('already been registered')) {
            // Se já existe no Auth, apenas fazer login
            const { data: existingAuthData, error: existingAuthError } = await supabase.auth.signInWithPassword({
              email: userEmail,
              password: password
            });
            
            if (!existingAuthError) {
              console.log('[DIRECT-LOGIN] Login com Auth existente bem-sucedido');
              
              // Limpar password da tabela
              await supabase
                .from('client_users')
                .update({ password: null })
                .eq('id', userData.id);
                
              authSuccess = true;
            } else {
              console.log('[DIRECT-LOGIN] Falha no login com Auth existente:', existingAuthError);
            }
          } else {
            console.error('[DIRECT-LOGIN] Erro na migração:', migrationError);
          }
        } catch (migrationError) {
          console.error('[DIRECT-LOGIN] Exceção na migração automática:', migrationError);
          // Continuar com método tabela se migração falhou
          authSuccess = true; // Temporariamente aceitar login por tabela
        }
      } else {
        console.log('[DIRECT-LOGIN] Password da tabela incorrecta');
      }
    }
    
    // VERIFICAÇÃO FINAL
    if (!authSuccess) {
      console.log('[DIRECT-LOGIN] Falha na autenticação - password incorrecta');
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      }, { status: 401 });
    }
    
    console.log('[DIRECT-LOGIN] Login direto realizado com sucesso:', { id: userData.id });
    
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
    console.error('[DIRECT-LOGIN] Erro ao processar requisição:', error);
    
    let errorMessage = 'Erro interno do servidor';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 