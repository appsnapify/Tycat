import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Variáveis de ambiente
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
  if (typeof window === 'undefined') {
    throw new Error('createClient deve ser usado apenas no navegador. Use createServerClient para o servidor.')
  }

  // Retornar instância existente se já criada
  if (clientInstance) {
    return clientInstance
  }

  // Criar nova instância com configuração de cookies melhorada
  clientInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : ''
        },
        set(name: string, value: string, options: { path?: string; domain?: string; secure?: boolean; sameSite?: string; maxAge?: number; expires?: Date }) {
          const cookieValue = encodeURIComponent(value)
          document.cookie = `${name}=${cookieValue}; path=${options.path || '/'}; max-age=${options.maxAge || 60 * 60 * 24 * 7}; samesite=${options.sameSite || 'lax'}; secure=${options.secure !== false}`
        },
        remove(name: string, options: { path?: string }) {
          document.cookie = `${name}=; path=${options.path || '/'}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      }
    }
  )

  return clientInstance
}

// Função para resetar o cliente (útil para testes ou logout)
export const resetClient = () => {
  clientInstance = null
} 