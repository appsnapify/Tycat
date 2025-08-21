/**
 * Script para executar a migração SQL para corrigir políticas RLS
 * Executa o arquivo SQL diretamente no Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
    const resolvedPath = path.resolve(filePath);
    return await fs.promises.readFile(resolvedPath, 'utf8');
  } catch (error) {
    throw new Error(`Erro ao ler arquivo: ${error.message}`);
  }
}

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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
    
    // Lê o arquivo SQL de migração de forma segura
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'guests_table_rls_fix.sql');
    
    // Definir diretórios permitidos para leitura
    const allowedDirectories = [
      path.join(__dirname, '..', 'supabase', 'migrations'),
      path.join(__dirname, '..', 'migrations')
    ];
    
    console.log('Validando caminho seguro:', migrationPath);
    const sqlContent = await readFileSecurely(migrationPath, allowedDirectories);
    
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