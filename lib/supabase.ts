import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Valores padrão caso as variáveis de ambiente não sejam encontradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xejpwdpumzalewamttjv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlanB3ZHB1bXphbGV3YW10dGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjc2ODQsImV4cCI6MjA1ODk0MzY4NH0.8HWAgcSoPL70uJ8OJXu3m7GD6NB-MhZTuBjurWXU7eI'

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
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
      options: {
        auth: {
          storageKey: 'snap-auth', // Chave única para evitar conflitos
          autoRefreshToken: true,
          persistSession: true
        },
        global: {
          // Usar implementação global de fetch
          fetch: (...args) => fetch(...args)
        }
      }
    })
    return supabaseInstance
  } catch (error) {
    console.error('Erro ao criar cliente Supabase com cookies:', error)
    
    // Fallback para criação básica de cliente sem gerenciamento de cookies
    supabaseInstance = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          storageKey: 'snap-auth',
          autoRefreshToken: true,
          persistSession: true
        },
        global: {
          fetch: (...args) => fetch(...args)
        }
      }
    )
    return supabaseInstance
  }
}

// Para compatibilidade com código existente, também exportamos o cliente diretamente
// Mas isso eventualmente deve ser substituído por chamadas à função createClient()
export const supabase = createClient() 