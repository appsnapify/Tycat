'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// Server Action para atualizar o perfil do usuário
export async function updateProfile(formData: FormData) {
  // Usar o cliente com acesso completo para atualizações
  const supabase = await createClient()
  
  // Coletar dados do formulário
  const userId = formData.get('userId') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  
  // Validar dados
  if (!firstName || !lastName) {
    return {
      success: false,
      error: 'Nome e sobrenome são obrigatórios'
    }
  }
  
  try {
    // Atualizar perfil na tabela profiles
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      return {
        success: false,
        error: error.message
      }
    }
    
    // Revalidar o caminho para atualizar os dados exibidos
    revalidatePath('/profile')
    
    return {
      success: true
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao atualizar perfil'
    }
  }
} 