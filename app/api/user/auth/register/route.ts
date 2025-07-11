import { NextRequest, NextResponse } from 'next/server'
import { createUserProfile, validatePhone, normalizePhone, handleAuthError } from '@/lib/user/auth'
import { userSessionCache } from '@/lib/user/cache'

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const { phone, firstName, lastName, password } = body

    // ✅ Validação input
    if (!phone || !firstName || !lastName || !password) {
      return NextResponse.json({
        success: false,
        error: 'Todos os campos são obrigatórios'
      }, { status: 400 })
    }

    // ✅ Validar formato telemóvel
    if (!validatePhone(phone)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de telemóvel inválido'
      }, { status: 400 })
    }

    // ✅ Validar password
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Password deve ter pelo menos 6 caracteres'
      }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    console.log(`📝 [USER-REGISTER] Novo registo: telemóvel mascarado - ${firstName.charAt(0)}*** ${lastName?.charAt(0)}***`)

    // ✅ Criar utilizador com nova lógica (password fake)
    const user = await createUserProfile({
      phone: normalizedPhone,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password: password
    })

    console.log(`✅ [USER-REGISTER] Utilizador criado: ${user.firstName} ${user.lastName}`)

    // ✅ Armazenar no cache
    userSessionCache.setUser(user)

    const duration = performance.now() - startTime
    console.log(`🎯 [USER-REGISTER] Registo completo em ${duration.toFixed(2)}ms`)

    // ✅ Gerar token de sessão personalizado (mesma estrutura que cliente-isolado)
    const sessionToken = `user_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const response = NextResponse.json({
      success: true,
      user: user,
      session: {
        access_token: sessionToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      message: 'Registo realizado com sucesso'
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'user-v1'
      }
    })

    // ✅ Cookies de sessão personalizados
    response.cookies.set('user-session-token', sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 horas
    })
    
    response.cookies.set('user-id', user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 horas
    })

    return response

  } catch (error) {
    const duration = performance.now() - startTime
    console.error('❌ [USER-REGISTER] Erro:', error)
    
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