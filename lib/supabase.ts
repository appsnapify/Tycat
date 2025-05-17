import { createBrowserClient as actualCreateBrowserClient } from './supabase/client'; // Renomeado para evitar conflito de nome na reexportação
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// A função createClient agora simplesmente retorna o cliente singleton do browser.
export const createClient = (): SupabaseClient<Database> => {
  return actualCreateBrowserClient();
};

// Nota: Se precisar de um cliente de servidor aqui no futuro (para SSR em Pages Router ou funções legadas),
// deverá importar de lib/supabase/server.ts ou similar.
// Por agora, este ficheiro só lida com o encaminhamento para o cliente de browser singleton. 