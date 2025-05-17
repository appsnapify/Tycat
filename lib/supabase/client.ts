import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL ERROR: Supabase environment variables are not configured correctly.');
}

// --- DIAGNOSTIC: Drastic Simplification ---
// Create a single instance at the module level.
// This will be initialized once when this module is first imported in the browser.

let moduleLevelSupabaseClient: SupabaseClient<Database>;

const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
  console.log('[SupabaseClient DIAGNOSTIC] Initializing module-level Supabase client.');
  moduleLevelSupabaseClient = createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'snap-app-auth-diagnostic', // Using a distinct storageKey for this test
      flowType: 'pkce',
      storage: localStorage, // Directly use localStorage
    },
    global: {
      fetch: (...args) => fetch(...args),
    }
  });
} else {
  // In a non-browser environment, create a basic, non-functional client.
  console.warn('[SupabaseClient DIAGNOSTIC] Module loaded in non-browser environment. Creating basic client.');
  moduleLevelSupabaseClient = createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Returns the module-level singleton Supabase client.
 */
export const createBrowserClient = (): SupabaseClient<Database> => {
  // Basic check to ensure client is somewhat initialized, especially if accessed from non-browser early.
  if (!moduleLevelSupabaseClient) {
      console.error("[SupabaseClient DIAGNOSTIC] moduleLevelSupabaseClient is null or undefined. This should not happen if module initialized correctly.");
      // Fallback to create a basic client if somehow it wasn't created, though this indicates a flaw.
      return createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return moduleLevelSupabaseClient;
};

// Other functions are simplified or made to use the module-level client if they were to be used.

export const createBrowserClientWithoutPersistence = (): SupabaseClient<Database> => {
  if (!isBrowser) {
    console.warn("[SupabaseClient DIAGNOSTIC] createBrowserClientWithoutPersistence called in non-browser env. Returning basic client.");
    return createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  console.log('[SupabaseClient DIAGNOSTIC] Initializing new browser Supabase client WITHOUT session persistence (diagnostic version)');
  return createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    },
  });
};

export const resetBrowserClient = () => {
  console.warn('[SupabaseClient DIAGNOSTIC] resetBrowserClient called. For module-level client, this means re-initializing.');
  if (isBrowser) {
    console.log('[SupabaseClient DIAGNOSTIC] Re-initializing module-level Supabase client due to reset.');
    moduleLevelSupabaseClient = createSupabaseJsClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, storageKey: 'snap-app-auth-diagnostic-reset', storage: localStorage }, // Use a different key on reset for safety
        global: { fetch: (...args) => fetch(...args) }
    });
  } else {
    console.warn('[SupabaseClient DIAGNOSTIC] resetBrowserClient called in non-browser environment. Module-level client re-init skipped.');
  }
};

// --- END DIAGNOSTIC --- 