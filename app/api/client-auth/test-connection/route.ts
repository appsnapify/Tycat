import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // Criar cliente Supabase
    const supabase = await createClient();
    
    // Tentar uma operação simples de leitura para testar a conexão
    const { data, error, status } = await supabase
      .from('client_users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Erro ao testar conexão com Supabase:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Falha na conexão', 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      );
    }
    
    // Verificar informações de ambiente
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'Não configurado',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado'
    };
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexão estabelecida com sucesso',
      status,
      environment: environmentInfo
    });
    
  } catch (error) {
    console.error('Exceção ao testar conexão com Supabase:', error);
    
    let errorMessage = 'Falha ao testar conexão';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = { 
        name: error.name,
        stack: error.stack 
      };
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage, 
        details: errorDetails 
      },
      { status: 500 }
    );
  }
} 