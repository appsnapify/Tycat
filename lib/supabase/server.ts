import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../../types/supabase'

// Variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file."
  )
}

// Helper para uso seguro de cookies
const getCookieSafe = async (name: string) => {
  try {
    const cookieStore = await cookies(); // <-- await obrigatório!
    const cookie = cookieStore.get(name);
    return cookie?.value;
  } catch (e) {
    console.error('[Cookie Error]:', e);
    return undefined;
  }
};

const setCookieSafe = async (name: string, value: string, options: any = {}) => {
  try {
    const cookieStore = await cookies();
    cookieStore.set({ 
      name, 
      value, 
      ...options, 
      path: options.path || '/',
      maxAge: options.maxAge || 60 * 60 * 24 * 7,
      sameSite: options.sameSite || 'lax',
      httpOnly: options.httpOnly !== false,
      secure: process.env.NODE_ENV === 'production' && options.secure !== false
    });
    return true;
  } catch (e) {
    console.error('[Cookie Set Error]:', e);
    return false;
  }
};

const deleteCookieSafe = async (name: string, options: any = {}) => {
  try {
    const cookieStore = await cookies();
    cookieStore.delete({ 
      name, 
      ...options,
      path: options.path || '/',
      maxAge: 0,
      expires: new Date(0)
    });
    return true;
  } catch (e) {
    console.error('[Cookie Delete Error]:', e);
    return false;
  }
};

// Cliente read-only para server components
export const createReadOnlyClient = async () => {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: getCookieSafe,
        set: () => Promise.resolve(), // Silenciosamente ignorar modificações
        remove: () => Promise.resolve(), // Silenciosamente ignorar remoções
      },
    }
  )
}

// Cliente normal para server components
export const createClient = async () => {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: getCookieSafe,
        set: setCookieSafe,
        remove: deleteCookieSafe,
      },
    }
  )
} 