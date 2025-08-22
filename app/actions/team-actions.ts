'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

// Validar código da equipe
function validateTeamCode(teamCode: string) {
  if (!teamCode?.trim()) {
    return { success: false, error: 'Código da equipe é obrigatório' };
  }
  return { success: true };
}

// Validar usuário autenticado
function validateUser(user: any, userError: any) {
  if (userError) {
    console.error('Erro ao obter usuário:', userError);
    return { success: false, error: 'Erro ao verificar usuário: ' + userError.message };
  }
  if (!user?.id) {
    return { success: false, error: 'Usuário não autenticado' };
  }
  return { success: true };
}

export async function joinTeamWithCode(teamCode: string) {
  try {
    // Validação inicial
    const teamCodeValidation = validateTeamCode(teamCode);
    if (!teamCodeValidation.success) {
      return teamCodeValidation;
    }

    // Setup do cliente Supabase
    const cookieStore = cookies();
    const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

    // Obter e validar usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const userValidation = validateUser(user, userError);
    if (!userValidation.success) {
      return userValidation;
    }

    // 4. Chamar função RPC
    const { data: result, error: rpcError } = await supabase.rpc(
      'join_team_with_code',
      {
        user_id_param: user.id,
        team_code_param: teamCode.trim()
      }
    )

    // 5. Validar resultado RPC
    if (rpcError) {
      console.error('Erro RPC:', rpcError)
      return {
        success: false,
        error: rpcError.message
      }
    }

    if (!result || typeof result !== 'object') {
      console.error('Resultado inválido:', result)
      return {
        success: false,
        error: 'Resposta inválida do servidor'
      }
    }

    // 6. Validar dados necessários
    if (!result.team_id) {
      console.error('ID da equipe não encontrado no resultado:', result)
      return {
        success: false,
        error: 'Dados da equipe incompletos'
      }
    }

    // 7. Atualizar metadados do usuário
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role: 'promotor',
        team_id: result.team_id,
        team_role: 'member'
      }
    })

    if (updateError) {
      console.error('Erro ao atualizar metadados:', updateError)
      // Log do erro mas continuar, já que a adesão foi bem-sucedida
    }

    // 8. Retornar sucesso com dados
    return {
      success: true,
      data: {
        team_id: result.team_id,
        team_name: result.team_name || 'equipe',
        message: 'Adesão realizada com sucesso'
      }
    }

  } catch (error) {
    // 9. Tratamento de erros centralizado
    console.error('Erro ao aderir à equipe:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar solicitação'
    }
  }
} 