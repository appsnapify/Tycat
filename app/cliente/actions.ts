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
  console.log('Telefone recebido na server action:', phone)
  
  // Verificar se a server action está sendo chamada corretamente
  if (!phone) {
    console.error('ERRO: checkClientPhone chamado sem telefone!');
    return {
      success: false,
      error: 'Parâmetro de telefone ausente'
    };
  }
  
  if (!phone || phone.length < 8) {
    console.log('Telefone recebido é muito curto ou inválido')
    return { 
      success: false, 
      error: 'Número de telemóvel inválido' 
    }
  }
  
  const supabase = await createClient()
  
  // Garantir que o telefone esteja normalizado
  // Verificar se o telefone já está em formato válido
  let normalizedPhone = phone;
  
  // Só realizar normalização adicional se o telefone não parecer já normalizado
  if (!phone.startsWith('+') || phone === '+' || phone.length < 8) {
    console.log('Telefone precisa de normalização adicional')
    normalizedPhone = normalizePhoneNumber(phone)
  }
  
  console.log('Telefone normalizado para consulta:', normalizedPhone)
  
  if (!normalizedPhone || normalizedPhone === '+' || normalizedPhone.length < 8) {
    console.log('Telefone inválido após normalização - muito curto ou formato incorreto')
    return { 
      success: false, 
      error: 'Número de telemóvel inválido' 
    }
  }
  
  // Extrair apenas os dígitos do telefone para comparação numérica
  const digitsOnly = normalizedPhone.replace(/\D/g, '');
  console.log('Dígitos do telefone para comparação:', digitsOnly);
  
  // Mostrar os últimos 9 dígitos (formato mais comum em Portugal)
  const last9digits = digitsOnly.slice(-9);
  console.log('Últimos 9 dígitos do telefone:', last9digits);
  
  // Consulta SQL para encontrar o cliente pelo telefone
  try {
    console.log('Executando consulta SQL com telefone:', normalizedPhone)
    
    // Lidar com mais variações possíveis do número
    let phoneVariations = [normalizedPhone];
    
    // Se o número começa com +351 (Portugal)
    if (normalizedPhone.startsWith('+351')) {
      // Adicionar versão sem prefixo
      const withoutPrefix = normalizedPhone.substring(4);
      phoneVariations.push(withoutPrefix);
      console.log('Adicionando variação sem prefixo +351:', withoutPrefix);
      
      // Adicionar versão com 9 iniciando (se não começar com 9)
      if (!withoutPrefix.startsWith('9')) {
        phoneVariations.push('9' + withoutPrefix);
        console.log('Adicionando variação iniciando com 9:', '9' + withoutPrefix);
      }
      
      // Variações com espaço e formatação
      phoneVariations.push('+351 ' + withoutPrefix);
      phoneVariations.push('(+351) ' + withoutPrefix);
      
      // Últimos 9 dígitos
      const last9 = normalizedPhone.slice(-9);
      if (last9.length === 9) {
        phoneVariations.push(last9);
        console.log('Adicionando últimos 9 dígitos:', last9);
      }
    } 
    // Verificar apenas os 9 últimos dígitos para qualquer número
    else {
      const digitsOnly = normalizedPhone.replace(/\D/g, '');
      const last9 = digitsOnly.slice(-9);
      if (last9.length === 9) {
        phoneVariations.push(last9);
        phoneVariations.push('+351' + last9);
        console.log('Adicionando variações com últimos 9 dígitos:', last9, '+351' + last9);
      }
    }
    
    console.log('Variações de telefone a verificar:', phoneVariations);
    
    // ESTRATÉGIA 1: Tentar usando equações simples para cada variação
    for (const phoneVar of phoneVariations) {
      console.log('Verificando variação:', phoneVar);
      
      const { data, error } = await supabase
      .from('client_users')
      .select('id, phone')
        .eq('phone', phoneVar)
      .limit(1);
    
      if (error) {
        console.error('Erro ao verificar variação:', error);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log('Telefone encontrado com variação:', phoneVar);
        console.log('Dados encontrados:', data[0]);
        
      return { 
          success: true, 
          exists: true,
          userId: data[0].id,
          matchedPhone: phoneVar
        };
      }
    }
    
    // ESTRATÉGIA 2: Usar ILIKE para busca parcial por últimos dígitos
    const last8 = digitsOnly.slice(-8);
    
    if (last8.length === 8) {
      console.log('Verificando pelos últimos 8 dígitos:', last8);
      
      const { data, error } = await supabase
        .from('client_users')
        .select('id, phone')
        .filter('phone', 'ilike', `%${last8}`)
        .limit(1);
        
      if (!error && data && data.length > 0) {
        console.log('Telefone encontrado pelos últimos 8 dígitos');
        console.log('Dados encontrados:', data[0]);
        
        return { 
          success: true, 
          exists: true,
          userId: data[0].id,
          matchedPhone: data[0].phone
        };
      }
    }
    
    // ESTRATÉGIA 3 (DIAGNÓSTICO): Buscar todos os telefones e comparar dígitos
    console.log('ESTRATÉGIA DE DIAGNÓSTICO: Buscando todos os clientes');
    
    // Buscar um número maior de registros para análise completa
    const { data: allClients, error: allClientsError } = await supabase
      .from('client_users')
      .select('id, phone, first_name, last_name')
      .limit(50); // Aumentar o limite para ter mais chances de encontrar
    
    if (allClientsError) {
      console.error('Erro ao buscar todos os clientes:', allClientsError);
    } else if (allClients && allClients.length > 0) {
      console.log(`Encontrados ${allClients.length} clientes no banco:`);
      
      // Comparar telefones ignorando formatação (apenas dígitos)
      const matches = [];
      let bestMatch = null;
      let bestMatchScore = 0;
      
      for (const client of allClients) {
        if (!client.phone) continue;
        
        console.log(`Cliente: ${client.first_name} ${client.last_name || ''}, Telefone: ${client.phone}`);
        
        // Remover toda formatação do telefone armazenado
        const clientDigits = client.phone.replace(/\D/g, '');
        
        // Se os últimos 9 dígitos são iguais - alta probabilidade de match
        if (clientDigits.slice(-9) === last9digits) {
          console.log(`🎯 CORRESPONDÊNCIA EXATA nos últimos 9 dígitos: ${client.phone}`);
          matches.push({
            id: client.id,
            phone: client.phone,
            matchType: 'exact-9-digits'
          });
          
          // Se também tem o mesmo comprimento, é um match perfeito
          if (clientDigits.length === digitsOnly.length) {
            bestMatch = {
              id: client.id,
              phone: client.phone,
              matchType: 'perfect'
            };
            bestMatchScore = 100;
          } else if (!bestMatch || bestMatchScore < 90) {
            bestMatch = {
              id: client.id,
              phone: client.phone,
              matchType: 'exact-9-digits'
            };
            bestMatchScore = 90;
          }
        }
        // Se os últimos 8 dígitos são iguais - possível match
        else if (clientDigits.slice(-8) === digitsOnly.slice(-8)) {
          console.log(`🔍 Possível correspondência nos últimos 8 dígitos: ${client.phone}`);
          matches.push({
            id: client.id,
            phone: client.phone,
            matchType: 'last-8-digits'
          });
          
          if (!bestMatch || bestMatchScore < 80) {
            bestMatch = {
              id: client.id,
              phone: client.phone,
              matchType: 'last-8-digits'
            };
            bestMatchScore = 80;
          }
        }
        // Se contém os últimos 7 dígitos
        else if (clientDigits.indexOf(digitsOnly.slice(-7)) >= 0) {
          console.log(`👀 Correspondência parcial nos últimos 7 dígitos: ${client.phone}`);
          matches.push({
            id: client.id,
            phone: client.phone,
            matchType: 'partial-7-digits'
          });
          
          if (!bestMatch || bestMatchScore < 70) {
            bestMatch = {
              id: client.id,
              phone: client.phone,
              matchType: 'partial-7-digits'
            };
            bestMatchScore = 70;
          }
        }
      }
      
      if (matches.length > 0) {
        console.log('Matches encontrados por análise de dígitos:', matches);
        console.log('Melhor match:', bestMatch);
        
        if (bestMatch) {
          return { 
            success: true, 
            exists: true,
            userId: bestMatch.id,
            matchedPhone: bestMatch.phone,
            matchType: bestMatch.matchType
          };
        }
      } else {
        console.log('Nenhum match encontrado após análise detalhada de dígitos');
        console.log('Telefones na base:', allClients.map(c => c.phone));
      }
    } else {
      console.log('Nenhum cliente encontrado na base de dados');
    }
    
    // Se chegou aqui, não encontrou o telefone
    console.log('Nenhum usuário encontrado com este telefone após todas as verificações');
    
    return { 
      success: true, 
      exists: false,
      userId: null
    };
    
  } catch (error) {
    console.error('Erro inesperado ao verificar telefone:', error);
    
    // Tentar extrair detalhes mais úteis do erro
    let errorMessage = 'Erro interno ao verificar telefone';
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      console.error('Mensagem de erro detalhada:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  } finally {
    console.log('======= FIM VERIFICAÇÃO ========');
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
  
  // Primeiro verificar se o cliente existe usando a função checkClientPhone
  // Esta função já implementa diversas estratégias para encontrar o telefone
  const checkResult = await checkClientPhone(normalizedPhone)
  
  if (!checkResult.success) {
    return {
      success: false,
      error: checkResult.error || 'Erro ao verificar telefone'
    }
  }
  
  if (!checkResult.exists || !checkResult.userId) {
    return {
      success: false,
      error: 'Cliente não encontrado'
    }
  }
  
  // 1. Buscar dados do cliente pelo ID (mais confiável do que pelo telefone)
  const { data: clientData, error: clientError } = await supabase
    .from('client_users')
    .select('id, email, auth_id, phone')
    .eq('id', checkResult.userId)
    .single()
  
  if (clientError || !clientData) {
    console.error('Erro ou cliente não encontrado:', clientError)
    return {
      success: false,
      error: clientError?.message || 'Cliente não encontrado'
    }
  }
  
  console.log('Cliente encontrado:', clientData)
  
  // 2. Se o cliente não tiver email/auth_id, usar o telefone como email
  const loginEmail = clientData.email || `${clientData.phone}@cliente.snapify.app`
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