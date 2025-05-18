import { createBrowserClient } from '@supabase/ssr'
import { type Database } from '@/types/supabase'

// As suas variáveis de ambiente devem ser carregadas automaticamente pelo Next.js
// desde que estejam definidas em .env.local e prefixadas com NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file."
  )
}

// Exporta uma função que cria e retorna uma instância do cliente Supabase para o navegador.
// Esta é a abordagem recomendada para uso em Client Components com o App Router.
export const getSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  );
}

// Nota: A versão original do seu ficheiro tinha funções como:
// - createBrowserClientWithoutPersistence
// - resetBrowserClient
// Estas não são padrão com @supabase/auth-helpers-nextjs e foram removidas por agora.
// Se precisar de funcionalidades específicas como não persistir a sessão para certos casos,
// podemos discutir como conseguir isso de forma compatível com os Auth Helpers. 