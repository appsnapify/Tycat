import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente singleton para evitar múltiplas instâncias
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

export const createReadOnlyClient = () => {
  // Retornar instância existente se já criada
  if (clientInstance) {
    return clientInstance
  }

  // Criar nova instância
  clientInstance = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false // Não persistir sessão para read-only
      }
    }
  )

  return clientInstance
} 