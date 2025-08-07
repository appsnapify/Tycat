import { createClient } from '@supabase/supabase-js'
import { createClient as createRouteHandlerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  console.log("[API /teams/create] Recebido request POST"); // Log inicial
  try {
    const requestData = await request.json()
    const { name, organizationId } = requestData
    console.log(`[API /teams/create] Dados Recebidos: name=${name}, organizationId=${organizationId}`); // Log dados
    
    // Validar dados
    if (!name || !name.trim()) {
      console.error("[API /teams/create] Erro: Nome da equipe é obrigatório");
      return NextResponse.json(
        { message: 'Nome da equipe é obrigatório' },
        { status: 400 }
      )
    }
    if (!organizationId) {
      console.error("[API /teams/create] Erro: ID da organização é obrigatório");
      return NextResponse.json(
        { message: 'ID da organização é obrigatório' },
        { status: 400 }
      )
    }
    
    // 🛡️ SEGURANÇA: Usar cliente com autenticação via cookies
    const supabase = await createRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[API /teams/create] Erro de autenticação:', authError?.message);
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    const userId = user.id
    console.log(`[API /teams/create] User ID autenticado: ${userId}`); // Log User ID
    
    // Verificar permissão (logs já existentes aqui são bons)
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations') // ATENÇÃO: A tabela é user_organizations ou organization_members?
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()
      
    if (orgError || !userOrg) {
      console.error('[API /teams/create] Erro ao verificar permissão na organização (user_organizations):', orgError);
      return NextResponse.json(
        { message: 'Você não tem permissão para criar equipes nesta organização' },
        { status: 403 }
      )
    }
    if (!['owner', 'organizador'].includes(userOrg.role)) {
       console.error(`[API /teams/create] Role insuficiente: ${userOrg.role}`);
      return NextResponse.json(
        { message: 'Apenas proprietários e organizadores podem criar equipes' },
        { status: 403 }
      )
    }
    
    console.log("[API /teams/create] Verificações de permissão OK. Tentando função segura...");
    
    // 🛡️ SEGURANÇA: Tentar função segura primeiro
    const { data: secureResult, error: secureError } = await supabase
      .rpc('create_team_secure', {
        p_team_name: name.trim(),
        p_team_description: null,
        p_organization_id: organizationId
      });

    if (!secureError && secureResult) {
      console.log('[API /teams/create] Função segura OK:', secureResult.message);
      return NextResponse.json({
        message: secureResult.message,
        teamId: secureResult.team_id,
        teamCode: secureResult.team_code,
        teamName: secureResult.team_name,
        secure: true
      });
    }

    console.warn('Função segura falhou, usando fallback:', secureError?.message);

    // 🚨 FALLBACK TEMPORÁRIO: SERVICE_ROLE (será removido na Fase 4)
    console.warn('Usando fallback SERVICE_ROLE para create team:', name);
    
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
    console.log("[API /teams/create] Cliente admin criado (fallback). Gerando ID e código...");
    
    const teamCode = `TEAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const teamId = uuidv4()
    console.log(`[API /teams/create] Tentando inserir na tabela 'teams' com id=${teamId}, name=${name}, org=${organizationId}, created_by=${userId}`);
    
    // Criar equipe usando cliente admin
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        id: teamId,
        name: name.trim(),
        team_code: teamCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: organizationId, 
        created_by: userId             
      })
      .select()
      
    // Logar resultado da inserção em TEAMS
    if (teamError) {
      console.error('[API /teams/create] ERRO AO INSERIR EM TEAMS:', teamError);
      // Não retornar ainda, o código abaixo tenta limpar
    } else {
       console.log("[API /teams/create] Inserção em TEAMS bem-sucedida. Dados:", teamData);
    }
    
    // Se houve erro na primeira inserção, não tentar a segunda e retornar
    if (teamError) {
       return NextResponse.json(
        { message: 'Erro ao criar equipe (falha na tabela teams): ' + teamError.message },
        { status: 500 }
      )
    }
    
    console.log(`[API /teams/create] Tentando inserir na tabela 'organization_teams' com org=${organizationId}, team=${teamId}`);
    // Vincular equipe à organização
    const { error: linkError } = await supabaseAdmin
      .from('organization_teams')
      .insert({
        organization_id: organizationId,
        team_id: teamId,
        is_active: true,
        // created_at e updated_at usarão default now()
        // commission_rate e fixed_amount são nullable
        // team_promoter_split usa default 30.0
      })
      
    // Logar resultado da inserção em ORGANIZATION_TEAMS
    if (linkError) {
      console.error('[API /teams/create] ERRO AO INSERIR EM ORGANIZATION_TEAMS (link):', linkError);
      
      console.log(`[API /teams/create] Tentando reverter/deletar equipa ${teamId} da tabela teams devido a erro no link...`);
      await supabaseAdmin
        .from('teams')
        .delete()
        .eq('id', teamId)
      
      return NextResponse.json(
        { message: 'Erro ao vincular equipe à organização: ' + linkError.message },
        { status: 500 }
      )
    } else {
        console.log("[API /teams/create] Inserção em ORGANIZATION_TEAMS bem-sucedida.");
    }
    
    console.log("[API /teams/create] Processo concluído com sucesso (fallback).");
    return NextResponse.json({
      success: true,
      message: 'Equipe criada com sucesso',
      teamCode,
      fallback: true
    })
    
  } catch (error) {
    console.error('[API /teams/create] Erro CATCH GERAL no servidor:', error);
    return NextResponse.json(
      { message: 'Erro no servidor' },
      { status: 500 }
    )
  }
} 