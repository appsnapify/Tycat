import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Schema de validação para o registro
const registerSchema = z.object({
  phone: z.string().min(9).max(15),
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  postalCode: z.string().regex(/^\d{4}-\d{3}$/, 'Formato: 0000-000'),
  gender: z.enum(['M', 'F', 'O']).optional(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  try {
    // Extrair e validar o corpo da requisição
    const body = await request.json();
    console.log("Dados recebidos para registro:", { ...body, password: '***' });
    
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      console.error("Erro na validação:", result.error.format());
      return NextResponse.json(
        { error: 'Dados de registro inválidos', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { 
      phone, email, firstName, lastName, 
      birthDate, postalCode, gender, password 
    } = result.data;
    
    // Normalizar o telefone
    let normalizedPhone = phone.replace(/[\s\-()]/g, '');
    let phoneWithoutPrefix = normalizedPhone;
    let phoneWithPrefixPT = normalizedPhone;
    
    // Processar diferentes formatos de telefone
    if (normalizedPhone.startsWith('+')) {
      // Se começa com +, extrair o número sem prefixo
      phoneWithoutPrefix = normalizedPhone.replace(/^\+\d{1,4}/, '');
    } else if (normalizedPhone.startsWith('00')) {
      // Se começa com 00, extrair o número sem prefixo
      phoneWithoutPrefix = normalizedPhone.replace(/^00\d{1,4}/, '');
    } else {
      // Se não tem prefixo, adicionar o prefixo de Portugal
      phoneWithPrefixPT = '+351' + normalizedPhone;
    }
    
    console.log('Verificando as seguintes variações de telefone:', {
      original: phone,
      normalizado: normalizedPhone,
      semPrefixo: phoneWithoutPrefix,
      comPrefixoPT: phoneWithPrefixPT
    });
    
    // Criar um único cliente Supabase com service_role para esta rota
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    
    // Verificar se o telefone já está registrado (incluindo variações)
    const { data: existingUser, error: checkError } = await supabase
      .from('client_users')
      .select('id, phone')
      .or(`phone.eq.${normalizedPhone},phone.eq.${phoneWithoutPrefix},phone.eq.${phoneWithPrefixPT}`)
      .maybeSingle();
    
    if (checkError) {
      console.error('Erro ao verificar usuário existente:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar cadastro existente' },
        { status: 500 }
      );
    }
    
    if (existingUser) {
      console.log('Telefone já registrado:', existingUser);
      return NextResponse.json(
        { error: 'Número de telefone já registrado', existingPhone: existingUser.phone },
        { status: 409 }
      );
    }
    
    // Verificar se o email já está registrado (se fornecido)
    if (email) {
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('client_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (emailCheckError) {
        console.error('Erro ao verificar email existente:', emailCheckError);
        return NextResponse.json(
          { error: 'Erro ao verificar email existente' },
          { status: 500 }
        );
      }
      
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email já registrado' },
          { status: 409 }
        );
      }
    }
    
    // 1. Primeiro, criar o usuário no sistema de auth do Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto confirmar email para evitar processo de verificação
      user_metadata: {
        phone: phone,
        first_name: firstName,
        last_name: lastName,
        client_user_id: null // Será atualizado após criação
      }
    });
    
    if (authError) {
      console.error('Erro ao criar usuário na autenticação:', authError);
      return NextResponse.json(
        { error: 'Erro ao criar conta de autenticação', details: authError.message },
        { status: 500 }
      );
    }
    
    if (!authData.user) {
      console.error('Falha ao criar usuário na autenticação: retorno vazio');
      return NextResponse.json(
        { error: 'Falha ao criar conta de autenticação' },
        { status: 500 }
      );
    }
    
    // 2. Depois, criar o registro na tabela client_users com o ID do auth user
    const { data: newUser, error: createError } = await supabase
      .from('client_users')
      .insert({
        id: authData.user.id, // Usar o ID da autenticação para vincular as contas
        phone: phoneWithPrefixPT, // Sempre salvar com o prefixo de Portugal para padronização
        email,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        postal_code: postalCode,
        gender,
        password // Nota: O password seria idealmente hasheado antes ou pelo Supabase via trigger
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('Erro detalhado ao criar usuário:', JSON.stringify(createError));
      
      // Se falhar a criação do usuário na tabela, tentar remover o usuário de auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      // Verificar se é um erro de violação de restrição única
      if (createError.code === '23505') {
        if (createError.message.includes('email')) {
          return NextResponse.json(
            { error: 'Este email já está registrado' },
            { status: 409 }
          );
        }
        if (createError.message.includes('phone')) {
          return NextResponse.json(
            { error: 'Este telefone já está registrado' },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Falha ao criar conta', details: createError.message },
        { status: 500 }
      );
    }
    
    // 3. Atualizar metadados e retornar resposta sem criar sessão automática
    try {
      // Atualizar metadados do usuário para incluir o client_user_id
      await supabase.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          ...authData.user.user_metadata,
          client_user_id: newUser.id
        }
      });
      
      // Não fazer login automático aqui - isso será gerenciado pelo cliente
      // Apenas retornar os dados necessários
      
      return NextResponse.json({
        success: true,
        userId: newUser.id,
        authId: authData.user.id
      });
    } catch (sessionError) {
      console.error('Exceção ao atualizar metadados:', sessionError);
      // Retornar sucesso mesmo com erro de metadados
      return NextResponse.json({
        success: true,
        userId: newUser.id,
        authId: authData.user.id,
        warning: 'Conta criada, mas metadados podem estar incompletos'
      });
    }
    
  } catch (error) {
    console.error('Erro no registro de cliente:', error);
    
    // Fornecer mais detalhes do erro para depuração
    let errorMessage = 'Falha ao processar solicitação de registro';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = { 
        name: error.name,
        stack: error.stack 
      };
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
} 