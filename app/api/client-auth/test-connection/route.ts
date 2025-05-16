import { NextResponse } from 'next/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Testando conexão com o Supabase');
    
    // Obter configurações do ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Verificar se as variáveis de ambiente estão definidas
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Variáveis de ambiente não configuradas');
      return NextResponse.json({
        success: false,
        error: 'Configuração incompleta',
        env: {
          url: !!supabaseUrl,
          anon: !!supabaseAnonKey
        }
      }, { status: 500 });
    }
    
    // Inicializar cliente do Supabase
    const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
    
    // Testar uma consulta simples
    const { data, error } = await supabase.from('client_users').select('count(*)');
    
    if (error) {
      console.error('Erro ao testar conexão:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso',
      data
    });
  } catch (err) {
    console.error('Erro ao testar conexão:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 