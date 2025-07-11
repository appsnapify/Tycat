import { createUserClient, createUserAdminClient, wrapWithLogging } from './supabase'
import { maskUserId } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

/**
 * SISTEMA DE AUTENTICAÇÃO ISOLADO PARA USER
 * 
 * ARQUITECTURA SIMPLIFICADA:
 * - Login via telemóvel + password REAL (Supabase Auth)
 * - Backend usa admin.generateLink() para bypass
 * - Tokens de sessão personalizados 
 * - Compatibilidade total com clientes criados via /promo
 */

// ✅ Tipos isolados para o sistema user
export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl?: string
}

export interface AuthSession {
  user: UserProfile
  expiresAt: string
  accessToken: string
}

export interface LoginCredentials {
  phone: string
  firstName?: string
  lastName?: string
  password: string
}

// ✅ NOVO: Resposta detalhada da verificação de telemóvel
export interface PhoneCheckResult {
  status: 'NOVO' | 'EXISTE_USER' | 'EXISTE_CLIENTE' | 'BLOQUEADO'
  message: string
  userInfo?: {
    firstName: string
    lastName: string
  }
}

/**
 * Verifica status do telemóvel no sistema USER
 * Retorna informação detalhada sobre o que fazer
 */
export const checkPhoneStatus = async (phone: string): Promise<PhoneCheckResult> => {
  return wrapWithLogging('checkPhoneStatus', async () => {
    const supabase = createUserAdminClient()
    
    // 1. Verificar se existe utilizador com este telemóvel (consulta única)
    const { data: user, error: userError } = await supabase
      .from('client_users')
      .select('id, user_system, first_name, last_name')
      .eq('phone', phone)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      throw new Error(`Erro ao verificar telemóvel: ${userError.message}`)
    }

    if (!user) {
      // Telemóvel não existe = pode registar no sistema /user
      return {
        status: 'NOVO',
        message: 'Telemóvel disponível para registo'
      }
    }

    // 2. Se já é do sistema /user
    if (user.user_system === true) {
      return {
        status: 'EXISTE_USER',
        message: 'Telemóvel encontrado. Digite a sua password.',
        userInfo: {
          firstName: user.first_name,
          lastName: user.last_name
        }
      }
    }

    // 3. Se é cliente existente, verificar papéis (consulta única por tabela)
    const [orgMemberResult, teamMemberResult, promoterResult] = await Promise.all([
      supabase.from('organization_members').select('id').eq('user_id', user.id).single(),
      supabase.from('team_members').select('id').eq('user_id', user.id).single(),
      supabase.from('event_promoters').select('id').eq('promoter_id', user.id).single()
    ])

    // Se tem qualquer outro papel, bloquear
    if (orgMemberResult.data || teamMemberResult.data || promoterResult.data) {
      return {
        status: 'BLOQUEADO',
        message: 'Este telemóvel pertence a um organizador, membro de equipa ou promotor. Use o sistema adequado.'
      }
    }

    // Cliente existente SEM outros papéis = pode migrar
    return {
      status: 'EXISTE_CLIENTE',
      message: 'Telemóvel encontrado. Digite a sua password para migrar para o novo sistema.',
      userInfo: {
        firstName: user.first_name,
        lastName: user.last_name
      }
    }
  })
}

/**
 * @deprecated Use checkPhoneStatus instead
 */
export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  const result = await checkPhoneStatus(phone)
  return result.status === 'EXISTE_USER'
}

/**
 * Cria novo utilizador user OU migra cliente existente
 */
