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
    
    // Verificar senha
    console.log('Verificando senha para usuário:', userData.id);
    
    // Comparação direta de senha - em produção usar bcrypt ou similar
    if (userData.password !== password) {
      console.log('Senha incorreta para o usuário:', userData.id);
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      }, { status: 401 });
    }
    
    // Criar email temporário para o Supabase Auth se não existir
    let userEmail = userData.email;
    if (!userEmail) {
      userEmail = `client_${userData.id}@temp.snap.com`;
    }
    
    // Tentar fazer login no Supabase Auth
    console.log('Tentando criar sessão Supabase Auth para:', userData.id);
    
    try {
      // Primeiro, verificar se já existe uma conta auth para este email
      const { data: existingAuthUser } = await supabase.auth.admin.getUserByEmail(userEmail);
      
      if (existingAuthUser.user) {
        console.log('Usuário auth já existe, fazendo login...');
        
        // Tentar login com email e senha
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password
        });
        
        if (authError) {
          console.error('Erro no login Supabase Auth:', authError);
          // Se der erro, criar nova conta
          throw authError;
        }
        
        console.log('Login Supabase Auth bem-sucedido');
        
      } else {
        console.log('Criando nova conta auth...');
        
        // Criar nova conta no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userEmail,
          password: password,
          user_metadata: {
            client_user_id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone
          },
          email_confirm: true
        });
        
        if (authError) {
          console.error('Erro ao criar usuário auth:', authError);
          throw authError;
        }
        
        console.log('Conta auth criada com sucesso');
        
        // Agora fazer login
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password
        });
        
        if (loginError) {
          console.error('Erro no login após criação:', loginError);
          throw loginError;
        }
        
        console.log('Login após criação bem-sucedido');
      }
      
    } catch (authError) {
      console.error('Erro na autenticação Supabase:', authError);
      // Continuar sem sessão Supabase por agora
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