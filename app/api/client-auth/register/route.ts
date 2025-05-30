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
      has_password: !!body.password
    });
    
    // Validar dados
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      console.error('Erro de validação:', result.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.issues.map(issue => issue.message).join(', ')
      }, { status: 400 });
    }
    
    const userData = result.data;
    
    // Inicializar cliente Supabase
    const supabase = createAdminClient();
    
    // Usar função RPC para registrar usuário
    const { data, error } = await supabase.rpc('register_client_user', {
      p_phone: userData.phone,
      p_email: userData.email || null,
      p_first_name: userData.first_name,
      p_last_name: userData.last_name || null,
      p_birth_date: userData.birth_date || null,
      p_postal_code: userData.postal_code || null,
      p_gender: userData.gender || null,
      p_password: userData.password
    });
    
    if (error) {
      console.error('Erro ao registrar cliente:', error);
      
      // Verificar se é erro de duplicidade
      if (error.message.includes('já registrado')) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 409 }); // Conflict
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao registrar cliente' 
      }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      console.error('Nenhum dado retornado ao registrar cliente');
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao registrar cliente: Nenhum dado retornado' 
      }, { status: 500 });
    }
    
    const user = data[0];
    console.log('Cliente registrado com sucesso:', { id: user.id });
    
    // Retornar dados do usuário (sem senha)
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
    
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 