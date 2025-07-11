import { NextRequest, NextResponse } from 'next/server'
import { logoutUser } from '@/lib/user/auth'
import { clearAllUserCache } from '@/lib/user/cache'

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    console.log('🚪 [USER-LOGOUT] Iniciando logout...')

    // ✅ Logout do Supabase
    await logoutUser()

    // ✅ Limpar cache
    clearAllUserCache()

    const duration = performance.now() - startTime
    console.log(`✅ [USER-LOGOUT] Logout completo em ${duration.toFixed(2)}ms`)

    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'user-v1'
      }
    })

    // ✅ Limpar cookies
    response.cookies.set('user-session-token', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Expira imediatamente
    })
    
    response.cookies.set('user-id', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Expira imediatamente
    })

    return response

  } catch (error) {
    const duration = performance.now() - startTime
    console.error('❌ [USER-LOGOUT] Erro:', error)
    
    // Mesmo com erro, tentar limpar cache e cookies
    clearAllUserCache()
    
    const response = NextResponse.json({
      success: true, // Sempre retornar sucesso para logout
      message: 'Logout realizado (com limpeza local)'
    }, { 
      status: 200,
      headers: {
        'X-Response-Time': duration.toFixed(2)
      }
    })

    // Limpar cookies mesmo com erro
    response.cookies.set('user-session-token', '', { maxAge: 0 })
    response.cookies.set('user-id', '', { maxAge: 0 })

    return response
  }
} 