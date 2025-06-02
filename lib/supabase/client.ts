import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// As suas variáveis de ambiente devem ser carregadas automaticamente pelo Next.js
// desde que estejam definidas em .env.local e prefixadas com NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file."
  )
}

// Cliente singleton para evitar múltiplas instâncias
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const createClient = () => {
  // Retornar instância existente se já criada
  if (clientInstance) {
    return clientInstance
  }

  // Criar nova instância apenas se necessário
  clientInstance = createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  )

  return clientInstance
} 