import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../../types/supabase'

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
let readOnlyClientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

// Função inteligente para limpeza de cookies corrompidos
function cleanupCorruptedCookies() {
  try {
    if (typeof window === 'undefined') return // Proteção SSR
    
    let cookiesRemoved = 0
    const processSupabaseCookie = (cookie: string) => {
      const [name, value] = cookie.trim().split('=')
      
      if (!name?.includes('supabase')) return
      
      try {
        validateSupabaseCookie(value)
      } catch {
        removeCorruptedCookie(name)
        cookiesRemoved++
      }
    }
    
    const validateSupabaseCookie = (value: string) => {
      if (value?.startsWith('base64-')) {
        const decoded = atob(value.substring(7))
        const parsed = JSON.parse(decoded)
        
        if (!parsed || typeof parsed !== 'object' || !parsed.access_token) {
          throw new Error('Token inválido')
        }
      } else if (value?.includes('eyJ') && !value.startsWith('base64-')) {
        throw new Error('Cookie JWT malformado')
      }
    }
    
    const removeCorruptedCookie = (name: string) => {
      console.log(`[Auth] 🧹 Removendo cookie corrupto: ${name}`)
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost`
    }
    
    document.cookie.split(';').forEach(processSupabaseCookie)
    
    if (cookiesRemoved > 0) {
      console.log(`[Auth] ✅ Limpeza concluída: ${cookiesRemoved} cookies corrompidos removidos`)
      // Forçar reload após limpeza para evitar problemas
      setTimeout(() => {
        if (cookiesRemoved > 2) { // Só reload se muitos cookies foram removidos
          console.log('[Auth] 🔄 Recarregando página após limpeza extensiva...')
          window.location.reload()
        }
      }, 100)
    }
  } catch (error) {
    console.warn('[Auth] ⚠️ Aviso: Não foi possível verificar cookies:', error)
  }
}

// Proxy SSR-safe que evita erros durante prerendering
function createSSRSafeProxy() {
  const emptyPromise = Promise.resolve({ data: null, error: null })
  const emptySession = Promise.resolve({ data: { session: null }, error: null })
  
  return {
    // Auth methods
    auth: {
      getSession: () => emptySession,
      getUser: () => emptyPromise,
      onAuthStateChange: () => ({ data: { subscription: null } }),
      signOut: () => emptyPromise,
      signInWithPassword: () => emptyPromise,
      signUp: () => emptyPromise,
    },
    
    // Database methods - retorna estrutura que não quebra encadeamento
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => emptyPromise,
          order: () => ({
            limit: () => emptyPromise,
          }),
        }),
        order: (column: string, options?: any) => emptyPromise,
        limit: (count: number) => emptyPromise,
        single: () => emptyPromise,
      }),
      insert: (values: any) => ({
        select: () => ({
          single: () => emptyPromise,
        }),
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => emptyPromise,
      }),
      delete: () => ({
        eq: (column: string, value: any) => emptyPromise,
      }),
      upsert: (values: any) => emptyPromise,
    }),
    
    // Storage methods
    storage: {
      from: (bucket: string) => ({
        upload: () => emptyPromise,
        download: () => emptyPromise,
        remove: () => emptyPromise,
        list: () => emptyPromise,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    
    // RPC methods
    rpc: (fn: string, args?: any) => emptyPromise,
    
    // Channel/Realtime methods
    channel: (name: string) => ({
      on: () => ({}),
      subscribe: () => ({}),
      unsubscribe: () => ({}),
    }),
  } as any
}

export const createClient = () => {
  // Durante SSR/SSG, retornar proxy seguro que não quebra
  if (typeof window === 'undefined') {
    return createSSRSafeProxy()
  }

  // Retornar instância existente se já criada (browser)
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

// Cliente read-only para operações públicas
export const createReadOnlyClient = () => {
  // Durante SSR/SSG, retornar proxy seguro que não quebra
  if (typeof window === 'undefined') {
    return createSSRSafeProxy()
  }

  // Retornar instância existente se já criada (browser)
  if (readOnlyClientInstance) {
    return readOnlyClientInstance
  }

  // Criar nova instância usando configuração nativa do Supabase
  readOnlyClientInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      // Configurações específicas para cliente read-only
      auth: {
        persistSession: false, // Não persistir sessão
        detectSessionInUrl: false, // Não detectar sessão na URL
        autoRefreshToken: false // Não renovar token automaticamente
      },
      global: {
        headers: {
          'x-client-info': 'promo-v2' // Identificar cliente para métricas
        }
      }
    }
  )

  return readOnlyClientInstance
}

// Função para resetar o cliente (útil para testes ou logout)
export const resetClient = () => {
  clientInstance = null
  readOnlyClientInstance = null
} 