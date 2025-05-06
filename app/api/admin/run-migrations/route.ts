import { NextRequest, NextResponse } from 'next/server';
import { runPendingMigrations, runMigration } from '@/lib/supabase/runMigrations';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Verificar se tem um token de segurança na query ou headers
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || req.headers.get('x-admin-token');
    
    // Definir um token no env para proteger este endpoint
    const adminToken = process.env.ADMIN_API_TOKEN;
    
    if (!adminToken) {
      return NextResponse.json(
        { error: 'Configuração incompleta: ADMIN_API_TOKEN não definido' },
        { status: 500 }
      );
    }
    
    if (token !== adminToken) {
      return NextResponse.json(
        { error: 'Token de acesso inválido' },
        { status: 401 }
      );
    }
    
    // Obter o nome da migração específica (opcional)
    const migrationName = url.searchParams.get('migration');
    
    // Executar migração específica ou todas pendentes
    let result;
    if (migrationName) {
      result = await runMigration(migrationName);
    } else {
      result = await runPendingMigrations();
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
    return NextResponse.json(
      {
        error: 'Falha ao executar migrações',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Verificar se a requisição vem de um administrador
async function isAdmin(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  return data.role === 'admin' || data.role === 'super_admin';
}

export async function POST(request: Request) {
  try {
    // Obter o token de autenticação da requisição
    const cookieStore = cookies();
    const supabase = createAdminClient();
    
    // Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Não autorizado - Faça login como administrador' },
        { status: 401 }
      );
    }
    
    // Verificar se o usuário é administrador
    const isUserAdmin = await isAdmin(session.user.id);
    
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Não autorizado - Acesso apenas para administradores' },
        { status: 403 }
      );
    }
    
    // Executar migrações
    const result = await runPendingMigrations();
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao executar migrações',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 