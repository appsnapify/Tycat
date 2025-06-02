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

// A função getSupabaseBrowserClient foi removida pois agora usamos um cliente singleton
// centralizado em lib/supabase/singleton-client.ts e acedido via lib/supabase.ts.

// Nota: A versão original do seu ficheiro tinha funções como:
// - createBrowserClientWithoutPersistence
// - resetBrowserClient
// Estas não são padrão com @supabase/auth-helpers-nextjs e foram removidas por agora.
// Se precisar de funcionalidades específicas como não persistir a sessão para certos casos,
// podemos discutir como conseguir isso de forma compatível com os Auth Helpers. 

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
          return cookie ? cookie.split('=')[1] : ''
        },
        set(name: string, value: string, options: { path?: string; domain?: string; secure?: boolean; sameSite?: string; maxAge?: number; expires?: Date }) {
          document.cookie = `${name}=${value}; path=${options.path || '/'}; max-age=${options.maxAge || 60 * 60 * 24 * 7}; samesite=${options.sameSite || 'lax'}; secure=${options.secure !== false}`
        },
        remove(name: string, options: { path?: string }) {
          document.cookie = `${name}=; path=${options.path || '/'}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      }
    }
  )
} 