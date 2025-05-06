'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Ação do servidor para verificar autenticação
export async function checkServerAuth() {
  const supabase = await createClient();
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao verificar sessão no servidor:', error);
      return { user: null, error: error.message };
    }
    
    if (!session) {
      return { user: null, error: null };
    }
    
    const clientUserId = session.user.user_metadata?.client_user_id || session.user.id;
    
    // Verificar se o usuário existe na tabela client_users
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id, first_name, last_name, phone, email')
      .eq('id', clientUserId)
      .single();
      
    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError);
      return { user: null, error: userError.message };
    }
    
    return { 
      user: {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        email: userData.email
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Erro ao verificar autenticação no servidor:', error);
    return { user: null, error: error.message };
  }
}

// Ação do servidor para fazer logout
export async function serverLogout() {
  const supabase = await createClient();
  
  try {
    await supabase.auth.signOut();
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao fazer logout no servidor:', error);
    return { success: false, error: error.message };
  }
} 