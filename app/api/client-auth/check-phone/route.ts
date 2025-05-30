import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Cache simples em memória para armazenar verificações recentes
// Formato: {número: {exists: boolean, userId: string | null, timestamp: number}}
const phoneCache = new Map();

// Tempo de expiração do cache em milissegundos (10 minutos)
const CACHE_EXPIRY = 10 * 60 * 1000;

// Schema de validação
const phoneSchema = z.object({
  phone: z.string()
    .min(9, "Telefone deve ter pelo menos 9 dígitos")
    .max(15, "Telefone muito longo")
    .regex(/^\+?[1-9]\d{8,14}$/, "Formato de telefone inválido")
});

export async function POST(request: Request) {
  try {
    // Extrair e validar dados
    const body = await request.json();
    const result = phoneSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Formato de telefone inválido'
      }, { status: 400 });
    }

    const { phone } = result.data;

    // Inicializar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Variáveis de ambiente do Supabase não configuradas');
      return NextResponse.json({ 
        success: false, 
        error: 'Erro de configuração do servidor'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verificar existência do telefone
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (userError) {
      console.error('Erro ao verificar telefone:', userError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao processar solicitação'
      }, { status: 500 });
    }

    // Retornar informações completas sobre a existência do usuário
    return NextResponse.json({
      success: true,
      exists: !!userData,
      userId: userData?.id || null,
      nextStep: userData ? 'password' : 'register'
    });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao processar solicitação'
    }, { status: 500 });
  }
} 