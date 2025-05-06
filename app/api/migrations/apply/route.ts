import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Admin para migrations (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xejpwdpumzalewamttjv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * API para aplicar migrações SQL no banco de dados
 * Só deve ser usada em desenvolvimento ou por administradores
 */
export async function POST(request: NextRequest) {
  try {
    // Extrair dados do corpo da requisição
    const data = await request.json();
    const { migration_name } = data;
    
    console.log(`Aplicando migração: ${migration_name}`);
    
    // Verificar se a migração é permitida
    const allowedMigrations = [
      'add_qr_code_url_column'
    ];
    
    if (!allowedMigrations.includes(migration_name)) {
      return NextResponse.json({
        success: false,
        error: 'Migração não permitida'
      }, { status: 400 });
    }
    
    let sql = '';
    
    // SQL para adicionar coluna qr_code_url
    if (migration_name === 'add_qr_code_url_column') {
      sql = `
        DO $$
        BEGIN
            -- Verifica se a coluna já existe
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'guests' 
                AND column_name = 'qr_code_url'
            ) THEN
                -- Adiciona a coluna
                ALTER TABLE guests ADD COLUMN qr_code_url TEXT;
                
                -- Log da alteração
                RAISE NOTICE 'Coluna qr_code_url adicionada à tabela guests';
            ELSE
                RAISE NOTICE 'Coluna qr_code_url já existe na tabela guests';
            END IF;
        END $$;
      `;
    }
    
    // Executar a migração SQL
    const { data: result, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: sql
    });
    
    if (error) {
      console.error('Erro ao aplicar migração:', error);
      return NextResponse.json({
        success: false,
        error: `Erro ao aplicar migração: ${error.message}`
      }, { status: 500 });
    }
    
    // Verificar se a migração foi aplicada com sucesso
    const { data: columnCheck, error: checkError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'guests' 
        AND column_name = 'qr_code_url'
      `
    });
    
    if (checkError) {
      console.error('Erro ao verificar coluna:', checkError);
    }
    
    console.log('Migração aplicada com sucesso:', result);
    console.log('Verificação de coluna:', columnCheck);
    
    return NextResponse.json({
      success: true,
      message: 'Migração aplicada com sucesso',
      verification: columnCheck
    });
    
  } catch (error) {
    console.error('Erro não tratado:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
} 