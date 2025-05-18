import { createBrowserClient } from '@supabase/ssr';
import { type Database } from '@/types/supabase';

/**
 * Singleton para o cliente Supabase do navegador (usando @supabase/ssr)
 * Usado para evitar o aviso: "Multiple GoTrueClient instances detected in the same browser context"
 */

// Variáveis para o singleton
let supabaseSingletonInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Função que cria ou retorna a instância já existente
export const createClient = () => {
  // Se já existe uma instância, retorne-a
  if (supabaseSingletonInstance) {
    return supabaseSingletonInstance;
  }

  // Se não existe, crie uma nova instância
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL ou chave anônima não definidos. Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  supabaseSingletonInstance = createBrowserClient<Database>(supabaseUrl, supabaseKey);

  return supabaseSingletonInstance;
};

// Exportar também uma função para limpar o cliente singleton (útil para testes)
export const clearClient = () => {
  supabaseSingletonInstance = null;
}; 