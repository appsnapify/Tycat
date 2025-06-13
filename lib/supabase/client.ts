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

// Função para limpeza cirúrgica de cookies corrompidos
function cleanupCorruptedCookies() {
  try {
    if (typeof window === 'undefined') return // Proteção SSR
    
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      
      // Verificar apenas cookies Supabase que começam com base64-
      if (name?.includes('supabase') && value?.startsWith('base64-')) {
        try {
          // Tentar parsing do conteúdo base64 - se falhar, é corrupto
          JSON.parse(value.substring(7))
        } catch {
          // Cookie corrupto detectado - remover apenas este específico
          console.log(`[Auth] Removendo cookie corrupto: ${name}`)
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`
        }
      }
    })
  } catch (error) {
    // Falha silenciosa para manter compatibilidade total
    console.warn('[Auth] Aviso: Não foi possível verificar cookies:', error)
  }
}

export const createClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('createClient deve ser usado apenas no navegador. Use createServerClient para o servidor.')
  }

  // Retornar instância existente se já criada
  if (clientInstance) {
    return clientInstance
  }

  // Limpeza preventiva de cookies corrompidos
  cleanupCorruptedCookies()

  // Criar nova instância usando configuração nativa do Supabase
  clientInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )

  return clientInstance
}

// Função para resetar o cliente (útil para testes ou logout)
export const resetClient = () => {
  clientInstance = null
} 