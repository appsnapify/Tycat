import { NextRequest, NextResponse } from 'next/server'
import { loginWithCredentials, validatePhone, normalizePhone, handleAuthError } from '@/lib/user/auth'
import { userSessionCache } from '@/lib/user/cache'

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const { phone, password } = body

    // ✅ Validação input
    if (!phone || !password) {
      return NextResponse.json({
        success: false,
        error: 'Telemóvel e password são obrigatórios'
      }, { status: 400 })
    }

    // ✅ Validar formato telemóvel
    if (!validatePhone(phone)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de telemóvel inválido'
      }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    console.log(`🔐 [USER-LOGIN] Tentativa login: telemóvel mascarado`)

    // ✅ Login usando nova lógica (admin bypass + password fake)
    const session = await loginWithCredentials(normalizedPhone, password)

    console.log(`✅ [USER-LOGIN] Login bem-sucedido: ${session.user.firstName}`)

    // ✅ Armazenar no cache
    userSessionCache.setUser(session.user)

    const duration = performance.now() - startTime
    console.log(`🎯 [USER-LOGIN] Login completo em ${duration.toFixed(2)}ms`)

    const response = NextResponse.json({
      success: true,
      user: session.user,
      session: {
        access_token: session.accessToken,
        expires_at: session.expiresAt
      },
      message: 'Login realizado com sucesso'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'user-v1'
      }
    })

    // ✅ Cookies de sessão personalizados (mesma estrutura que cliente-isolado)
    response.cookies.set('user-session-token', session.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 horas
    })
    
    response.cookies.set('user-id', session.user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 horas
    })

    return response

  } catch (error) {
    const duration = performance.now() - startTime
    console.error('❌ [USER-LOGIN] Erro:', error)
    
    const authError = handleAuthError(error)
    
    return NextResponse.json({
      success: false,
      error: authError.message
    }, { 
      status: authError.statusCode,
      headers: {
        'X-Response-Time': duration.toFixed(2)
      }
    })
  }
} 