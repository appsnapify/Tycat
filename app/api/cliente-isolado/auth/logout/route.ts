import { NextRequest, NextResponse } from 'next/server'
import { logoutUser, handleAuthError } from '@/lib/cliente-isolado/auth'
import { sessionCache, cacheUtils } from '@/lib/cliente-isolado/cache'

/**
 * API DE LOGOUT ISOLADA
 * 
 * Características:
 * - Logout rápido e limpo (< 100ms)
 * - Limpeza completa de cache
 * - Zero dependências de outros sistemas
 * - Graceful error handling
 */

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    // ✅ Logout do Supabase
    await logoutUser()
    
    // ✅ Limpar todos os caches do utilizador
    sessionCache.clear()
    
    // ✅ Limpeza adicional de cache expirado
    cacheUtils.cleanup()
    
    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-LOGOUT] Concluído em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'cliente-isolado-v1'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    const authError = handleAuthError(error)
    
    console.error(`❌ [CLIENTE-ISOLADO-LOGOUT] Erro após ${duration.toFixed(2)}ms:`, authError)

    // ✅ Mesmo com erro, limpar cache local
    sessionCache.clear()
    
    // ✅ Não falhar o logout por erro de API - sempre sucesso para UX
    return NextResponse.json({
      success: true,
      message: 'Logout realizado (com avisos)',
      warning: authError.message
    }, {
      status: 200,
      headers: {
        'X-Response-Time': duration.toFixed(2),
        'X-Warning-Code': authError.code
      }
    })
  }
}

/**
 * Método GET para verificar status de logout
 */
export async function GET() {
  return NextResponse.json({
    service: 'cliente-isolado-auth-logout',
    status: 'ready',
    timestamp: new Date().toISOString(),
    version: 'v1.0'
  })
} 