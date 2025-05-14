import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton para o cliente Supabase
 * Usado para evitar o aviso: "Multiple GoTrueClient instances detected in the same browser context"
 */

// Variáveis para o singleton
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

// Função que cria ou retorna a instância já existente
export const createClient = () => {
  // Se já existe uma instância, retorne-a
  if (supabaseClient) {
    return supabaseClient;
  }

  // Se não existe, crie uma nova instância
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL ou chave anônima não definidos');
  }

  supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
};

// Exportar também uma função para limpar o cliente singleton (útil para testes)
export const clearClient = () => {
  supabaseClient = null;
}; 