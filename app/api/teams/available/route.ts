import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Interface para dados retornados pela função RPC get_available_teams_secure
interface RPCTeamData {
  team_id: string;
  team_name: string;
  team_code: string;
  team_description: string | null;
  created_by: string;
  member_count: number;
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    // 🛡️ SEGURANÇA: Tentar função segura primeiro
    const { data: secureTeams, error: secureError } = await supabase
      .rpc('get_available_teams_secure', { p_organization_id: organizationId });

    if (!secureError && secureTeams) {
      console.log('[API /teams/available] Função segura OK:', secureTeams.length, 'equipas');
      return NextResponse.json({
        success: true,
        teams: secureTeams.map((team: RPCTeamData) => ({
          id: team.team_id,
          name: team.team_name,
          team_code: team.team_code,
          description: team.team_description,
          created_by: team.created_by,
          member_count: team.member_count
        })),
        secure: true
      });
    }

    console.warn('Função segura falhou, usando fallback:', secureError?.message);

    // 🚨 FALLBACK TEMPORÁRIO: SERVICE_ROLE (será removido na Fase 4)
    console.warn('Usando fallback SERVICE_ROLE para available teams');
    
    // Usar cliente admin para acessar dados (FALLBACK)
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
    
    // Buscar equipes sem organização
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, team_code, created_at, created_by, organization_id')
      .is('organization_id', null)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (teamsError) {
      console.error('Erro ao buscar equipes:', teamsError)
      return NextResponse.json(
        { message: 'Erro ao buscar equipes disponíveis' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      teams: teams || [],
      message: `Encontradas ${teams?.length || 0} equipes disponíveis`,
      fallback: true
    })
    
  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { message: 'Erro no servidor' },
      { status: 500 }
    )
  }
} 