// Script para aplicação de migrações SQL diretamente via API do Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Valida se o caminho do arquivo é seguro contra path traversal
 * @param {string} filePath - Caminho do arquivo para validar
 * @param {string[]} allowedDirectories - Diretórios permitidos
 * @returns {boolean} - True se o caminho for seguro
 */
function isSecurePath(filePath, allowedDirectories) {
  try {
    // Normalizar o caminho para prevenir bypass
    const normalizedPath = path.normalize(filePath);
    
    // Verificar se contém sequências de path traversal
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      console.error('Path traversal detectado:', normalizedPath);
      return false;
    }
    
    // Verificar se o caminho está dentro dos diretórios permitidos
    const absolutePath = path.resolve(normalizedPath);
    const isInAllowedDirectory = allowedDirectories.some(dir => {
      const allowedPath = path.resolve(dir);
      return absolutePath.startsWith(allowedPath);
    });
    
    if (!isInAllowedDirectory) {
      console.error('Caminho fora dos diretórios permitidos:', absolutePath);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro na validação do caminho:', error);
    return false;
  }
}

/**
 * Lê arquivo de forma segura com validação de caminho
 * @param {string} filePath - Caminho do arquivo
 * @param {string[]} allowedDirectories - Diretórios permitidos
 * @returns {string|null} - Conteúdo do arquivo ou null se inválido
 */
async function readFileSecurely(filePath, allowedDirectories) {
  if (!isSecurePath(filePath, allowedDirectories)) {
    throw new Error(`Acesso negado: caminho inseguro ou não permitido: ${filePath}`);
  }
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Erro ao ler arquivo: ${error.message}`);
  }
}

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
    // Definir diretórios permitidos para leitura
    const allowedDirectories = [
      path.join(__dirname, '..', 'supabase', 'migrations'),
      path.join(__dirname, '..', 'migrations')
    ];
    
    // Ler o conteúdo do arquivo SQL de forma segura
    console.log('Validando caminho seguro:', migration.path);
    const sqlContent = await readFileSecurely(migration.path, allowedDirectories);
    
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