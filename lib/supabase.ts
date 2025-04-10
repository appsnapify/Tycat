import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Variável para armazenar a instância do cliente
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

export const createClient = () => {
  // Se já existe uma instância, retorna ela
  if (supabaseInstance) {
    return supabaseInstance
  }

  try {
    // Tentar criar o cliente com gerenciamento automático de cookies
    supabaseInstance = createClientComponentClient<Database>({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
    return supabaseInstance
  } catch (error) {
    console.error('Erro ao criar cliente Supabase com cookies:', error)
    
    // Fallback para criação básica de cliente sem gerenciamento de cookies
    supabaseInstance = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    return supabaseInstance
  }
}

// Exportar uma instância do cliente para uso direto - singleton pattern
export const supabase = createClient() 