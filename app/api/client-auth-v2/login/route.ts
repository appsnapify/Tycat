import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY } from '@/lib/constants';

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  password: z.string().min(1, "Senha é obrigatória")
});

export async function POST(request: Request) {
  try {
    console.log('[V2] Iniciando login de cliente');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('[V2] Dados recebidos para login:', { 
      phone: body.phone ? `${body.phone.substring(0, 3)}****` : 'não informado',
      has_password: !!body.password
    });
    
    // Validar dados
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      console.error('[V2] Erro de validação:', result.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { phone, password } = result.data;
    
    // Inicializar cliente Supabase
    const supabase = createAdminClient();
    
    // SOLUÇÃO: Usar consulta direta em vez de função RPC que pode não existir
    // 1. Primeiro encontramos o usuário pelo telefone
    console.log('[V2] Buscando usuário pelo telefone:', phone.substring(0, 3) + '****');
    
    // Construir consulta OR para verificar múltiplos formatos do telefone
    // Isso aumenta a chance de encontrar o usuário independente do formato do telefone
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email, password')
      .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-9)}`)
      .maybeSingle();
      
    if (userError) {
      console.error('[V2] Erro ao buscar usuário:', userError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone' 
      }, { status: 500 });
    }
    
    // Verificar se o usuário foi encontrado
    if (!userData) {
      console.log('[V2] Nenhum usuário encontrado com o telefone informado');
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone ou senha incorretos' 
      }, { status: 401 });
    }
    
    // Verificar senha
    console.log('[V2] Verificando senha para usuário:', userData.id);
    
    // Comparação direta de senha - em produção usar bcrypt ou similar
    if (userData.password !== password) {
      console.log('[V2] Senha incorreta para o usuário:', userData.id);
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
    
    console.log('[V2] Login realizado com sucesso:', { id: userData.id });
    
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
    console.error('[V2] Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 