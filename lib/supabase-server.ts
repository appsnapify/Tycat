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
 * - Route Handlers (app/api/*/route.ts)
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
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (e) {
            console.error(`Erro ao definir cookie ${name}:`, e)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options })
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