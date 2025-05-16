// Script para aplicação de migrações SQL diretamente via API do Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidas');
  process.exit(1);
}

// Criar cliente Supabase Admin
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Lista de migrações a serem aplicadas
const migrations = [
  {
    name: 'create_guest_safely',
    path: path.join(__dirname, '../migrations/create_guest_safely.sql')
  },
  {
    name: 'auth_functions',
    path: path.join(__dirname, '../migrations/auth_functions.sql')
  }
];

// Função para aplicar uma migração
async function applyMigration(migration) {
  console.log(`Aplicando migração: ${migration.name}`);
  
  try {
    // Ler o conteúdo do arquivo SQL
    const sqlContent = fs.readFileSync(migration.path, 'utf8');
    
    // Executar o SQL usando função RPC do Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error(`Erro ao aplicar migração ${migration.name}:`, error);
      return false;
    }
    
    console.log(`Migração ${migration.name} aplicada com sucesso!`);
    return true;
  } catch (err) {
    console.error(`Erro ao ler ou executar migração ${migration.name}:`, err);
    return false;
  }
}

// Aplicar todas as migrações em sequência
async function applyMigrations() {
  console.log('Iniciando aplicação de migrações...');
  
  let success = true;
  
  for (const migration of migrations) {
    const result = await applyMigration(migration);
    if (!result) {
      success = false;
      console.error(`Falha na migração ${migration.name}`);
    }
  }
  
  if (success) {
    console.log('Todas as migrações foram aplicadas com sucesso!');
  } else {
    console.error('Algumas migrações falharam. Verifique os logs para mais detalhes.');
  }
}

// Executar as migrações
applyMigrations().catch(err => {
  console.error('Erro ao aplicar migrações:', err);
  process.exit(1);
}); 