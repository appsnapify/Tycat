import { NextRequest, NextResponse } from 'next/server'
import { checkPhoneStatus, validatePhone, normalizePhone, handleAuthError } from '@/lib/user/auth'

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const { phone } = body

    // ✅ Validação input
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Telemóvel é obrigatório'
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
    console.log(`📞 [USER-CHECK-PHONE] Verificando telemóvel mascarado`)

    // ✅ Verificar status detalhado do telemóvel
    const result = await checkPhoneStatus(normalizedPhone)

    const duration = performance.now() - startTime
    console.log(`✅ [USER-CHECK-PHONE] Verificação concluída em ${duration.toFixed(2)}ms: ${result.status}`)

    // Mapear status para resposta frontend
    const response = {
      success: true,
      status: result.status,
      message: result.message,
      // Para compatibilidade: exists = true se precisa password
      exists: result.status === 'EXISTE_USER' || result.status === 'EXISTE_CLIENTE',
      userInfo: result.userInfo
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'user-v2'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    console.error('❌ [USER-CHECK-PHONE] Erro:', error)
    
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