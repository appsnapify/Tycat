'use server'

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { normalizePhoneNumber } from '@/lib/utils'

/**
 * Verificar se um telefone de cliente existe na base de dados
 */
export async function checkClientPhone(phone: string) {
  // Log detalhado para debugging
  console.log('======= VERIFICAÇÃO DE TELEFONE ========')
  console.log('Telefone recebido:', phone)
  
  const supabase = await createClient()
  
  // Garantir que o telefone esteja normalizado
  // Verificar se o telefone já está em formato válido
  let normalizedPhone = phone;
  
  // Só realizar normalização adicional se o telefone não parecer já normalizado
  if (!phone.startsWith('+') || phone === '+' || phone.length < 8) {
    normalizedPhone = normalizePhoneNumber(phone)
  }
  
  console.log('Telefone normalizado:', normalizedPhone)
  
  if (!normalizedPhone || normalizedPhone === '+' || normalizedPhone.length < 8) {
    console.log('Telefone inválido - muito curto ou formato incorreto')
    return { 
      success: false, 
      error: 'Número de telefone inválido' 
    }
  }
  
  // Consulta SQL para encontrar o cliente pelo telefone
  try {
    console.log('Executando consulta SQL...')
    
    // Lidar com variações possíveis do número (com/sem prefixo internacional)
    let phoneVariations = [normalizedPhone];
    
    // Se o telefone parece ter prefixo internacional (mais de 10 dígitos)
    if (normalizedPhone.length > 10) {
      // Tenta encontrar versões sem prefixo internacional (para Portugal e Brasil)
      const potentialWithoutPrefix = normalizedPhone.substring(Math.min(3, normalizedPhone.length - 9));
      if (potentialWithoutPrefix.length >= 9) {
        phoneVariations.push(potentialWithoutPrefix);
      }
      
      // Para Portugal (351)
      if (normalizedPhone.startsWith('351') && normalizedPhone.length >= 12) {
        phoneVariations.push(normalizedPhone.substring(3)); // Sem 351
      }
      
      // Para Brasil (55)
      if (normalizedPhone.startsWith('55') && normalizedPhone.length >= 12) {
        phoneVariations.push(normalizedPhone.substring(2)); // Sem 55
      }
    }
    
    console.log('Variações de telefone a verificar:', phoneVariations);
    
    // Consulta usando operador IN para verificar todas as variações de uma vez
    const queryResult = await supabase
      .from('client_users')
      .select('id, phone')
      .or(`phone.in.(${phoneVariations.map(p => `"${p}"`).join(',')})`)
      .limit(1);
    
    console.log('Resultado completo da consulta:', queryResult)
    
    if (queryResult.error) {
      console.error('Erro ao verificar telefone:', queryResult.error)
      return { 
        success: false, 
        error: queryResult.error.message 
      }
    }
    
    // Verificar se encontrou algum registro
    const found = queryResult.data && queryResult.data.length > 0
    console.log('Registros encontrados:', queryResult.data?.length || 0)
    if (found) {
      console.log('Telefone encontrado:', queryResult.data[0])
    } else {
      console.log('Nenhum usuário encontrado com este telefone')
      
      // Log de telefones existentes para debug
      const allUsers = await supabase
        .from('client_users')
        .select('id, phone')
        .limit(10)
      
      console.log('Primeiros 10 telefones na base:', allUsers.data?.map(u => u.phone))
    }
    
    console.log('======= FIM VERIFICAÇÃO ========')
    
    return { 
      success: true, 
      exists: found,
      userId: found ? queryResult.data[0].id : null
    }
  } catch (error) {
    console.error('Erro inesperado ao verificar telefone:', error)
    return { 
      success: false, 
      error: 'Erro interno ao verificar telefone' 
    }
  }
}

/**
 * Login de cliente usando telefone e senha
 * Redirecionamento automático para o dashboard do usuário
 */
