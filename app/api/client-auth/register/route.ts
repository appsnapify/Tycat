import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';

// Schema de validação
const registerSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  email: z.string().email("Email inválido").optional().nullable(),
  first_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  last_name: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  postal_code: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

export async function POST(request: Request) {
  try {
    console.log('Iniciando registro de cliente');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('Dados recebidos para registro:', { 
      phone: body.phone ? `${body.phone.substring(0, 3)}****` : 'não informado',
      email: body.email ? `${body.email.substring(0, 3)}****` : 'não informado',
      first_name: body.first_name || 'não informado',
      last_name: body.last_name || 'não informado',
      postal_code: body.postal_code || 'não informado',
      has_password: !!body.password,
      birth_date: body.birth_date || 'não informado'
    });
    
    // Validar dados
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      console.error('Erro de validação:', result.error.format());
      
      // Melhorar formato das mensagens de erro
      const errorDetails = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: errorDetails,
        validation_errors: result.error.issues
      }, { status: 400 });
    }

    const userData = result.data;
    
    // Verificar se email é obrigatório para esta implementação
    if (!userData.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email é obrigatório para criar conta' 
      }, { status: 400 });
    }
    
    // Inicializar cliente Supabase Admin
    const supabase = createAdminClient();
    
    // FLUXO CORRIGIDO: 
    // 1. Primeiro verificar se telefone já existe na tabela client_users
    const { data: existingUser, error: checkError } = await supabase
      .from('client_users')
      .select('id, phone')
      .eq('phone', userData.phone)
      .maybeSingle();
      
    if (checkError) {
      console.error('Erro ao verificar telefone existente:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar dados' 
      }, { status: 500 });
    }
    
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Este telefone já está registrado' 
      }, { status: 409 });
    }
    
    // 2. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone
      }
    });
    
    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Este email já está registrado' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar conta de autenticação' 
      }, { status: 500 });
    }
    
    if (!authData.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar conta de autenticação' 
      }, { status: 500 });
    }
    
    // 3. Criar entrada na tabela client_users com o ID do Auth
    // NOTA: Password é gerida apenas pelo Supabase Auth, não na tabela client_users
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .insert({
        id: authData.user.id, // Usar o mesmo ID do Auth para linking
        phone: userData.phone,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        birth_date: userData.birth_date,
        postal_code: userData.postal_code,
        gender: userData.gender
      })
      .select()
      .single();
      
    if (clientError) {
      console.error('Erro ao criar entrada na tabela client_users:', clientError);
      
      // Limpar usuário do Auth se falhou criar na tabela
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('Usuário removido do Auth devido a falha na tabela client_users');
      } catch (cleanupError) {
        console.error('Erro ao limpar usuário do Auth:', cleanupError);
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao criar entrada na base de dados' 
      }, { status: 500 });
    }
    
    console.log('Cliente registrado com sucesso:', { id: clientData.id });
    
    // Retornar dados do usuário (sem senha)
    return NextResponse.json({ 
      success: true, 
      user: {
        id: clientData.id,
        firstName: clientData.first_name,
        lastName: clientData.last_name,
        phone: clientData.phone,
        email: clientData.email
      }
    });
    
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 