'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Server Action para fazer login com email/senha
 * Usa o cliente completo com manipulação de cookies
 */
export async function loginWithEmailPassword(data: FormData) {
  const email = data.get('email') as string
  const password = data.get('password') as string
  const redirectPath = data.get('redirect') as string || '/'

  const supabase = await createClient()
  
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  // Revalidar o cache para refletir o estado de autenticação
  revalidatePath('/')
  
  // Redirecionar para a página solicitada após o login bem-sucedido
  redirect(redirectPath)
}

/**
 * Server Action para fazer logout
 * Usa o cliente completo com manipulação de cookies
 */
export async function logout() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  // Revalidar o cache para refletir o estado de autenticação
  revalidatePath('/')
  
  // Redirecionar para a página inicial após o logout
  redirect('/')
}

/**
 * Server Action para verificar telefone
 * Usa o cliente completo com manipulação de cookies
 */
export async function checkPhone(phone: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('client_users')
    .select('id')
    .eq('phone', phone)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    return {
      success: false,
      error: error.message
    }
  }
  
  return {
    success: true,
    exists: !!data,
    userId: data?.id
  }
}

/**
 * Server Action para registro com telefone e senha
 * Usa o cliente completo com manipulação de cookies
 */
export async function registerWithPhone(data: FormData) {
  const phone = data.get('phone') as string
  const password = data.get('password') as string
  const firstName = data.get('firstName') as string
  const lastName = data.get('lastName') as string

  const supabase = await createClient()
  
  // Criar usuário na tabela client_users
  const { data: userData, error: userError } = await supabase
    .from('client_users')
    .insert({
      phone,
      password,
      first_name: firstName,
      last_name: lastName
    })
    .select()
    .single()
  
  if (userError) {
    return {
      success: false,
      error: userError.message
    }
  }
  
  // Fazer login automaticamente
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: phone, // Usando o telefone como email para compatibilidade
    password
  })
  
  if (authError) {
    return {
      success: false,
      error: authError.message
    }
  }
  
  // Revalidar o cache para refletir o estado de autenticação
  revalidatePath('/')
  
  return {
    success: true,
    userId: userData.id
  }
} 