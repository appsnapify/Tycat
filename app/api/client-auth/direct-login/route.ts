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
    console.log('Iniciando login direto de cliente');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('Dados recebidos para login direto:', { 
      userId: body.userId ? `${body.userId.substring(0, 8)}...` : 'não informado',
      has_password: !!body.password
    });
    
    // Validar dados
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      console.error('Erro de validação:', result.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { userId, password } = result.data;
    
    // Inicializar cliente Supabase Admin (seguindo padrão do projeto)
    const supabase = createAdminClient();
    
    console.log('Buscando usuário pelo ID:', userId.substring(0, 8) + '...');
    
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email, password')
      .eq('id', userId)
      .maybeSingle();
      
    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar usuário: ' + userError.message 
      }, { status: 500 });
    }
    
    // Verificar se o usuário foi encontrado
    if (!userData) {
      console.log('Nenhum usuário encontrado com o ID informado');
      return NextResponse.json({ 
        success: false, 
        error: 'Usuário não encontrado ou senha incorreta' 
      }, { status: 401 });
    }
    
    // Verificar senha - SOLUÇÃO HÍBRIDA SEGURA
    console.log('Verificando senha para usuário:', userData.id);
    
    // MÉTODO 1: Tentar Supabase Auth primeiro (para utilizadores novos e migrados)
    let authSuccess = false;
    let userEmail = userData.email;
    if (!userEmail) {
      userEmail = `client_${userData.id}@temp.snap.com`;
    }
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      });
      
      if (!authError && authData.user) {
        console.log('Login bem-sucedido via Supabase Auth');
        authSuccess = true;
      }
    } catch (authAttemptError) {
      console.log('Falha no login via Auth, tentando método tabela...');
    }
    
    // MÉTODO 2: Se Auth falhou, tentar password da tabela (utilizadores antigos)
    if (!authSuccess && userData.password) {
      console.log('Tentando login via password da tabela (utilizador antigo)');
      
      if (userData.password === password) {
        console.log('Password da tabela correcta, migrando para Auth...');
        
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
            console.log('Utilizador migrado com sucesso para Auth');
            
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
              console.log('Login com Auth existente bem-sucedido');
              
              // Limpar password da tabela
              await supabase
                .from('client_users')
                .update({ password: null })
                .eq('id', userData.id);
                
              authSuccess = true;
            }
          }
        } catch (migrationError) {
          console.error('Erro na migração automática:', migrationError);
          // Continuar com método tabela se migração falhou
          authSuccess = true; // Temporariamente aceitar login por tabela
        }
      }
    }
    
    // VERIFICAÇÃO FINAL
    if (!authSuccess) {
      console.log('Falha na autenticação - password incorrecta');
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
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
    
    console.log('Login direto realizado com sucesso:', { id: userData.id });
    
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
    console.error('Erro ao processar requisição:', error);
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