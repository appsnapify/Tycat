import { NextRequest, NextResponse } from 'next/server'
import { checkActiveSession, checkActiveSessionByToken, handleAuthError } from '@/lib/cliente-isolado/auth'
import { sessionCache } from '@/lib/cliente-isolado/cache'

/**
 * API DE VERIFICAÇÃO DE SESSÃO ISOLADA
 * 
 * Características:
 * - Performance ultra-rápida (< 100ms)
 * - Cache inteligente
 * - Zero dependências de outros sistemas
 * - Fallback para verificação real
 */

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    // ✅ Tentar cache primeiro (super rápido)
    const cachedUser = sessionCache.get()
    
    if (cachedUser && sessionCache.isValid()) {
      const duration = performance.now() - startTime
      console.log(`🚀 [CLIENTE-ISOLADO-CHECK] Cache hit em ${duration.toFixed(2)}ms`)
      
      return NextResponse.json({
        success: true,
        user: cachedUser,
        source: 'cache'
      }, {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minutos
          'X-Response-Time': duration.toFixed(2),
          'X-Data-Source': 'cache'
        }
      })
    }

    // ✅ Cache miss ou expirado - verificar sessão com tokens personalizados
    const sessionToken = request.cookies.get('cliente-session-token')?.value || 
                         request.headers.get('X-Session-Token')
    const userId = request.cookies.get('cliente-user-id')?.value || 
                  request.headers.get('X-User-Id')
    
    if (!sessionToken || !userId) {
      const duration = performance.now() - startTime
      
      // ✅ Limpar cache inválido
      sessionCache.clear()
      
      return NextResponse.json({
        success: false,
        error: 'Sessão não encontrada - tokens ausentes'
      }, { 
        status: 401,
        headers: {
          'X-Response-Time': duration.toFixed(2),
          'X-Data-Source': 'cookies'
        }
      })
    }

    // ✅ Verificar sessão via token personalizado
    const user = await checkActiveSessionByToken(sessionToken, userId)
    
    if (!user) {
      const duration = performance.now() - startTime
      
      // ✅ Limpar cache inválido
      sessionCache.clear()
      
      return NextResponse.json({
        success: false,
        error: 'Sessão inválida ou expirada'
      }, { 
        status: 401,
        headers: {
          'X-Response-Time': duration.toFixed(2),
          'X-Data-Source': 'database'
        }
      })
    }

    // ✅ Atualizar cache com dados frescos
    sessionCache.refresh(user)
    
    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-CHECK] Sessão verificada em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      user,
      source: 'database'
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Response-Time': duration.toFixed(2),
        'X-Data-Source': 'database'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    const authError = handleAuthError(error)
    
    console.error(`❌ [CLIENTE-ISOLADO-CHECK] Erro após ${duration.toFixed(2)}ms:`, authError)

    // ✅ Limpar cache em caso de erro
    sessionCache.clear()

    return NextResponse.json({
      success: false,
      error: authError.message
    }, { 
      status: authError.statusCode,
      headers: {
        'X-Response-Time': duration.toFixed(2),
        'X-Error-Code': authError.code
      }
    })
  }
}

/**
 * Método POST para refresh forçado da sessão
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    // ✅ Forçar verificação sem cache com tokens personalizados
    const sessionToken = request.cookies.get('cliente-session-token')?.value || 
                         request.headers.get('X-Session-Token')
    const userId = request.cookies.get('cliente-user-id')?.value || 
                  request.headers.get('X-User-Id')
    
    if (!sessionToken || !userId) {
      sessionCache.clear()
      
      return NextResponse.json({
        success: false,
        error: 'Tokens de sessão ausentes'
      }, { status: 401 })
    }

    const user = await checkActiveSessionByToken(sessionToken, userId)
    
    if (!user) {
      sessionCache.clear()
      
      return NextResponse.json({
        success: false,
        error: 'Sessão inválida'
      }, { status: 401 })
    }

    // ✅ Atualizar cache
    sessionCache.refresh(user)
    
    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-CHECK] Refresh forçado em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      user,
      source: 'refreshed'
    }, {
      headers: {
        'X-Response-Time': duration.toFixed(2),
        'X-Data-Source': 'refreshed'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    const authError = handleAuthError(error)
    
    console.error(`❌ [CLIENTE-ISOLADO-CHECK] Erro no refresh após ${duration.toFixed(2)}ms:`, authError)
    
    sessionCache.clear()

    return NextResponse.json({
      success: false,
      error: authError.message
    }, { 
      status: authError.statusCode,
      headers: {
        'X-Response-Time': duration.toFixed(2),
        'X-Error-Code': authError.code
      }
    })
  }
} 