import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
// import { cookies } from 'next/headers'; // Comentado, pois cookies().set foi comentado
// import { sign } from 'jsonwebtoken'; // Comentado, pois a criação do token foi comentada

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  password: z.string().min(1, "Senha é obrigatória")
});

// Chave JWT secreta e expiração - Comentados pois não são mais usados aqui
// const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-temporaria';
// const JWT_EXPIRY = '7d'; 

export async function POST(request: Request) {
  try {
    console.log('Iniciando login de cliente');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('Dados recebidos para login:', { 
      phone: body.phone ? `${body.phone.substring(0, 3)}****` : 'não informado',
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
    
    const { phone, password } = result.data;
    
    // Criar cliente Supabase
    const supabase = await createClient();
    
    console.log('Buscando usuário pelo telefone:', phone.substring(0, 3) + '****');
    
    // Buscar usuário na tabela client_users
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email, password')
      .eq('phone', phone)
      .maybeSingle();
      
    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone: ' + userError.message 
      }, { status: 500 });
    }
    
    // Verificar se o usuário foi encontrado
    if (!userData) {
      console.log('Nenhum usuário encontrado com o telefone informado');
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
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
    
    console.log('Login realizado com sucesso:', { id: userData.id });
    
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