export async function loginClient(formData: FormData) {
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string
  
  if (!phone || !password) {
    return {
      success: false,
      error: 'Telefone e senha são obrigatórios'
    }
  }
  
  // Normalizar telefone apenas se necessário
  let normalizedPhone = phone;
  
  // Só realizar normalização adicional se o telefone não parecer já normalizado
  if (!phone.startsWith('+') || phone === '+' || phone.length < 8) {
    normalizedPhone = normalizePhoneNumber(phone)
  }
  
  console.log('Login com telefone normalizado:', normalizedPhone)
  
  // Validar o formato do telefone
  if (!normalizedPhone || normalizedPhone === '+' || normalizedPhone.length < 8) {
    return {
      success: false,
      error: 'Formato de telefone inválido'
    }
  }
  
  const supabase = await createClient()
  
  // 1. Verificar se o cliente existe
  const { data: clientData, error: clientError } = await supabase
    .from('client_users')
    .select('id, email, auth_id')
    .eq('phone', normalizedPhone)
    .maybeSingle()
  
  if (clientError || !clientData) {
    console.error('Erro ou cliente não encontrado:', clientError)
    return {
      success: false,
      error: clientError?.message || 'Cliente não encontrado'
    }
  }
  
  console.log('Cliente encontrado:', clientData)
  
  // 2. Se o cliente não tiver email/auth_id, usar o telefone como email
  const loginEmail = clientData.email || `${normalizedPhone}@cliente.snapify.app`
  console.log('Email para login:', loginEmail)
  
  // 3. Fazer login no Supabase Auth
  const authResult = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  })
  
  if (authResult.error) {
    console.error('Erro ao autenticar:', authResult.error)
    return {
      success: false,
      error: authResult.error.message
    }
  }
  
  console.log('Login realizado com sucesso')
  
  // 4. Verificar se o auth_id está associado ao cliente
  // Se não estiver, atualizamos o registro
  if (!clientData.auth_id) {
    // Obter a sessão atual para saber o auth_id
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session) {
      console.log('Atualizando auth_id do cliente')
      await supabase
        .from('client_users')
        .update({ auth_id: sessionData.session.user.id })
        .eq('id', clientData.id)
    }
  }
  
  // 5. Revalidar o cache e redirecionar
  revalidatePath('/user/dashboard')
  redirect('/user/dashboard')
}

/**
 * Logout do cliente
 */
export async function logoutClient() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  // Limpar cookies relacionados
  const cookieStore = cookies()
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.includes('supabase') || 
        cookie.name.includes('auth') || 
        cookie.name.includes('session')) {
      cookieStore.delete(cookie.name)
    }
  })
  
  redirect('/login/cliente')
}

/**
 * Registro de novo cliente
 */
export async function registerClient(formData: FormData) {
  const phone = formData.get('phone') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!phone || !password || !firstName) {
    return {
      success: false,
      error: 'Telefone, nome e senha são obrigatórios'
    }
  }
  
  // Normalizar telefone
  const normalizedPhone = normalizePhoneNumber(phone)
  
  const supabase = await createClient()
  
  // 1. Verificar se o cliente já existe
  const { data: existingClient } = await supabase
    .from('client_users')
    .select('id')
    .eq('phone', normalizedPhone)
    .limit(1)
  
  if (existingClient && existingClient.length > 0) {
    return {
      success: false,
      error: 'Um cliente com este telefone já está registrado'
    }
  }
  
  // 2. Criar usuário no Auth do Supabase
  // Usamos email se fornecido, senão usamos o telefone como email
  const loginEmail = email || `${normalizedPhone}@cliente.snapify.app`
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: loginEmail,
    password,
    options: {
      data: {
        phone: normalizedPhone,
        first_name: firstName,
        last_name: lastName
      }
    }
  })
  
  if (authError) {
    return {
      success: false,
      error: authError.message
    }
  }
  
  // 3. Criar entrada na tabela client_users
  const { error: insertError } = await supabase
    .from('client_users')
    .insert({
      phone: normalizedPhone,
      email: loginEmail,
      first_name: firstName,
      last_name: lastName,
      auth_id: authData.user?.id
    })
  
  if (insertError) {
    // Tentar limpar o usuário criado no Auth em caso de erro
    if (authData.user) {
      await supabase.auth.admin.deleteUser(authData.user.id)
    }
    
    return {
      success: false,
      error: insertError.message
    }
  }
  
  // 4. Redirecionar para o dashboard
  revalidatePath('/user/dashboard')
  redirect('/user/dashboard')
} 