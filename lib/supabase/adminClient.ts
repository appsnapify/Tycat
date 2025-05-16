import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validar configuração
if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas corretamente.');
}

/**
 * Cria um cliente Supabase com permissões administrativas (service role)
 * Use apenas em funções de API ou server actions seguras, nunca em código cliente
 */
export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // Versão global explícita para evitar conflitos
    global: {
      headers: { 
        'X-Client-Info': 'supabase-js/2.38.4'
      }
    }
  });
} 