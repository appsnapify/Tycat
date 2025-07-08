// Cliente Supabase dedicado para login/cliente - completamente isolado
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

// Cliente isolado com configuração específica para login/cliente
export const createLoginClienteSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Evitar conflitos com outros sistemas
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Source': 'login-cliente-isolated' // Identificador único
      }
    }
  })
}

// Cache simples para evitar múltiplas instâncias
let supabaseInstance: ReturnType<typeof createLoginClienteSupabase> | null = null

export const getLoginClienteSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createLoginClienteSupabase()
  }
  return supabaseInstance
}

// Função de limpeza para testes
export const resetLoginClienteSupabase = () => {
  supabaseInstance = null
} 