/**
 * API Route: /api/profile
 * 
 * Este endpoint fornece informações completas do perfil de um usuário autenticado,
 * incluindo detalhes da equipe e do promotor, utilizando uma função RPC segura
 * que contorna problemas de RLS.
 * 
 * EXEMPLO DE RESPOSTA:
 * {
 *   "user": {
 *     "id": "ab73d128-c997-4858-a47c-95d1403117ac",
 *     "email": "usuario@exemplo.com",
 *     "role": "chefe-equipe",
 *     "full_name": "Nome Completo",
 *     "avatar_url": "https://example.com/avatar.jpg",
 *     "team_id": "c7e59d45-c2d9-4990-a38c-61cd0c630cdf",
 *     "team_code": "TEAM-A1B2C",
 *     "team_name": "Minha Equipe"
 *   },
 *   "team": {
 *     "id": "c7e59d45-c2d9-4990-a38c-61cd0c630cdf",
 *     "name": "Minha Equipe",
 *     "description": "Descrição da equipe",
 *     "team_code": "TEAM-A1B2C",
 *     "member_count": 5,
 *     "events_count": 2,
 *     "sales_count": 10,
 *     "sales_total": 500
 *   },
 *   "has_team": true,
 *   "is_team_leader": true
 * }
 * 
 * IMPORTANTE: Esta API requer autenticação. 
 * Certifique-se de incluir o cookie de sessão Supabase nas solicitações.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Manipula solicitações GET para obter o perfil do usuário atual
 * Retorna um objeto JSON com dados completos do usuário, equipe e status
 * 
 * @returns {Object} Dados do perfil do usuário e sua equipe
 * @throws {Error} Retorna erro 401 se não autenticado
 * @throws {Error} Retorna erro 500 se houver falha na obtenção do perfil
 */
export async function GET() {
  try {
    // Inicializar cliente Supabase para o manipulador de rota
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Verificar se o usuário está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Erro ao obter sessão:', sessionError)
      return NextResponse.json(
        { error: 'Erro ao verificar autenticação', details: sessionError.message },
        { status: 401 }
      )
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login para continuar.' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    console.log('Obtendo perfil para usuário:', userId)
    
    // Chamar a função RPC get_promoter_profile para obter os dados completos
    // Esta função combina dados do usuário e da equipe em uma única chamada
    const { data: profileData, error: profileError } = await supabase.rpc(
      'get_promoter_profile',
      { user_id_param: userId }
    )
    
    if (profileError) {
      console.error('Erro ao obter perfil do promotor:', profileError)
      return NextResponse.json(
        { error: 'Erro ao obter perfil', details: profileError.message },
        { status: 500 }
      )
    }
    
    if (!profileData) {
      console.warn('Nenhum dado de perfil encontrado para o usuário:', userId)
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar se há um erro na resposta da função
    // (a função RPC pode retornar erros como parte do resultado)
    if (profileData.error) {
      console.error('Erro retornado pela função get_promoter_profile:', profileData.error)
      return NextResponse.json(
        { error: 'Erro ao processar perfil', details: profileData.error },
        { status: 500 }
      )
    }
    
    // Adicionar cabeçalho de cache para melhorar performance
    // Cache por 5 minutos, mas verificar se há uma nova versão em segundo plano
    const headers = new Headers()
    headers.append('Cache-Control', 's-maxage=300, stale-while-revalidate')
    
    // Retornar os dados do perfil
    return NextResponse.json(profileData, {
      headers,
      status: 200
    })
  } catch (error) {
    console.error('Exceção ao processar solicitação de perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 