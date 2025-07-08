import { NextRequest, NextResponse } from 'next/server'
import { createClienteIsoladoAdminClient } from '@/lib/cliente-isolado/supabase'
import { validatePhone, normalizePhone, handleAuthError } from '@/lib/cliente-isolado/auth'
import { sessionCache } from '@/lib/cliente-isolado/cache'
import { z } from 'zod'

/**
 * API DE REGISTO ISOLADA PARA SISTEMA CLIENTE
 * 
 * Características:
 * - Performance otimizada (< 300ms)
 * - Zero dependências de outros sistemas
 * - Validação rigorosa
 * - Integração com Supabase Auth
 * - Auto-login após registo
 */

// Schema de validação - compatível com interface atual
const registerSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Apelido deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
  email: z.string().email("Email inválido").optional(),
  birthDate: z.string().optional(),
  postalCode: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional()
})

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    
    // ✅ Validação input
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: result.error.format()
      }, { status: 400 })
    }

    const { phone, firstName, lastName, password, email, birthDate, postalCode, gender } = result.data
    const normalizedPhone = normalizePhone(phone)

    // ✅ Validar formato telefone
    if (!validatePhone(normalizedPhone)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de telefone inválido'
      }, { status: 400 })
    }

    const supabase = createClienteIsoladoAdminClient()

    // ✅ Verificar se telefone já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('client_users')
      .select('id, phone')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (checkError) {
      throw new Error(`Erro ao verificar telefone: ${checkError.message}`)
    }

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Este telefone já está registado. Faça login em vez disso.'
      }, { status: 409 })
    }

    // ✅ Gerar email se não fornecido
    const userEmail = email || `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}@temp.snap.com`

    // ✅ 1. Criar no Supabase Auth primeiro
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        phone: normalizedPhone,
        firstName: firstName,
        lastName: lastName,
        role: 'cliente',
        created_via: 'cliente-isolado'
      }
    })

    if (authError || !authUser.user) {
      throw new Error(`Erro ao criar conta: ${authError?.message}`)
    }

    // ✅ 2. Criar na tabela client_users
    const { data: clientUser, error: clientError } = await supabase
      .from('client_users')
      .insert({
        id: authUser.user.id, // ✅ Usar mesmo ID do Auth
        phone: normalizedPhone,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate || null,
        postal_code: postalCode || null,
        gender: gender || null,
        password: null, // ✅ Não armazenar password em texto plano
        created_at: new Date().toISOString()
      })
      .select('id, first_name, last_name, phone, email')
      .single()

    if (clientError) {
      // ✅ Limpar Auth se falhou criar na tabela
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Erro ao criar utilizador: ${clientError.message}`)
    }

    // ✅ 3. Auto-login após registo
    let sessionData = null
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      })

      if (!loginError && loginData.user) {
        sessionData = loginData

        // ✅ Atualizar metadados pós-login
        await supabase.auth.admin.updateUserById(
          loginData.user.id,
          {
            user_metadata: {
              client_user_id: clientUser.id,
              phone: normalizedPhone,
              firstName: firstName,
              lastName: lastName,
              role: 'cliente',
              last_login: new Date().toISOString()
            }
          }
        )

        // ✅ Cache da sessão
        sessionCache.set({
          id: clientUser.id,
          firstName: clientUser.first_name,
          lastName: clientUser.last_name,
          email: clientUser.email,
          phone: clientUser.phone
        })
      }
    } catch (autoLoginError) {
      console.warn('⚠️ [CLIENTE-ISOLADO-REGISTER] Auto-login falhou:', autoLoginError)
    }

    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-REGISTER] Registo concluído em ${duration.toFixed(2)}ms`)

    // ✅ Retornar dados do utilizador
    return NextResponse.json({
      success: true,
      user: {
        id: clientUser.id,
        firstName: clientUser.first_name,
        lastName: clientUser.last_name,
        phone: clientUser.phone,
        email: clientUser.email
      },
      session: sessionData,
      message: 'Conta criada com sucesso'
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
    
    console.error(`❌ [CLIENTE-ISOLADO-REGISTER] Erro após ${duration.toFixed(2)}ms:`, authError)

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
    service: 'cliente-isolado-register',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v1.0'
  })
} 