import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const event_id = searchParams.get('event_id')

    if (!event_id) {
      return NextResponse.json({ 
        error: 'event_id é obrigatório' 
      }, { status: 400 })
    }

    // Verificar se o evento existe e se o usuário tem acesso
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organization_id')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ 
        error: 'Evento não encontrado' 
      }, { status: 404 })
    }

    // Buscar scanners do evento com estatísticas das sessões
    const { data: scanners, error: scannersError } = await supabase
      .from('event_scanners')
      .select(`
        *,
        scanner_sessions(
          id,
          status,
          created_at,
          last_activity,
          total_scans,
          successful_scans,
          failed_scans
        )
      `)
      .eq('event_id', event_id)
      .order('created_at', { ascending: false })

    if (scannersError) {
      console.error('Erro ao buscar scanners:', scannersError)
      return NextResponse.json({ 
        error: 'Erro interno do servidor' 
      }, { status: 500 })
    }

    // Remover password_hash dos resultados e adicionar estatísticas
    const scannersResponse = scanners.map(scanner => {
      const { password_hash, ...scannerData } = scanner
      
      // Calcular estatísticas das sessões
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      
      // Contar APENAS sessões realmente ativas (não expiradas + atividade recente)
      const realActiveSessions = scanner.scanner_sessions?.filter(s => 
        s.status === 'active' && 
        new Date(s.last_activity) > fiveMinutesAgo &&
        new Date(s.expires_at || s.created_at) > now
      ).length || 0
      
      const totalScans = scanner.scanner_sessions?.reduce((sum, s) => sum + (s.total_scans || 0), 0) || 0
      const successfulScans = scanner.scanner_sessions?.reduce((sum, s) => sum + (s.successful_scans || 0), 0) || 0
      const lastActivity = scanner.scanner_sessions?.reduce((latest, s) => {
        if (!latest) return s.last_activity
        return new Date(s.last_activity) > new Date(latest) ? s.last_activity : latest
      }, null as string | null)

      return {
        ...scannerData,
        stats: {
          active_sessions: realActiveSessions,
          total_scans: totalScans,
          successful_scans: successfulScans,
          last_activity: lastActivity
        }
      }
    })
    
    return NextResponse.json({
      scanners: scannersResponse
    })

  } catch (error) {
    console.error('Erro ao listar scanners:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 