import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';

// Schema de validação
const registerSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  email: z.string().email("Email inválido").optional(),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  birthDate: z.string().min(10, "Data de nascimento é obrigatória"),
  postalCode: z.string().min(4, "Código postal deve ter pelo menos 4 caracteres"),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: "Género deve ser 'male', 'female' ou 'other'" })
  }),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar dados
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { 
      phone, 
      email, 
      firstName, 
      lastName, 
      birthDate, 
      postalCode, 
      gender, 
      password 
    } = result.data;
    
    // Criar cliente Supabase Admin
    const supabase = createAdminClient();
    
    // Verificar se o telefone já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('client_users')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle();
      
    if (checkError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone existente: ' + checkError.message 
      }, { status: 500 });
    }
    
    // Se o telefone já existe, retornar erro
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Este telefone já está registrado. Faça login em vez disso.' 
      }, { status: 409 });
    }
    
    // Inserir na tabela client_users primeiro
    const { data: clientUser, error: insertError } = await supabase
      .from('client_users')
      .insert({
        phone,
        email: email || null,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        postal_code: postalCode,
        gender,
        password: null, // ✅ Não armazenar password em texto plano
        created_at: new Date().toISOString()
      })
      .select('id, first_name, last_name, phone, email')
      .single();
      
    if (insertError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar usuário: ' + insertError.message 
      }, { status: 500 });
    }
    
    // Gerar email temporário se não fornecido
    const userEmail = email || `client_${clientUser.id}@temp.snap.com`;
    
    // Criar no Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true, // Marcar como confirmado para não exigir verificação
      user_metadata: {
        client_user_id: clientUser.id, // ✅ CRÍTICO: Conectar com client_users
        first_name: firstName,
        last_name: lastName,
        phone: phone
      }
    });
    
    if (authError) {
      // Se falhou criar no Auth, remover da tabela client_users
      await supabase
        .from('client_users')
        .delete()
        .eq('id', clientUser.id);
        
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar conta: ' + authError.message 
      }, { status: 500 });
    }
    
    // IMPORTANTE: Fazer login automático após registro
    let sessionData = null;
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      });
      
      if (!loginError && loginData.user) {
        sessionData = loginData;
        
        // ✅ GARANTIR que metadados estão corretos após login
        if (!loginData.user.user_metadata?.client_user_id) {
          await supabase.auth.admin.updateUserById(
            loginData.user.id,
            {
              user_metadata: {
                client_user_id: clientUser.id,
                first_name: firstName,
                last_name: lastName,
                phone: phone
              }
            }
          );
        }
      }
    } catch (autoLoginError) {
      // Login automático falhou, mas registro foi bem-sucedido
    }
    
    // Retornar dados do usuário (sem senha)
    return NextResponse.json({
      success: true,
      user: {
        id: clientUser.id,
        firstName: clientUser.first_name,
        lastName: clientUser.last_name,
        phone: clientUser.phone,
        email: clientUser.email
      },
      session: sessionData // Para auto-login no frontend
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