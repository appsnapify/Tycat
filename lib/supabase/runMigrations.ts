'use server';

import { createAdminClient } from '@/lib/supabase/adminClient';
import fs from 'fs';
import path from 'path';

/**
 * Executa uma migração SQL específica
 */
export async function runMigration(migrationName: string) {
  try {
    const supabase = createAdminClient();
    
    // Verificar autenticação primeiro
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.warn('Tentativa de executar migração sem autenticação');
      return {
        success: false,
        message: 'Autenticação necessária para executar migrações'
      };
    }
    
    // Verificar se a migração já foi executada
    const { data: existingMigrations, error: checkError } = await supabase
      .from('migrations')
      .select('*')
      .eq('name', migrationName)
      .maybeSingle();
    
    if (checkError) {
      // Se a tabela migrations não existir, vamos criá-la
      if (checkError.code === '42P01') { // Código para "relation does not exist"
        console.log('Tabela de migrações não existe, criando...');
        const { error: createTableError } = await supabase.rpc('exec_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS migrations (
              id SERIAL PRIMARY KEY,
              name TEXT UNIQUE NOT NULL,
              executed_at TIMESTAMPTZ DEFAULT NOW()
            );
          `
        });
        
        if (createTableError) {
          console.error('Erro ao criar tabela de migrações:', createTableError);
          return {
            success: false,
            message: `Erro ao criar tabela de migrações: ${createTableError.message}`
          };
        }
      } else {
        throw checkError;
      }
    }
    
    // Se a migração já foi executada, retornar
    if (existingMigrations) {
      console.log(`Migração ${migrationName} já foi executada.`);
      return {
        success: true,
        message: `Migração ${migrationName} já foi executada.`
      };
    }
    
    // Ler o conteúdo do arquivo de migração
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', `${migrationName}.sql`);
    
    if (!fs.existsSync(migrationPath)) {
      return {
        success: false,
        message: `Arquivo de migração não encontrado: ${migrationName}.sql`
      };
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migração usando RPC
    console.log(`Executando migração: ${migrationName}`);
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (migrationError) {
      console.error('Erro ao executar migração:', migrationError);
      return {
        success: false,
        message: `Erro ao executar SQL: ${migrationError.message}`
      };
    }
    
    // Registrar a migração como executada
    const { error: insertError } = await supabase
      .from('migrations')
      .insert({ name: migrationName });
    
    if (insertError) {
      console.error('Erro ao registrar migração:', insertError);
      return {
        success: false,
        message: `Migração executada mas não registrada: ${insertError.message}`
      };
    }
    
    console.log(`Migração ${migrationName} executada com sucesso.`);
    return {
      success: true,
      message: `Migração ${migrationName} executada com sucesso.`
    };
    
  } catch (error) {
    console.error(`Erro ao executar migração ${migrationName}:`, error);
    return {
      success: false,
      message: `Erro ao executar migração: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Executa todas as migrações pendentes
 */
export async function runPendingMigrations() {
  try {
    // Diretório de migrações
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('Diretório de migrações não encontrado:', migrationsDir);
      return {
        success: false,
        message: `Diretório de migrações não encontrado: ${migrationsDir}`
      };
    }
    
    // Ler todos os arquivos SQL no diretório
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => file.replace('.sql', ''));
    
    console.log(`Encontradas ${migrationFiles.length} migrações para processar`);
    
    // Executar cada migração
    const results = [];
    for (const migrationName of migrationFiles) {
      console.log(`Processando migração: ${migrationName}`);
      const result = await runMigration(migrationName);
      results.push({ migrationName, ...result });
    }
    
    return {
      success: true,
      results
    };
    
  } catch (error) {
    console.error('Erro ao executar migrações pendentes:', error);
    return {
      success: false,
      message: `Erro ao executar migrações pendentes: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 