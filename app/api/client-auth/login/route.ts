import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  password: z.string().min(1, "Senha é obrigatória")
});

// Chave JWT secreta
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-temporaria';
const JWT_EXPIRY = '7d'; // 7 dias

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
    
    // Inicializar cliente Supabase com a chave anônima (não precisa da chave de serviço)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Variáveis de ambiente do Supabase não configuradas');
      return NextResponse.json({ 
        success: false, 
        error: 'Configuração inválida do servidor' 
      }, { status: 500 });
    }
    
    const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
    
    console.log('Buscando usuário pelo telefone:', phone.substring(0, 3) + '****');
    
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
    
    // Criar token JWT
    const token = sign(
      { 
        id: userData.id,
        phone: userData.phone,
        email: userData.email 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );
    
    // Definir cookie
    cookies().set('client_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
      path: '/'
    });
    
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