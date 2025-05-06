import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'

// Valores padrão em caso de variáveis de ambiente não definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xejpwdpumzalewamttjv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlanB3ZHB1bXphbGV3YW10dGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjc2ODQsImV4cCI6MjA1ODk0MzY4NH0.8HWAgcSoPL70uJ8OJXu3m7GD6NB-MhZTuBjurWXU7eI';

// Singleton para o cliente Supabase no navegador
let browserClient: SupabaseClient | null = null;

// Verificar se estamos no ambiente do navegador
const isBrowser = typeof window !== 'undefined';

/**
 * Cria um novo cliente Supabase para o navegador
 * Usa gerenciamento de sessão em localStorage ao invés de cookies
 * para evitar problemas de parsing
 */
export const createBrowserClient = () => {
  // No SSR, retorna um cliente vazio para evitar erros
  if (!isBrowser) {
    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  // Se já temos um cliente, reutilizar (padrão singleton)
  if (browserClient) {
    console.log('Reusing existing Supabase client instance');
    return browserClient;
  }

  console.log('Initializing new browser Supabase client with localStorage-only session');

  // Criar um novo cliente com persistência APENAS em localStorage
  browserClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // Desabilitar cookies completamente e usar apenas localStorage
      storageKey: 'supabase-local-auth',
      flowType: 'pkce',
      cookies: {
        // Desativar cookies para evitar erros de parsing
        name: 'sb-auth-token-disabled',
        lifetime: 0,
        domain: '',
        path: '/',
        sameSite: 'lax'
      },
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch (error) {
            console.error('Error getting auth item from localStorage:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch (error) {
            console.error('Error setting auth item in localStorage:', error);
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing auth item from localStorage:', error);
          }
        }
      }
    },
    global: {
      fetch: (...args) => fetch(...args)
    }
  });

  return browserClient;
}

// Função para criar um cliente sem persistência para operações temporárias
export const createBrowserClientWithoutPersistence = () => {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
}

// Função para resetar o singleton (útil para testes ou quando o usuário faz logout)
export const resetBrowserClient = () => {
  browserClient = null;
  console.log('Supabase client instance reset');
};

// Função separada que será invocada apenas quando necessário
const initializeClient = () => {
  // Adicionar log para rastrear inicializações
  console.log('Inicializando novo cliente Supabase');
  
  // Importante: usar createSupabaseClient (da importação) não createClient (nossa função)
  const instance = createSupabaseClient<Database>(
    supabaseUrl, 
    supabaseAnonKey,
    {
      auth: {
        storageKey: 'snap-client-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage: {
          getItem: (key: string) => isBrowser ? localStorage.getItem(key) : null,
          setItem: (key: string, value: string) => { if (isBrowser) localStorage.setItem(key, value); },
          removeItem: (key: string) => { if (isBrowser) localStorage.removeItem(key); }
        }
      },
      // Configurações para evitar conflitos
      global: {
        fetch: (...args) => fetch(...args)
      }
    }
  );
  
  return instance;
};

/**
 * Cria um cliente Supabase para uso no navegador de forma segura
 * Esta função é uma wrapper para garantir que sempre retornamos um cliente válido
 * e evitar erros de inicialização
 */
export const createClient = (): SupabaseClient => {
  try {
    // No cliente, retorna a instância existente ou cria uma nova
    return createBrowserClient();
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error);
    
    // Se houver erro na inicialização, tenta criar um cliente básico
    // sem configurações avançadas que podem causar problemas
    return createSupabaseClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storage: {
            getItem: (key: string) => isBrowser ? localStorage.getItem(key) : null,
            setItem: (key: string, value: string) => { if (isBrowser) localStorage.setItem(key, value); },
            removeItem: (key: string) => { if (isBrowser) localStorage.removeItem(key); }
          }
        },
      }
    );
  }
};

// NÃO exportar diretamente uma instância na inicialização do módulo
// Isso causa problema de múltiplas instâncias durante hidratação
// Em vez disso, exporte apenas a função 