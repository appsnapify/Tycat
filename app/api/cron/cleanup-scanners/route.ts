import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('⏰ Executando cron job de limpeza de scanners...')
    
    // Verificar se é uma requisição válida de cron (Vercel envia headers específicos)
    const cronSecret = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && !cronSecret?.includes(process.env.CRON_SECRET || 'missing-secret')) {
      console.log('❌ Cron job não autorizado')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Executar limpeza automática
    const cleanupUrl = new URL('/api/admin/cleanup-scanners', request.url)
    const cleanupResponse = await fetch(cleanupUrl.toString(), { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const cleanupResult = await cleanupResponse.json()

    if (!cleanupResponse.ok) {
      console.error('❌ Erro na limpeza automática:', cleanupResult)
      return NextResponse.json({
        error: 'Erro na limpeza automática',
        details: cleanupResult
      }, { status: 500 })
    }

    console.log('✅ Cron job concluído:', cleanupResult)

    // Log estruturado para monitoramento
    const cronLog = {
      timestamp: new Date().toISOString(),
      operation: 'cron_cleanup_scanners',
      status: 'success',
      scanners_cleaned: cleanupResult.cleaned || 0,
      sessions_expired: cleanupResult.sessions_expired || 0,
      next_run: 'tomorrow at 02:00 UTC'
    }

    console.log('📊 Cron log:', JSON.stringify(cronLog, null, 2))

    return NextResponse.json({
      message: 'Cron job executado com sucesso',
      result: cleanupResult,
      log: cronLog
    })

  } catch (error) {
    console.error('❌ Erro no cron job:', error)
    
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation: 'cron_cleanup_scanners',
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }

    console.log('💥 Error log:', JSON.stringify(errorLog, null, 2))

    return NextResponse.json({ 
      error: 'Erro no cron job',
      details: errorLog
    }, { status: 500 })
  }
}

// Endpoint também pode ser chamado via POST para testes manuais
export async function POST(request: NextRequest) {
  console.log('🔧 Execução manual do cron job solicitada')
  return GET(request)
} 