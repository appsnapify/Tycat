import { NextRequest, NextResponse } from 'next/server'
import { createClienteIsoladoAdminClient } from '@/lib/cliente-isolado/supabase'
import { sessionCache } from '@/lib/cliente-isolado/cache'
import { handleAuthError } from '@/lib/cliente-isolado/auth'

/**
 * API DE DADOS DE UTILIZADOR ISOLADA
 * 
 * Características:
 * - Performance ultra-rápida (< 100ms)
 * - Cache inteligente
 * - Atualização de dados
 * - Zero dependências de outros sistemas
 */

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId é obrigatório'
      }, { status: 400 })
    }

    // ✅ Verificar cache primeiro
    const cachedUser = sessionCache.get()
    
    if (cachedUser && cachedUser.id === userId && sessionCache.isValid()) {
      const duration = performance.now() - startTime
      console.log(`🚀 [CLIENTE-ISOLADO-USER] Cache hit em ${duration.toFixed(2)}ms`)
      
      return NextResponse.json({
        success: true,
        user: cachedUser,
        source: 'cache'
      }, {
        headers: {
          'Cache-Control': 'private, max-age=600', // 10 minutos
          'X-Response-Time': duration.toFixed(2),
          'X-Data-Source': 'cache'
        }
      })
    }

    // ✅ Buscar dados frescos
    const supabase = createClienteIsoladoAdminClient()
    
    const { data: user, error } = await supabase
      .from('client_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({
        success: false,
        error: 'Utilizador não encontrado'
      }, { status: 404 })
    }

    const userData = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone
    }

    // ✅ Atualizar cache
    sessionCache.refresh(userData)

    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-USER] Dados carregados em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      user: userData,
      source: 'database'
    }, {
      headers: {
        'Cache-Control': 'private, max-age=600',
        'X-Response-Time': duration.toFixed(2),
        'X-Data-Source': 'database',
        'X-API-Version': 'cliente-isolado-v1'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    const authError = handleAuthError(error)
    
    console.error(`❌ [CLIENTE-ISOLADO-USER] Erro após ${duration.toFixed(2)}ms:`, authError)

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
 * Método PATCH para atualizar dados do utilizador
 */
export async function PATCH(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId é obrigatório'
      }, { status: 400 })
    }

    const body = await request.json()
    const { firstName, lastName } = body

    // ✅ Validação básica
    if (!firstName || !lastName) {
      return NextResponse.json({
        success: false,
        error: 'Nome e apelido são obrigatórios'
      }, { status: 400 })
    }

    const supabase = createClienteIsoladoAdminClient()
    
    // ✅ Atualizar na base de dados
    const { data: updatedUser, error } = await supabase
      .from('client_users')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error || !updatedUser) {
      throw new Error(`Erro ao atualizar utilizador: ${error?.message}`)
    }

    const userData = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      phone: updatedUser.phone
    }

    // ✅ Atualizar cache
    sessionCache.refresh(userData)

    const duration = performance.now() - startTime
    console.log(`✅ [CLIENTE-ISOLADO-USER] Atualização em ${duration.toFixed(2)}ms`)

    return NextResponse.json({
      success: true,
      user: userData,
      message: 'Dados atualizados com sucesso'
    }, {
      headers: {
        'X-Response-Time': duration.toFixed(2),
        'X-API-Version': 'cliente-isolado-v1'
      }
    })

  } catch (error) {
    const duration = performance.now() - startTime
    const authError = handleAuthError(error)
    
    console.error(`❌ [CLIENTE-ISOLADO-USER] Erro atualização após ${duration.toFixed(2)}ms:`, authError)

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
 * Health check da API
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Service': 'cliente-isolado-user',
      'X-Status': 'healthy',
      'X-Version': 'v1.0'
    }
  })
} 