export const createUserProfile = async (credentials: LoginCredentials): Promise<UserProfile> => {
  return wrapWithLogging('createUserProfile', async () => {
    const supabase = createUserAdminClient()
    
    // 1. Verificar se já existe cliente com este telemóvel
    const { data: existingUser, error: existingError } = await supabase
      .from('client_users')
      .select('*')
      .eq('phone', credentials.phone)
      .single()

    // Se existe e não é do sistema user, fazer migração
    if (existingUser && !existingUser.user_system) {
      console.log('🔄 [USER-AUTH] Migrando cliente existente para sistema /user')
      
      // Migrar: atualizar flag user_system e metadados auth
      const { error: updateError } = await supabase
        .from('client_users')
        .update({ 
          user_system: true,
          first_name: credentials.firstName || existingUser.first_name,
          last_name: credentials.lastName || existingUser.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)

      if (updateError) {
        throw new Error(`Erro ao migrar cliente: ${updateError.message}`)
      }

      // Atualizar metadados auth (sem fake password)
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          phone: credentials.phone,
          firstName: credentials.firstName || existingUser.first_name,
          lastName: credentials.lastName || existingUser.last_name,
          role: 'user',
          system: 'user',
          migrated_from: 'cliente-system'
        }
      })

      return {
        id: existingUser.id,
        firstName: credentials.firstName || existingUser.first_name,
        lastName: credentials.lastName || existingUser.last_name,
        email: existingUser.email,
        phone: existingUser.phone
      }
    }

    // 2. Criar novo utilizador com password real
    const tempEmail = `user_${credentials.phone.replace(/\D/g, '')}@temp.user.snap`

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: tempEmail,
      password: credentials.password, // ✅ Usar password real
      user_metadata: {
        phone: credentials.phone,
        firstName: credentials.firstName || '',
        lastName: credentials.lastName || '',
        role: 'user',
        system: 'user',
        created_via: 'user-system'
      },
      email_confirm: true
    })

    if (authError || !authUser.user) {
      throw new Error(`Erro ao criar utilizador auth: ${authError?.message}`)
    }

    const { data: clientUser, error: clientError } = await supabase
      .from('client_users')
      .insert({
        id: authUser.user.id,
        first_name: credentials.firstName || '',
        last_name: credentials.lastName || '',
        email: tempEmail,
        phone: credentials.phone,
        user_system: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (clientError) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Erro ao criar utilizador na tabela: ${clientError.message}`)
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
 * Verifica password REAL: Usa sempre Supabase Auth
 */
const verifyRealPassword = async (password: string, clientUser: any): Promise<boolean> => {
  console.log('🔍 [REAL-AUTH] Verificando password real...')
  try {
    const testClient = createUserClient()
    const { error: passwordError } = await testClient.auth.signInWithPassword({
      email: clientUser.email,
      password: password
    })
    
    if (!passwordError) {
      console.log('✅ [REAL-AUTH] Password real verificada!')
      return true
    }
    
    return false
  } catch (error) {
    console.log('❌ [REAL-AUTH] Erro verificação password real:', error)
    return false
  }
}

/**
 * Login com telemóvel + password REAL (Supabase Auth)
 */
export const loginWithCredentials = async (phone: string, password: string): Promise<AuthSession> => {
  return wrapWithLogging('loginWithCredentials', async () => {
    const adminSupabase = createUserAdminClient()
    
    // 1. Buscar utilizador pelo telemóvel (sistema /user OU cliente válido)
    const { data: clientUser, error: userError } = await adminSupabase
      .from('client_users')
      .select('*')
      .eq('phone', phone)
      .single()

    if (userError || !clientUser) {
      throw new Error('Telemóvel ou password incorretos')
    }

    // 2. Se não é do sistema /user, verificar se é cliente válido (sem outros papéis)
    if (!clientUser.user_system) {
      // Verificar se tem papéis de organizador/equipa/promotor
      const [orgMemberResult, teamMemberResult, promoterResult] = await Promise.all([
        adminSupabase.from('organization_members').select('id').eq('user_id', clientUser.id).single(),
        adminSupabase.from('team_members').select('id').eq('user_id', clientUser.id).single(),
        adminSupabase.from('event_promoters').select('id').eq('promoter_id', clientUser.id).single()
      ])

      if (orgMemberResult.data || teamMemberResult.data || promoterResult.data) {
        throw new Error('Este telemóvel pertence a um organizador, membro de equipa ou promotor. Use o sistema adequado.')
      }
    }

    // 3. Buscar dados auth para verificação
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(clientUser.id)
    
    if (authError || !authUser.user) {
      throw new Error('Telemóvel ou password incorretos')
    }

    // 4. ✅ VERIFICAÇÃO REAL: só password real
    const isPasswordValid = await verifyRealPassword(password, clientUser)
    if (!isPasswordValid) {
      throw new Error('Telemóvel ou password incorretos')
    }

    // 5. ✅ MIGRAÇÃO AUTOMÁTICA: Atualizar user_system se necessário
    if (!clientUser.user_system) {
      console.log('🔄 [USER-AUTH] Migrando cliente para sistema /user...')
      await adminSupabase
        .from('client_users')
        .update({ 
          user_system: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientUser.id)
        
      clientUser.user_system = true // Update local data
    }

    // 6. ✅ BYPASS ADMIN: Gerar magic link (mesma técnica do cliente-isolado)
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: clientUser.email,
      options: {
        redirectTo: undefined // ✅ Não queremos redirect
      }
    })

    if (linkError || !linkData.user) {
      throw new Error(`Erro no login: ${linkError?.message}`)
    }

    // 7. Criar tokens de sessão personalizados
    const sessionToken = `user_${clientUser.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 8. Atualizar metadados da sessão
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      clientUser.id,
      {
        user_metadata: {
          user_id: clientUser.id,
          phone: clientUser.phone,
          firstName: clientUser.first_name,
          lastName: clientUser.last_name,
          role: 'user',
          system: 'user',
          session_token: sessionToken,
          last_login: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.warn('Aviso: Erro ao atualizar metadados:', updateError.message)
    }

    // 9. Criar sessão local
    const session: AuthSession = {
      user: {
        id: clientUser.id,
        firstName: clientUser.first_name,
        lastName: clientUser.last_name,
        email: clientUser.email,
        phone: clientUser.phone
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      accessToken: sessionToken // ✅ Token personalizado, não token Supabase
    }

    return session
  })
}

/**
 * Verifica sessão ativa via token personalizado
 */
export const checkActiveSessionByToken = async (sessionToken: string, userId: string): Promise<UserProfile | null> => {
  return wrapWithLogging('checkActiveSessionByToken', async () => {
    console.log('🔍 [USER-AUTH] Verificando token personalizado:', { userId: maskUserId(userId), tokenLength: sessionToken.length })
    const adminSupabase = createUserAdminClient()
    
    // 1. Buscar utilizador e verificar se é do sistema user
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser.user) {
      console.log('❌ [USER-AUTH] Utilizador não encontrado:', authError?.message)
      return null
    }

    // 2. Verificar se é utilizador do sistema user
    if (authUser.user.user_metadata?.system !== 'user') {
      console.log('❌ [USER-AUTH] Utilizador não é do sistema user')
      return null
    }

    // 3. Verificar token personalizado
    const storedToken = authUser.user.user_metadata?.session_token
    if (!storedToken || storedToken !== sessionToken) {
      console.log('❌ [USER-AUTH] Token não coincide')
      return null
    }

    // 4. Buscar dados na tabela
    const { data: clientUser, error: clientError } = await adminSupabase
      .from('client_users')
      .select('*')
      .eq('id', userId)
      .eq('user_system', true)
      .single()

    if (clientError || !clientUser) {
      console.log('❌ [USER-AUTH] Dados não encontrados na tabela:', clientError?.message)
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
 * Logout completo
 */
export const logoutUser = async (): Promise<void> => {
  return wrapWithLogging('logoutUser', async () => {
    // ✅ Não precisamos fazer logout do Supabase Auth real
    // Usamos tokens personalizados que são invalidados pela remoção do localStorage
    console.log('✅ [USER-AUTH] Logout processado (tokens personalizados)')
  })
}

/**
 * Validação de telemóvel
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false
  
  // Limpar espaços para validação
  const cleanPhone = phone.replace(/\s/g, '')
  
  // Aceitar formatos: +351XXXXXXXXX, 351XXXXXXXXX, 9XXXXXXXX
  // Regex melhorada para garantir compatibilidade
  const phoneRegex = /^(\+351|351)?[0-9]{9}$/
  
  const isValid = phoneRegex.test(cleanPhone)
  
  // Log para debug (remover em produção)
  // Log seguro removendo dados sensíveis
  console.log(`🔍 [VALIDATE] Telemóvel: mascarado → Válido: ${isValid}`)
  
  return isValid
}

/**
 * Normalização de telemóvel
 */
export const normalizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return ''
  
  // Remover espaços e caracteres especiais (manter apenas dígitos e +)
  let normalized = phone.replace(/\s/g, '').replace(/[^\d+]/g, '')
  
  // Se começar com +351, manter
  if (normalized.startsWith('+351')) {
    return normalized
  }
  
  // Se começar com 351 (sem +), adicionar +
  if (normalized.startsWith('351')) {
    return '+' + normalized
  }
  
  // Se for 9 dígitos (número local), assumir Portugal
  if (normalized.length === 9 && /^[0-9]{9}$/.test(normalized)) {
    return '+351' + normalized
  }
  
  // Log para debug
  // Log seguro removendo dados sensíveis  
  console.log(`🔧 [NORMALIZE] Telefone normalizado com sucesso`)
  
  return normalized
}

/**
 * ✅ HASH SIMPLES PARA PASSWORD FAKE (apenas para UX)
 * Não é criptografia real, só para salvar algo no user_metadata
 */
const hashUserPassword = async (password: string): Promise<string> => {
  // Hash simples com sal
  const salt = Date.now().toString()
  return btoa(`${password}:${salt}`)
}

/**
 * ✅ VERIFICAR PASSWORD FAKE CONTRA HASH
 */
const verifyUserPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const decoded = atob(hash)
    const [storedPassword] = decoded.split(':')
    return storedPassword === password
  } catch {
    return false
  }
}

/**
 * Classe de erro personalizada
 */
export class UserAuthError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'UserAuthError'
  }
}

/**
 * Handler de erros de autenticação
 */
export const handleAuthError = (error: any): UserAuthError => {
  if (error instanceof UserAuthError) {
    return error
  }
  
  if (error?.message?.includes('Telemóvel ou password incorretos')) {
    return new UserAuthError('Telemóvel ou password incorretos', 'INVALID_CREDENTIALS', 401)
  }
  
  if (error?.message?.includes('User already registered')) {
    return new UserAuthError('Este telemóvel já está registado', 'USER_EXISTS', 409)
  }
  
  if (error?.message?.includes('Password should be at least')) {
    return new UserAuthError('Password deve ter pelo menos 6 caracteres', 'WEAK_PASSWORD', 400)
  }
  
  return new UserAuthError(error?.message || 'Erro interno', 'UNKNOWN', 500)
} 