/**
 * Helpers para tornar as chamadas Supabase mais robustas
 * e fornecer melhor tratamento de erros
 */

import { createClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Wrapper para chamadas Supabase com melhor tratamento de erros
 * e tentativas automáticas de reconexão
 */
export async function safeSupabaseQuery<T>(
  queryFn: (supabase: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>,
  maxRetries = 2
): Promise<{ data: T | null; error: any; success: boolean }> {
  let retries = 0;
  let lastError = null;

  while (retries <= maxRetries) {
    try {
      // Criar um novo cliente se for uma nova tentativa
      const supabase = createClient();
      
      // Executar a consulta
      const { data, error } = await queryFn(supabase);
      
      // Se não houver erro, retornar os dados
      if (!error) {
        return { data, error: null, success: true };
      }
      
      // Se houver erro, registrar e tentar novamente
      console.error(`Tentativa ${retries + 1} falhou com erro:`, error);
      lastError = error;
      retries++;
      
      // Aguardar um tempo antes de tentar novamente (backoff exponencial)
      if (retries <= maxRetries) {
        const delay = Math.pow(2, retries) * 500; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (unexpectedError) {
      console.error(`Erro inesperado na tentativa ${retries + 1}:`, unexpectedError);
      lastError = unexpectedError;
      retries++;
      
      // Aguardar antes de tentar novamente
      if (retries <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // Se todas as tentativas falharem, retornar o último erro
  return { data: null, error: lastError, success: false };
}

/**
 * Faz uma chamada direta à API REST do Supabase
 * Útil para contornar problemas de RLS ou quando o cliente Supabase falha
 */
export async function directSupabaseAPICall<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    query?: Record<string, string>;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data: T | null; error: any; status: number; success: boolean }> {
  // Valores padrão para acesso à API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidas no .env.local');
  }
  
  try {
    // Construir URL completa
    let url = `${supabaseUrl}/${path}`;
    
    // Adicionar parâmetros de query string se fornecidos
    if (options.query && Object.keys(options.query).length > 0) {
      const params = new URLSearchParams();
      Object.entries(options.query).forEach(([key, value]) => {
        params.append(key, value);
      });
      url = `${url}?${params.toString()}`;
    }
    
    // Configurar headers padrão
    const headers = {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    };
    
    // Configurar opções da requisição
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      credentials: 'same-origin',
    };
    
    // Adicionar corpo para métodos que o suportam
    if (['POST', 'PUT', 'PATCH'].includes(options.method || '') && options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    // Executar a requisição
    const response = await fetch(url, requestOptions);
    const status = response.status;
    
    // Processar a resposta
    let data = null;
    let error = null;
    
    if (response.ok) {
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } else {
      try {
        error = await response.json();
      } catch (e) {
        error = { message: response.statusText, status };
      }
    }
    
    return { 
      data, 
      error, 
      status, 
      success: response.ok 
    };
  } catch (fetchError) {
    console.error('Erro na requisição direta:', fetchError);
    return { 
      data: null, 
      error: fetchError, 
      status: 0, 
      success: false 
    };
  }
} 