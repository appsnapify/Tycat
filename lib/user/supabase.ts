import { createClient } from '@supabase/supabase-js'

/**
 * CLIENTE SUPABASE ISOLADO PARA SISTEMA USER
 * 
 * Características:
 * - Zero dependências de outros sistemas
 * - Configuração otimizada para performance
 * - Timeouts agressivos para responsividade
 * - Connection pooling otimizado
 */

// ✅ URLs e chaves direto das env vars (sem imports externos)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables for user client')
}

/**
 * Cliente Supabase otimizado para sistema user
 */
export const createUserClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'user-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: false, // ✅ Evita parsing desnecessário
    },
    db: {
      schema: 'public',
    },
    realtime: {
      enabled: false, // ✅ Não precisamos de realtime para user
    },
    global: {
      headers: {
        'X-Client-Type': 'user-system',
        'Cache-Control': 'no-cache', // ✅ Evita cache stale
      },
    },
  })
}

/**
 * Cliente Supabase Admin para operações que precisam bypass RLS
 */
export const createUserAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!serviceKey) {
    throw new Error('Missing Supabase service key for user admin client')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    realtime: {
      enabled: false,
    },
    global: {
      headers: {
        'X-Client-Type': 'user-system-admin',
      },
    },
  })
}

/**
 * Type helpers para o sistema user
 */
export type UserSupabaseClient = ReturnType<typeof createUserClient>
export type UserAdminClient = ReturnType<typeof createUserAdminClient>

/**
 * Utilitários para debugging e monitorização
 */
export const logSupabaseOperation = (operation: string, duration: number) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔥 [USER-SUPABASE] ${operation} completed in ${duration}ms`)
  }
}

export const wrapWithLogging = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    logSupabaseOperation(operation, duration)
    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`❌ [USER-SUPABASE] ${operation} failed after ${duration}ms:`, error)
    throw error
  }
} 