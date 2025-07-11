import { NextRequest, NextResponse } from 'next/server'
import { createClienteIsoladoAdminClient, createClienteIsoladoClient } from '@/lib/cliente-isolado/supabase'
import { 
  checkPhoneExists, 
  createClientUser, 
  loginWithPhone, 
  validatePhone, 
  normalizePhone,
  handleAuthError 
} from '@/lib/cliente-isolado/auth'
import { sessionCache } from '@/lib/cliente-isolado/cache'

/**
 * API DE LOGIN ISOLADA PARA SISTEMA CLIENTE
 * 
 * Características:
 * - Performance otimizada (< 200ms)
 * - Zero dependências de outros sistemas
 * - Auto-registro para novos utilizadores
 * - Cache de sessão integrado
 * - Error handling robusto
 */

export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const { phone, password, firstName, lastName } = body

    // ✅ Validação input
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Telefone é obrigatório'
      }, { status: 400 })
    }

    // ✅ Validar formato telefone
    if (!validatePhone(phone)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de telefone inválido'
      }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    // ✅ NOVO: Login com password (utilizador existente)
    if (password) {
      console.log(`🔐 [CLIENTE-ISOLADO-LOGIN] Login com password: ${normalizedPhone}`)
      
      const supabase = createClienteIsoladoAdminClient()
      
      // 1. Buscar utilizador
      const { data: userData, error: userError } = await supabase
        .from('client_users')
        .select('id, first_name, last_name, phone, email')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (userError || !userData) {
        return NextResponse.json({
          success: false,
          error: 'Telefone ou password incorretos'
        }, { status: 401 })
      }

      // 2. Verificar password via Admin Auth e criar tokens customizados
      try {
        // ✅ Verificar password primeiro
        const testClient = createClienteIsoladoClient()
        const { error: passwordError } = await testClient.auth.signInWithPassword({
          email: userData.email,
          password: password
        })

        if (passwordError) {
          console.log('❌ [LOGIN] Password incorreta:', passwordError.message)
          return NextResponse.json({
            success: false,
            error: 'Telefone ou password incorretos'
          }, { status: 401 })
        }
        
        // ✅ Password correta - gerar sessão via admin
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.email
        })

        if (linkError || !linkData.user) {
          console.log('❌ [LOGIN] Erro ao gerar link:', linkError?.message)
          return NextResponse.json({
            success: false,
            error: 'Erro interno do servidor'
          }, { status: 500 })
        }
        
        console.log('✅ [LOGIN] Password verificada e link gerado:', {
          userId: linkData.user.id,
          hasProperties: !!linkData.properties
        })

        // 3. Criar tokens de sessão personalizados
        const sessionToken = `cliente_${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const refreshToken = `refresh_${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 4. Atualizar metadados
        await supabase.auth.admin.updateUserById(
          linkData.user.id,
          {
            user_metadata: {
              client_user_id: userData.id,
              phone: userData.phone,
              firstName: userData.first_name,
              lastName: userData.last_name,
              role: 'cliente',
              session_token: sessionToken,
              last_login: new Date().toISOString()
            }
          }
        )

        // 5. Cache da sessão com token
        const user = {
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          phone: userData.phone
        }
        
        sessionCache.set(user)

        const duration = performance.now() - startTime
        console.log(`✅ [CLIENTE-ISOLADO-LOGIN] Login com password concluído em ${duration.toFixed(2)}ms`)

        // ✅ CRÍTICO: Retornar sessão simples
        const response = NextResponse.json({
          success: true,
          user: user,
          session: {
            access_token: sessionToken,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          message: 'Login realizado com sucesso'
        }, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Response-Time': duration.toFixed(2),
            'X-API-Version': 'cliente-isolado-v1'
          }
        })
        
        // ✅ Cookies de sessão personalizados
        response.cookies.set('cliente-session-token', sessionToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 // 24 horas
        })
        
        response.cookies.set('cliente-user-id', linkData.user.id, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 // 24 horas
        })

        return response

      } catch (authError) {
        console.error('❌ [LOGIN] Auth error:', authError)
        return NextResponse.json({
          success: false,
          error: 'Telefone ou password incorretos'
        }, { status: 401 })
      }
    }

    // ✅ LEGADO: Auto-registro sem password (manter compatibilidade)
    const userExists = await checkPhoneExists(normalizedPhone)
    
    let session
    
    if (userExists) {
      // ✅ Login utilizador existente sem password
      console.log(`🔥 [CLIENTE-ISOLADO-LOGIN] Login sem password: ${normalizedPhone}`)
      session = await loginWithPhone(normalizedPhone)
    } else {
      // ✅ Auto-registro + login
      console.log(`🔥 [CLIENTE-ISOLADO-LOGIN] Auto-registro: ${normalizedPhone}`)
      
      if (!firstName || !lastName) {
        return NextResponse.json({
          success: false,
          error: 'Nome e apelido são obrigatórios para novos utilizadores'
        }, { status: 400 })
      }

      const newUser = await createClientUser({
        phone: normalizedPhone,
        firstName,
        lastName
      })

      session = await loginWithPhone(normalizedPhone)
    }

    // ✅ Cache da sessão
    sessionCache.set(session.user)

    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-LOGIN] Concluído em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      user: session.user,
      message: userExists ? 'Login realizado com sucesso' : 'Conta criada e login realizado'
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
    
    console.error(`❌ [CLIENTE-ISOLADO-LOGIN] Erro após ${duration.toFixed(2)}ms:`, authError)

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
 * Método GET para health check da API
 */
export async function GET() {
  return NextResponse.json({
    service: 'cliente-isolado-auth-login',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v1.0'
  })
} 