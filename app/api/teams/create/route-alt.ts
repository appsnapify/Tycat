import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { name, organizationId } = requestData
    
    // Validar dados
    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Nome da equipe é obrigatório' },
        { status: 400 }
      )
    }
    
    if (!organizationId) {
      return NextResponse.json(
        { message: 'ID da organização é obrigatório' },
        { status: 400 }
      )
    }
    
    // Criar cliente do Supabase usando cookies (autenticado)
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verificar se o usuário está autenticado
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      console.error('Erro de autenticação:', authError)
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    
    // Verificar se o usuário tem permissão para a organização
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()
    
    if (orgError || !userOrg) {
      console.error('Erro ao verificar permissão na organização:', orgError)
      return NextResponse.json(
        { message: 'Você não tem permissão para criar equipes nesta organização' },
        { status: 403 }
      )
    }
    
    // Verificar se o usuário é owner ou admin
    if (!['owner', 'admin'].includes(userOrg.role)) {
      return NextResponse.json(
        { message: 'Apenas proprietários e administradores podem criar equipes' },
        { status: 403 }
      )
    }
    
    // Criar um cliente do Supabase com serviço administrativo para contornar RLS
    // ⚠️ IMPORTANTE: Essa abordagem requer variáveis de ambiente configuradas no servidor
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Gerar código único para a equipe
    const teamCode = `TEAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const teamId = uuidv4()
    
    // Criar equipe usando cliente admin (bypassa RLS)
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        id: teamId,
        name: name.trim(),
        team_code: teamCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (teamError) {
      console.error('Erro ao criar equipe:', teamError)
      return NextResponse.json(
        { message: 'Erro ao criar equipe: ' + teamError.message },
        { status: 500 }
      )
    }
    
    // Vincular equipe à organização
    const { error: linkError } = await supabaseAdmin
      .from('organization_teams')
      .insert({
        organization_id: organizationId,
        team_id: teamId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (linkError) {
      console.error('Erro ao vincular equipe:', linkError)
      
      // Tentar excluir a equipe se falhar ao vinculá-la
      await supabaseAdmin
        .from('teams')
        .delete()
        .eq('id', teamId)
      
      return NextResponse.json(
        { message: 'Erro ao vincular equipe à organização: ' + linkError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Equipe criada com sucesso',
      teamCode
    })
    
  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { message: 'Erro no servidor' },
      { status: 500 }
    )
  }
} 