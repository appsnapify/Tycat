import { createClienteIsoladoClient, createClienteIsoladoAdminClient, wrapWithLogging } from './supabase'
import type { User } from '@supabase/supabase-js'

/**
 * SISTEMA DE AUTENTICAÇÃO ISOLADO PARA CLIENTE
 * 
 * Características:
 * - Zero dependências de outros sistemas auth
 * - Session management otimizado
 * - Validation rápida
 * - Error handling robusto
 */

// ✅ Tipos isolados para o sistema cliente
export interface ClienteUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl?: string
}

export interface AuthSession {
  user: ClienteUser
  expiresAt: string
  accessToken: string
}

export interface LoginCredentials {
  phone: string
  firstName?: string
  lastName?: string
}

/**
 * Verifica se telefone já existe no sistema
 */
export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  return wrapWithLogging('checkPhoneExists', async () => {
    const supabase = createClienteIsoladoAdminClient()
    
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', phone)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao verificar telefone: ${error.message}`)
    }

    return !!data
  })
}

/**
 * Cria novo utilizador cliente
 */
export const createClientUser = async (credentials: LoginCredentials): Promise<ClienteUser> => {
  return wrapWithLogging('createClientUser', async () => {
    const supabase = createClienteIsoladoAdminClient()
    
    // ✅ Gerar email temporário único
    const tempEmail = `${credentials.phone.replace(/\D/g, '')}@temp.cliente.snap`
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 1. Criar utilizador no Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      user_metadata: {
        phone: credentials.phone,
        firstName: credentials.firstName || '',
        lastName: credentials.lastName || '',
        role: 'cliente',
        created_via: 'cliente-isolado'
      },
      email_confirm: true
    })

    if (authError || !authUser.user) {
      throw new Error(`Erro ao criar utilizador auth: ${authError?.message}`)
    }

    // 2. Criar entrada na tabela client_users
    const { data: clientUser, error: clientError } = await supabase
      .from('client_users')
      .insert({
        id: authUser.user.id,
        first_name: credentials.firstName || '',
        last_name: credentials.lastName || '',
        email: tempEmail,
        phone: credentials.phone,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (clientError) {
      // Limpar utilizador auth se falhar criação na tabela
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Erro ao criar utilizador cliente: ${clientError.message}`)
    }

    return {
      id: clientUser.id,
      firstName: clientUser.first_name,
      lastName: clientUser.last_name,
      email: clientUser.email,
      phone: clientUser.phone
    }
  })
}

/**
 * Faz login com telefone (existing user)
 */
export const loginWithPhone = async (phone: string): Promise<AuthSession> => {
  return wrapWithLogging('loginWithPhone', async () => {
    const supabase = createClienteIsoladoClient()
    const adminSupabase = createClienteIsoladoAdminClient()
    
    // 1. Buscar utilizador pelo telefone
    const { data: clientUser, error: userError } = await adminSupabase
      .from('client_users')
      .select('*')
      .eq('phone', phone)
      .single()

    if (userError || !clientUser) {
      throw new Error('Utilizador não encontrado')
    }

    // 2. Fazer login via admin (bypass password)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: clientUser.email,
      options: {
        redirectTo: undefined // ✅ Não queremos redirect
      }
    })

    if (authError || !authData.user) {
      throw new Error(`Erro no login: ${authError?.message}`)
    }

    // 3. Atualizar metadados da sessão
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      clientUser.id,
      {
        user_metadata: {
          client_user_id: clientUser.id,
          phone: clientUser.phone,
          firstName: clientUser.first_name,
          lastName: clientUser.last_name,
          role: 'cliente',
          last_login: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.warn('Aviso: Erro ao atualizar metadados:', updateError.message)
    }

    // 4. Criar sessão local
    const session: AuthSession = {
      user: {
        id: clientUser.id,
        firstName: clientUser.first_name,
        lastName: clientUser.last_name,
        email: clientUser.email,
        phone: clientUser.phone
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      accessToken: authData.properties?.access_token || ''
    }

    return session
  })
}

/**
 * Verifica sessão ativa via token personalizado
 */
export const checkActiveSessionByToken = async (sessionToken: string, userId: string): Promise<ClienteUser | null> => {
  return wrapWithLogging('checkActiveSessionByToken', async () => {
    console.log('🔍 [AUTH] Verificando token personalizado:', { userId, tokenLength: sessionToken.length })
    const adminSupabase = createClienteIsoladoAdminClient()
    
    // 1. Buscar utilizador e verificar token
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser.user) {
      console.log('❌ [AUTH] Utilizador não encontrado:', authError?.message)
      return null
    }

    // 2. Verificar se token coincide
    const storedToken = authUser.user.user_metadata?.session_token
    if (!storedToken || storedToken !== sessionToken) {
      console.log('❌ [AUTH] Token não coincide:', { stored: !!storedToken, match: storedToken === sessionToken })
      return null
    }

    // 3. Buscar dados do cliente
    const { data: clientUser, error: userError } = await adminSupabase
      .from('client_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !clientUser) {
      console.log('❌ [AUTH] Dados do cliente não encontrados:', userError?.message)
      return null
    }

    console.log('✅ [AUTH] Token válido para:', clientUser.first_name)
    return {
      id: clientUser.id,
      firstName: clientUser.first_name,
      lastName: clientUser.last_name,
      email: clientUser.email,
      phone: clientUser.phone
    }
  })
}

/**
 * Verifica sessão ativa (método legacy)
 */
export const checkActiveSession = async (): Promise<ClienteUser | null> => {
  return wrapWithLogging('checkActiveSession', async () => {
    const supabase = createClienteIsoladoClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return null
    }

    // ✅ Buscar dados atualizados do utilizador
    const clientUserId = session.user.user_metadata?.client_user_id
    if (!clientUserId) {
      return null
    }

    const adminSupabase = createClienteIsoladoAdminClient()
    const { data: clientUser, error: userError } = await adminSupabase
      .from('client_users')
      .select('*')
      .eq('id', clientUserId)
      .single()

    if (userError || !clientUser) {
      return null
    }

    return {
      id: clientUser.id,
      firstName: clientUser.first_name,
      lastName: clientUser.last_name,
      email: clientUser.email,
      phone: clientUser.phone
    }
  })
}

/**
 * Faz logout limpo
 */
export const logoutUser = async (): Promise<void> => {
  return wrapWithLogging('logoutUser', async () => {
    const supabase = createClienteIsoladoClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.warn('Aviso no logout:', error.message)
    }

    // ✅ Limpar storage local
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cliente-isolado-auth')
      localStorage.removeItem('cliente-isolado-cache')
    }
  })
}

/**
 * Utilitários de validação
 */
export const validatePhone = (phone: string): boolean => {
  // Aceitar formatos: +351234567890, 351234567890, 234567890
  const phoneRegex = /^(\+?351)?[0-9]{9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export const normalizePhone = (phone: string): string => {
  // Normalizar para formato +351XXXXXXXXX
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 9) {
    return `+351${cleaned}`
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('351')) {
    return `+${cleaned}`
  }
  
  if (cleaned.length === 13 && cleaned.startsWith('351')) {
    return `+${cleaned}`
  }
  
  return phone // Retornar original se não conseguir normalizar
}

/**
 * Error handlers específicos para auth
 */
export class ClienteAuthError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ClienteAuthError'
  }
}

export const handleAuthError = (error: any): ClienteAuthError => {
  if (error instanceof ClienteAuthError) {
    return error
  }

  // Mapear erros comuns
  if (error.message?.includes('não encontrado')) {
    return new ClienteAuthError('Utilizador não encontrado', 'USER_NOT_FOUND', 404)
  }

  if (error.message?.includes('telefone')) {
    return new ClienteAuthError('Telefone inválido', 'INVALID_PHONE', 400)
  }

  return new ClienteAuthError(
    error.message || 'Erro de autenticação',
    'AUTH_ERROR',
    500
  )
} 