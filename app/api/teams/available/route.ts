import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    
    // Usar cliente admin para acessar dados
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
      message: `Encontradas ${teams?.length || 0} equipes disponíveis`
    })
    
  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { message: 'Erro no servidor' },
      { status: 500 }
    )
  }
} 