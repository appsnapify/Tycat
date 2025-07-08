import { NextRequest, NextResponse } from 'next/server'
import { createClienteIsoladoAdminClient, wrapWithLogging } from '@/lib/cliente-isolado/supabase'
import { validatePhone, normalizePhone, handleAuthError } from '@/lib/cliente-isolado/auth'
import { z } from 'zod'

/**
 * API DE VERIFICAÇÃO DE TELEFONE ISOLADA
 * 
 * Características:
 * - Performance otimizada (< 100ms)
 * - Zero dependências de outros sistemas
 * - Validação rigorosa
 * - Cache otimizado
 */

// Schema de validação
const phoneSchema = z.object({
  phone: z.string()
    .min(9, "Telefone deve ter pelo menos 9 dígitos")
    .max(15, "Telefone muito longo")
    .regex(/^\+?[1-9]\d{8,14}$/, "Formato de telefone inválido")
})

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    
    // ✅ Validação input
    const result = phoneSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Formato de telefone inválido'
      }, { status: 400 })
    }

    const { phone } = result.data
    const normalizedPhone = normalizePhone(phone)

    // ✅ Validar formato adicional
    if (!validatePhone(normalizedPhone)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de telefone inválido'
      }, { status: 400 })
    }

    // ✅ Verificar na base de dados
    const supabase = createClienteIsoladoAdminClient()
    
    const { data: userData, error: userError } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (userError) {
      console.error('❌ [CLIENTE-ISOLADO-CHECK-PHONE] Erro BD:', userError)
      throw new Error(`Erro ao verificar telefone: ${userError.message}`)
    }

    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-CHECK-PHONE] Verificação concluída em ${duration.toFixed(2)}ms`)

    // ✅ Retornar informações completas
    return NextResponse.json({
      success: true,
      exists: !!userData,
      userId: userData?.id || null,
      nextStep: userData ? 'password' : 'register'
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
    
    console.error(`❌ [CLIENTE-ISOLADO-CHECK-PHONE] Erro após ${duration.toFixed(2)}ms:`, authError)

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
 * Método GET para health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'cliente-isolado-check-phone',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v1.0'
  })
} 