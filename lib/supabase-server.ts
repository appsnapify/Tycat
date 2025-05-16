'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

/**
 * CLIENTE SOMENTE LEITURA
 * --------------------
 * Para uso em Server Components (páginas, layouts, componentes RSC)
 * NÃO pode modificar cookies, apenas lê-los
 * 
 * Use em:
 * - Páginas e layouts (app/page.tsx, app/layout.tsx)
 * - Componentes de servidor (app/components/MeuComponenteServidor.tsx)
 * 
 * Exemplo:
 * ```tsx
 * // Em um Server Component (RSC)
 * const supabase = await createReadOnlyClient();
 * const { data } = await supabase.from('minha_tabela').select();
 * // ✅ Leitura de dados funciona normalmente
 * ```
 */
export async function createReadOnlyClient() {
  // Captura a referência do cookieStore uma única vez para evitar chamadas múltiplas a cookies()
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch (e) {
            console.error(`Erro ao acessar cookie ${name}:`, e)
            return undefined
          }
        },
        // Não implementar set e remove para evitar erros em Server Components
      }
    }
  )
}

/**
 * CLIENTE COMPLETO
 * --------------------
 * Para uso EXCLUSIVO em Server Actions e Route Handlers
 * Pode ler e modificar cookies (autenticação completa)
 * 
 * Use em:
 * - Server Actions ('use server')
 * - Route Handlers (como app/api/rota/route.ts)
 * 
 * Exemplo:
 * ```tsx
 * // Em um Server Action:
 * 'use server'
 * 
 * import { createClient } from '@/lib/supabase-server';
 * 
 * export async function meuServerAction() {
 *   const supabase = await createClient();
 *   // ✅ Autenticação com manipulação de cookies funciona
 *   const { data, error } = await supabase.auth.signInWithPassword({...});
 * }
 * ```
 */
export async function createClient() {
  // Captura a referência do cookieStore uma única vez para evitar chamadas múltiplas a cookies()
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch (e) {
            console.error(`Erro ao acessar cookie ${name}:`, e)
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Passar apenas as opções que são válidas para cookieStore.set
            const { domain, expires, httpOnly, maxAge, path, sameSite, secure } = options;
            cookieStore.set({ name, value, domain, expires, httpOnly, maxAge, path, sameSite, secure })
          } catch (e) {
            console.error(`Erro ao definir cookie ${name}:`, e)
          }
        },
        remove(name: string, options: Pick<CookieOptions, 'path' | 'domain'>) {
          try {
            // Usar delete que é mais direto e menos propenso a este tipo de erro do Next.js
            // Passar apenas as opções que são válidas para cookieStore.delete
            const { path, domain } = options;
            cookieStore.delete({name, path, domain});
          } catch (e) {
            console.error(`Erro ao remover cookie ${name}:`, e)
          }
        }
      }
    }
  )
}

/**
 * @deprecated Use createClient() em vez disso
 * Mantido para compatibilidade com código existente
 */
export async function createServerSupabaseClient() {
  console.warn('createServerSupabaseClient() está obsoleto. Use createClient() ou createReadOnlyClient() baseado no contexto.');
  return await createClient();
}

// Preciso adicionar a interface CookieOptions que usei acima.
// Normalmente isto viria de 'http' ou uma biblioteca de cookies, mas para este contexto,
// vou definir uma interface simples baseada nas opções comuns.
interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  [key: string]: any; // Para outras opções que o Supabase possa passar
} 