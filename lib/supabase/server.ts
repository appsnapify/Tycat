import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient as createServerClientFromSSR } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Verificação para detectar ambiente do navegador
const isBrowser = typeof window !== 'undefined'

// Helper para uso seguro de cookies
const getCookieSafe = async (name: string) => {
  try {
    const cookieStore = cookies();
    // Certifique-se de que qualquer operação em cookieStore seja awaited
    const cookie = cookieStore.get(name);
    return cookie?.value;
  } catch (e) {
    console.error(`Erro ao acessar cookie ${name}:`, e);
    return undefined;
  }
};

const setCookieSafe = (name: string, value: string, options: any = {}) => {
  try {
    cookies().set({ 
      name, 
      value, 
      ...options, 
      // Garantir valores padrão para evitar problemas
      path: options.path || '/',
      maxAge: options.maxAge || 60 * 60 * 24 * 7 // 1 semana 
    });
    return true;
  } catch (e) {
    console.error(`Erro ao definir cookie ${name}:`, e);
    return false;
  }
};

const deleteCookieSafe = (name: string, options: any = {}) => {
  try {
    cookies().delete({ 
      name, 
      ...options,
      path: options.path || '/'
    });
    return true;
  } catch (e) {
    console.error(`Erro ao excluir cookie ${name}:`, e);
    return false;
  }
};

/**
 * Cria um cliente Supabase SOMENTE LEITURA para Server Components.
 * Não tenta modificar cookies, apenas lê-los.
 * 
 * IMPORTANTE: Use esta versão em Server Components (páginas, layouts)
 */
export const createReadOnlyClient = async () => {
  // Se estiver no navegador, avise sobre o uso incorreto
  if (isBrowser) {
    console.warn('Atenção: Tentativa de usar createReadOnlyClient do servidor no navegador. Use @/lib/supabase/client em vez disso.')
    // Fallback para um cliente básico sem manipulação de cookies
    return createServerClientFromSSR<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    )
  }
  
  // Criação segura de cliente no servidor SOMENTE LEITURA
  return createServerClientFromSSR<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: getCookieSafe,
        set: () => { console.log("Aviso: tentativa de modificar cookie em Server Component (ignorado)"); },
        remove: () => { console.log("Aviso: tentativa de remover cookie em Server Component (ignorado)"); },
      },
    }
  )
}

/**
 * Cria um cliente Supabase com acesso total para Server Actions e Route Handlers.
 * Pode ler e modificar cookies.
 * 
 * IMPORTANTE: Use APENAS em:
 * 1. Server Actions (funções 'use server')
 * 2. Route Handlers (rotas da API)
 */
export const createClient = async () => {
  // Se estiver no navegador, avise sobre o uso incorreto
  if (isBrowser) {
    console.warn('Atenção: Tentativa de usar createClient do servidor no navegador. Use @/lib/supabase/client em vez disso.')
    // Fallback para um cliente básico sem manipulação de cookies
    return createServerClientFromSSR<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    )
  }
  
  // Criação segura de cliente no servidor usando a biblioteca SSR do Supabase
  return createServerClientFromSSR<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: getCookieSafe,
        set: setCookieSafe,
        remove: deleteCookieSafe,
      },
    }
  )
}

// Função para uso em funções de API (como RPC) que não precisam gerenciar cookies
// Útil quando precisamos apenas fazer consultas ao banco de dados
export const createServiceClient = async () => {
  // Certifique-se de que o createClient seja awaited
  return await createClient()
} 