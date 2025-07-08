// API dedicada para login - Sistema login/cliente isolado
import { NextRequest, NextResponse } from 'next/server'
import { getLoginClienteSupabase } from '@/lib/login-cliente/auth-client'
import { createAdminClient } from '@/lib/supabase/adminClient'
import type { AuthResponse, LoginRequest } from '@/components/login-cliente/types'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Parse do corpo da requisição
    const body: LoginRequest = await request.json()
    const { phone, userId, password } = body

    // Validação básica
    if (!password) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Palavra-passe é obrigatória'
      }, { status: 400 })
    }

    if (!phone && !userId) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Telefone ou ID do utilizador é obrigatório'
      }, { status: 400 })
    }

    // Cliente Supabase isolado
    const supabase = getLoginClienteSupabase()

    // Buscar utilizador por userId ou phone
    let query = supabase
      .from('client_users')
      .select('*')

    if (userId) {
      query = query.eq('id', userId)
    } else if (phone) {
      query = query.eq('phone', phone.trim())
    }

    const { data: user, error: queryError } = await query.maybeSingle()

    if (queryError) {
      console.error('[LOGIN-CLIENTE] Erro ao buscar utilizador:', queryError)
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Erro interno do servidor'
      }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Utilizador não encontrado'
      }, { status: 404 })
    }

    // Verificar palavra-passe - LÓGICA HÍBRIDA (IDÊNTICA ao sistema PROMO)
    console.log('[LOGIN-CLIENTE] Verificando password para utilizador:', user.id)
    
    // MÉTODO 1: Tentar Supabase Auth primeiro (SEMPRE, mesmo se password=NULL)
    let authSuccess = false
    let userEmail = user.email
    if (!userEmail) {
      userEmail = `client_${user.id}@temp.snap.com`
    }
    
    console.log('[LOGIN-CLIENTE] Tentando login via Supabase Auth com email:', userEmail)
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      })
      
      if (!authError && authData.user) {
        console.log('[LOGIN-CLIENTE] Login bem-sucedido via Supabase Auth')
        authSuccess = true
      } else {
        console.log('[LOGIN-CLIENTE] Falha no Auth:', authError?.message || 'Erro desconhecido')
      }
    } catch (authAttemptError) {
      console.log('[LOGIN-CLIENTE] Exceção no Auth:', authAttemptError)
    }
    
    // MÉTODO 2: Se Auth falhou, tentar password da tabela (utilizadores antigos)
    if (!authSuccess && user.password) {
      console.log('[LOGIN-CLIENTE] Tentando login via password da tabela (utilizador antigo)')
      
      // Verificar se é hash bcrypt ou texto puro
      if (user.password.startsWith('$2')) {
        // Password hashada com bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (isPasswordValid) {
          authSuccess = true
        }
      } else {
        // Password em texto puro (sistema antigo)
        if (user.password === password) {
          console.log('[LOGIN-CLIENTE] Password da tabela correcta (texto puro)')
          authSuccess = true
        }
      }
    }
    
    // VERIFICAÇÃO FINAL
    if (!authSuccess) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Palavra-passe incorreta'
      }, { status: 401 })
    }

    // ✅ GARANTIR METADADOS APÓS LOGIN BEM-SUCEDIDO
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (currentSession?.user && !currentSession.user.user_metadata?.client_user_id) {
        console.log('[LOGIN-CLIENTE] Metadados ausentes, atualizando...')
        
        // Usar adminClient para atualizar metadados
        const adminClient = createAdminClient()
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          currentSession.user.id,
          {
            user_metadata: {
              client_user_id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              phone: user.phone
            }
          }
        )
        
        if (updateError) {
          console.error('[LOGIN-CLIENTE] Erro ao atualizar metadados:', updateError)
        } else {
          console.log('[LOGIN-CLIENTE] Metadados atualizados com sucesso')
          
          // ✅ FORÇAR REFRESH DA SESSÃO para pegar metadados atualizados
          await supabase.auth.refreshSession()
          console.log('[LOGIN-CLIENTE] Sessão refreshada com metadados')
        }
      }
    } catch (metaError) {
      console.error('[LOGIN-CLIENTE] Erro ao verificar/atualizar metadados:', metaError)
    }

    // Remover dados sensíveis antes de retornar
    const { password: userPassword, ...userSafe } = user

    // Sucesso
    return NextResponse.json<AuthResponse>({
      success: true,
      user: userSafe
    })

  } catch (error) {
    console.error('[LOGIN-CLIENTE] Erro no login:', error)
    return NextResponse.json<AuthResponse>({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 