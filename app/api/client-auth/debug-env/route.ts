import { NextResponse } from 'next/server';

export async function GET() {
  // Verificar se estamos em ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint disponível apenas em ambiente de desenvolvimento' },
      { status: 403 }
    );
  }

  // Verificar variáveis de ambiente disponíveis (sem mostrar seus valores completos)
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'Não configurado',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'Não configurado'
  };

  // Verificar se a chave de serviço está configurada
  const missingKeys = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingKeys.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingKeys.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingKeys.push('SUPABASE_SERVICE_ROLE_KEY');

  return NextResponse.json({
    environment: envInfo,
    missingKeys,
    message: missingKeys.length > 0 
      ? `As seguintes variáveis de ambiente estão faltando: ${missingKeys.join(', ')}` 
      : 'Todas as variáveis de ambiente necessárias estão configuradas'
  });
} 