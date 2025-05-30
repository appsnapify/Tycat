'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function joinTeamWithCode(teamCode: string) {
  try {
    // 1. Validação inicial
    if (!teamCode?.trim()) {
      return {
        success: false,
        error: 'Código da equipe é obrigatório'
      }
    }

    // 2. Setup do cliente Supabase com cookies
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          }
        }
      }
    )

    // 3. Obter e validar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      console.error('Erro ao obter sessão:', sessionError)
      return {
        success: false,
        error: 'Erro ao verificar sessão do usuário'
      }
    }

    // 4. Chamar função RPC
    console.log('Tentando aderir à equipe com código:', teamCode.trim())
    const { data: result, error: rpcError } = await supabase.rpc(
      'join_team_with_code',
      {
        user_id_param: session.user.id,
        team_code_param: teamCode.trim()
      }
    )

    // 5. Validar resultado RPC
    if (rpcError) {
      console.error('Erro RPC detalhado:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint
      })
      return {
        success: false,
        error: rpcError.message
      }
    }

    console.log('Resultado da adesão:', result)

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