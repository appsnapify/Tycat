import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Cache simples em memória para armazenar verificações recentes
// Formato: {número: {exists: boolean, userId: string | null, timestamp: number}}
const phoneCache = new Map();

// Tempo de expiração do cache em milissegundos (10 minutos)
const CACHE_EXPIRY = 10 * 60 * 1000;

// Schema de validação para o telefone
const phoneSchema = z.object({
  phone: z.string().min(8, "Telefone inválido")
});

export async function POST(request: Request) {
  try {
    console.log('Iniciando verificação de telefone');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('Dados recebidos:', { 
      phone: body.phone ? `${body.phone.substring(0, 3)}****` : 'não informado' 
    });
    
    // Validar dados
    const result = phoneSchema.safeParse(body);
    if (!result.success) {
      console.error('Erro de validação:', result.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { phone } = result.data;
    
    // Inicializar cliente Supabase com chave anônima
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Erro: Variáveis de ambiente do Supabase não configuradas');
      return NextResponse.json({ 
        success: false, 
        error: 'Configuração inválida do servidor' 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Usar consulta SQL direta
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao verificar telefone:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone: ' + error.message
      }, { status: 500 });
    }
    
    // Retornar resultado
    console.log(`Telefone ${data ? 'já existe' : 'não encontrado'} no sistema`);
    
    return NextResponse.json({ 
      success: true, 
      exists: !!data,
      userId: data?.id || null
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