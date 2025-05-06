/**
 * Script para executar a migração SQL para corrigir políticas RLS
 * Executa o arquivo SQL diretamente no Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xejpwdpumzalewamttjv.supabase.co';
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ADMIN_KEY;

// Verifica se a chave de administrador está disponível
if (!supabaseAdminKey) {
  console.error('Erro: SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ADMIN_KEY não definida.');
  console.error('Execute o script com: SUPABASE_SERVICE_ROLE_KEY=sua_chave node scripts/run_migration.js');
  process.exit(1);
}

// Cria o cliente Supabase com a chave de administrador
const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function main() {
  try {
    console.log('Iniciando migração para corrigir políticas RLS...');
    
    // Lê o arquivo SQL de migração
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'guests_table_rls_fix.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Executa o SQL usando a função RPC
    console.log('Executando SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Erro ao executar SQL:', error);
      process.exit(1);
    }
    
    console.log('Migração concluída com sucesso!');
    console.log('Resultado:', data);
    
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

main(); 