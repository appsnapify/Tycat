import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'

// Configuração do Supabase com chave anônima (segura para uso cliente e servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validar configuração
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas corretamente.');
}

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
    return createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
  }

  // Se já temos um cliente, reutilizar (padrão singleton)
  if (browserClient) {
    console.log('Reusing existing Supabase client instance');
    return browserClient;
  }

  console.log('Initializing new browser Supabase client with localStorage-only session');

  // Criar um novo cliente com persistência APENAS em localStorage
  browserClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
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
      fetch: (...args) => fetch(...args),
      headers: { 
        'X-Client-Info': 'supabase-js/2.38.4'
      }
    }
  });

  return browserClient;
}

// Função para criar um cliente sem persistência para operações temporárias
export const createBrowserClientWithoutPersistence = () => {
  return createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    },
    global: {
      headers: { 
        'X-Client-Info': 'supabase-js/2.38.4'
      }
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
  
  // Importante: usar createSupabaseJsClient (da importação) não createClient (nossa função)
  const instance = createSupabaseJsClient(
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
        fetch: (...args) => fetch(...args),
        headers: { 
          'X-Client-Info': 'supabase-js/2.38.4'
        }
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
export const createSupabaseClient = (): SupabaseClient => {
  try {
    // No cliente, retorna a instância existente ou cria uma nova
    return createBrowserClient();
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error);
    // Se houver erro na inicialização, tenta criar um cliente básico
    // sem configurações avançadas que podem causar problemas
    return createSupabaseJsClient(
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
        global: {
          headers: { 
            'X-Client-Info': 'supabase-js/2.38.4'
          }
        }
      }
    );
  }
};

// NÃO exportar diretamente uma instância na inicialização do módulo
// Isso causa problema de múltiplas instâncias durante hidratação
// Em vez disso, exporte apenas a função 