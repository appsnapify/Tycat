import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  password: z.string().min(1, "Senha é obrigatória")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar dados
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { phone, password } = result.data;
    
    // Criar cliente Supabase Admin
    const supabase = createAdminClient();
    
    // Buscar usuário na tabela client_users
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email, password')
      .eq('phone', phone)
      .maybeSingle();
      
    if (userError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone: ' + userError.message 
      }, { status: 500 });
    }
    
    // Verificar se o usuário foi encontrado
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      }, { status: 401 });
    }
    
    // Verificar senha - SOLUÇÃO HÍBRIDA SEGURA
    let authSuccess = false;
    let authUser = null;
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
        authUser = authData.user;
        authSuccess = true;
        
        // ✅ SEMPRE GARANTIR METADADOS CORRETOS
        if (!authData.user.user_metadata?.client_user_id || authData.user.user_metadata.client_user_id !== userData.id) {
          try {
            await supabase.auth.admin.updateUserById(
              authData.user.id,
              {
                user_metadata: {
                  client_user_id: userData.id,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  phone: userData.phone
                }
              }
            );
          } catch (metaUpdateError) {
            // Silencioso
          }
        }
      }
    } catch (authAttemptError) {
      // Tentar método tabela
    }
    
    // MÉTODO 2: Se Auth falhou, tentar password da tabela (utilizadores antigos)
    if (!authSuccess && userData.password) {
      if (userData.password === password) {
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
          
          if (!migrationError && migrationData.user) {
            authUser = migrationData.user;
            
            // Limpar password da tabela após migração bem-sucedida
            await supabase
              .from('client_users')
              .update({ password: null })
              .eq('id', userData.id);
              
            authSuccess = true;
          } else if (migrationError && migrationError.message.includes('already been registered')) {
            // Se já existe no Auth, apenas fazer login
            const { data: existingAuthData, error: existingAuthError } = await supabase.auth.signInWithPassword({
              email: userEmail,
              password: password
            });
            
            if (!existingAuthError && existingAuthData.user) {
              authUser = existingAuthData.user;
              
              // ✅ SEMPRE GARANTIR METADADOS
              if (!existingAuthData.user.user_metadata?.client_user_id) {
                await supabase.auth.admin.updateUserById(
                  existingAuthData.user.id,
                  {
                    user_metadata: {
                      client_user_id: userData.id,
                      first_name: userData.first_name,
                      last_name: userData.last_name,
                      phone: userData.phone
                    }
                  }
                );
              }
              
              // Limpar password da tabela
              await supabase
                .from('client_users')
                .update({ password: null })
                .eq('id', userData.id);
                
              authSuccess = true;
            }
          }
        } catch (migrationError) {
          // Continuar com método tabela se migração falhou
          authSuccess = true; // Temporariamente aceitar login por tabela
        }
      }
    }
    
    // VERIFICAÇÃO FINAL
    if (!authSuccess) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      }, { status: 401 });
    }
    
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