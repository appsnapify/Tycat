import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { normalizePhone, getPhoneVariations, buildPhoneQuery } from '@/lib/utils/phoneUtils';

// Schema de validação para login
const loginSchema = z.object({
  phone: z.string().min(9).max(15),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient();
    
    // Extrair e validar o corpo da requisição
    const body = await request.json();
    console.log('Dados recebidos para login:', { ...body, password: '***' });
    
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados de login inválidos', details: result.error },
        { status: 400 }
      );
    }
    
    let { phone, password } = result.data;
    
    // Normalizar o telefone
    const normalizedPhone = normalizePhone(phone);
    const phoneVariations = getPhoneVariations(phone);
    
    console.log('Telefone original:', phone);
    console.log('Telefone normalizado:', normalizedPhone);
    console.log('Variações de telefone geradas:', phoneVariations);
    
    // Extrair os últimos 8 dígitos para usar como base de busca
    // Isso ajuda a ignorar os códigos de país e facilitar a verificação
    const lastDigits = normalizedPhone.replace(/\D/g, '').slice(-8);
    console.log('Últimos 8 dígitos para busca:', lastDigits);
    
    // Verificar diretamente por ID quando estamos vindo da verificação de telefone
    let userId = null;
    if (body.userId) {
      console.log('ID de usuário fornecido diretamente:', body.userId);
      userId = body.userId;
      
      try {
        console.log('Tentando autenticação direta para o usuário com ID:', userId);
        
        // Usar a função verify_user_login que criamos
        const { data: authResult, error: authError } = await supabase.rpc('verify_user_login', {
          user_id: userId,
          user_password: password
        });
        
        console.log('Resultado da verificação de login:', {
          sucesso: authResult?.success,
          erro: authError ? authError.message : null
        });
        
        if (authError) {
          console.error('Erro ao verificar login:', authError);
        } else if (authResult && authResult.success === true) {
          console.log('Login verificado com sucesso via RPC');
          // Os dados já estão formatados para uso direto
          return handleSuccessfulLogin(authResult, cookieStore);
        } else {
          console.error('Senha incorreta ou problema na verificação');
        }
      } catch (authError) {
        console.error('Erro ao executar verificação de login:', authError);
      }
    }
    
    // MÉTODO 1: Consultar diretamente com cada variação de telefone
    console.log('MÉTODO 1: Verificando telefone com consultas separadas');
    let user = null;
    
    // Tentar encontrar o usuário com cada variação de telefone
    for (const phoneVar of phoneVariations) {
      console.log(`Verificando variação: ${phoneVar}`);
      
      const { data: varData, error: varError } = await supabase
        .from('client_users')
        .select('id, first_name, last_name, phone, email, password')
        .eq('phone', phoneVar)
        .maybeSingle();
      
      if (varError) {
        console.error(`Erro ao verificar variação ${phoneVar}:`, varError);
        continue;
      }
      
      if (varData) {
        console.log(`Usuário encontrado com telefone ${phoneVar}:`, { ...varData, password: '[REDACTED]' });
        console.log('Senha fornecida (hash):', password.substring(0, 3) + '...');
        console.log('Senha armazenada (hash):', varData.password?.substring(0, 3) + '...');
        
        if (varData.password === password) {
          user = varData;
          break;
        } else {
          console.error('Senha incorreta para usuário com telefone:', phoneVar);
        }
      }
    }
    
    // Se não encontrou, tentar com o método OR
    if (!user) {
      console.log('MÉTODO 2: Verificando telefone com método OR');
      const query = buildPhoneQuery(phone);
      console.log('Query gerada para busca:', query);
      
      const { data: orData, error: orError } = await supabase
      .from('client_users')
        .select('id, first_name, last_name, phone, email, password')
        .or(query)
      .maybeSingle();
      
      if (orError) {
        console.error('Erro ao verificar com método OR:', orError);
      } else if (orData) {
        console.log('Usuário encontrado com método OR:', { ...orData, password: '[REDACTED]' });
        console.log('Senha fornecida (hash):', password.substring(0, 3) + '...');
        console.log('Senha armazenada (hash):', orData.password?.substring(0, 3) + '...');
        
        if (orData.password === password) {
          user = orData;
        } else {
          console.error('Senha incorreta para usuário encontrado com método OR');
        }
      }
    }
    
    // Como último recurso, verificar se há algum usuário com telefone parecido
    if (!user && lastDigits.length >= 8) {
      console.log('MÉTODO 3: Buscando telefones similares pelos últimos dígitos');
      console.log(`Buscando telefones terminados em ${lastDigits}`);
      
      // Buscar telefones que terminam com os mesmos dígitos
      const { data: similarData, error: similarError } = await supabase
        .from('client_users')
        .select('id, first_name, last_name, phone, email, password')
        .filter('phone', 'ilike', `%${lastDigits}`)
        .maybeSingle();
      
      if (similarError) {
        console.error('Erro ao buscar telefones similares:', similarError);
      } else if (similarData) {
        console.log('Usuário encontrado com telefone similar:', { ...similarData, password: '[REDACTED]' });
        console.log('Senha fornecida (hash):', password.substring(0, 3) + '...');
        console.log('Senha armazenada (hash):', similarData.password?.substring(0, 3) + '...');
        
        if (similarData.password === password) {
          user = similarData;
        } else {
          console.error('Senha incorreta para usuário com telefone similar');
        }
      }
    }
    
    if (!user) {
      // Verificar todos os usuários e seus telefones para debug
      const { data: allUsers, error: allUsersError } = await supabase
        .from('client_users')
        .select('id, phone')
        .limit(10);
        
      if (!allUsersError && allUsers) {
        console.log('Primeiros 10 usuários na base para debug:', allUsers);
      }
      
      return NextResponse.json(
        { error: 'Telefone ou senha incorretos' },
        { status: 401 }
      );
    }
    
    return handleSuccessfulLogin(user, cookieStore);
    
  } catch (error) {
    console.error('Erro no login de cliente:', error);
    return NextResponse.json(
      { error: 'Falha ao processar solicitação de login' },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar login bem-sucedido
async function handleSuccessfulLogin(user: any, cookieStore: any) {
  // Log para debug
  console.log('Usuário encontrado com telefone:', user.phone);
  
  // Buscar o email associado ao usuário para autenticação
  if (!user.email) {
    return NextResponse.json(
      { error: 'Usuário sem email associado. Contate o suporte.' },
      { status: 400 }
    );
  }
  
  // Usar createServerClient com service role para ignorar RLS e poder autenticar
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
  
  try {
    // Criar sessão usando credenciais que existem em auth
    const { data: sessionData, error: sessionError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    
    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError);
      // Se falhar, tente criar admin session
      const { error: adminSessionError } = await authClient.auth.admin.updateUserById(
        user.id,
        { user_metadata: { client_user_id: user.id } }
      );
      
      if (adminSessionError) {
        console.error('Erro ao criar admin session:', adminSessionError);
        return NextResponse.json(
          { error: 'Erro ao autenticar usuário. Contate o suporte.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        email: user.email
      }
    });
  } catch (authError) {
    console.error('Erro na autenticação final:', authError);
    return NextResponse.json(
      { error: 'Falha na autenticação. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
} 