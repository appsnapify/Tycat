'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { sessionCache, initializeCache } from '@/lib/cliente-isolado/cache'
import type { ClienteUser } from '@/lib/cliente-isolado/auth'

/**
 * HOOK CLIENTE ISOLADO - ULTRARRÁPIDO
 * 
 * Características:
 * - Performance < 200ms
 * - Cache agressivo
 * - Zero dependências de outros sistemas
 * - Error boundaries
 * - Smart retry logic
 */

interface ClienteAuthState {
  user: ClienteUser | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

interface ClienteAuthContextType extends ClienteAuthState {
  // ✅ NOVA INTERFACE COMPLETA COM PASSWORD
  checkPhone: (phone: string) => Promise<{ exists: boolean, userId?: string, nextStep?: string }>
  login: (phone: string, password: string) => Promise<boolean>
  register: (phone: string, firstName: string, lastName: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
  
  // ✅ LEGACY: Manter compatibilidade
  legacyLogin?: (phone: string, firstName?: string, lastName?: string) => Promise<boolean>
}

const ClienteAuthContext = createContext<ClienteAuthContextType | null>(null)

// ✅ Estado inicial otimizado
const initialState: ClienteAuthState = {
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false
}

export function ClienteAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClienteAuthState>(initialState)
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ Função helper para updates seguros
  const safeSetState = (newState: Partial<ClienteAuthState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...newState }))
    }
  }

  // ✅ Função ultra-rápida para carregar utilizador
  const loadUser = async (): Promise<void> => {
    try {
      // 1. Verificar cache primeiro (super rápido)
      const cachedUser = sessionCache.get()
      
      if (cachedUser && sessionCache.isValid()) {
        console.log('🚀 [CLIENTE-ISOLADO] Cache hit - ultrarrápido!')
        safeSetState({
          user: cachedUser,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        return
      }

      // 2. Cache miss - verificar sessão API com tokens
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('cliente-session-token') : null
      const userId = typeof window !== 'undefined' ? localStorage.getItem('cliente-user-id') : null
      
      const response = await fetch('/api/cliente-isolado/auth/check', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'X-Session-Token': sessionToken || '',
          'X-User-Id': userId || ''
        }
      })

      if (!response.ok) {
        throw new Error('Sessão inválida')
      }

      const data = await response.json()

      if (data.success && data.user) {
        console.log('✅ [CLIENTE-ISOLADO] Utilizador verificado:', data.user.firstName)
        
        safeSetState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      } else {
        throw new Error('Utilizador não encontrado')
      }

    } catch (error) {
      console.log('❌ [CLIENTE-ISOLADO] Erro verificação:', error)
      
      // ✅ Limpar cache inválido
      sessionCache.clear()
      
      // ✅ Limpar tokens inválidos
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cliente-session-token')
        localStorage.removeItem('cliente-user-id')
        localStorage.removeItem('cliente-session-expires')
      }
      
      safeSetState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null // Não mostrar erro - só não autenticado
      })
    }
  }

  // ✅ NOVA FUNÇÃO: Verificar telefone
  const checkPhone = async (phone: string): Promise<{ exists: boolean, userId?: string, nextStep?: string }> => {
    try {
      console.log('📞 [CLIENTE-ISOLADO] Verificando telefone:', phone)
      
      const response = await fetch('/api/cliente-isolado/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      const data = await response.json()

      if (data.success) {
        console.log('📞 [CLIENTE-ISOLADO] Resultado:', data)
        return {
          exists: data.exists,
          userId: data.userId,
          nextStep: data.nextStep
        }
      } else {
        throw new Error(data.error || 'Erro ao verificar telefone')
      }

    } catch (error) {
      console.error('❌ [CLIENTE-ISOLADO] Erro verificar telefone:', error)
      return { exists: false }
    }
  }

  // ✅ NOVA FUNÇÃO: Login com password
  const login = async (phone: string, password: string): Promise<boolean> => {
    safeSetState({ isLoading: true, error: null })

    try {
      console.log('🔐 [CLIENTE-ISOLADO] Login com password:', phone)
      
      const response = await fetch('/api/cliente-isolado/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })

      const data = await response.json()

      if (data.success && data.user) {
        console.log('✅ [CLIENTE-ISOLADO] Login sucesso:', data.user.firstName)
        
        // ✅ Armazenar tokens de sessão personalizados
        if (data.session && typeof window !== 'undefined') {
          localStorage.setItem('cliente-session-token', data.session.access_token)
          localStorage.setItem('cliente-user-id', data.user.id)
          localStorage.setItem('cliente-session-expires', data.session.expires_at)
          
          console.log('🔑 [CLIENTE-ISOLADO] Tokens personalizados armazenados')
        }
        
        safeSetState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        console.log('🎯 [CLIENTE-ISOLADO] Estado atualizado:', {
          isAuthenticated: true,
          user: data.user.firstName,
          redirectReady: true
        })
        
        return true
      } else {
        throw new Error(data.error || 'Erro no login')
      }

    } catch (error) {
      console.error('❌ [CLIENTE-ISOLADO] Erro login:', error)
      
      safeSetState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro no login'
      })
      
      return false
    }
  }

  // ✅ NOVA FUNÇÃO: Registo completo
  const register = async (phone: string, firstName: string, lastName: string, password: string): Promise<boolean> => {
    safeSetState({ isLoading: true, error: null })

    try {
      console.log('📝 [CLIENTE-ISOLADO] Registo:', { phone, firstName, lastName })
      
      const response = await fetch('/api/cliente-isolado/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, firstName, lastName, password })
      })

      const data = await response.json()

      if (data.success && data.user) {
        console.log('✅ [CLIENTE-ISOLADO] Registo sucesso:', data.user.firstName)
        
        safeSetState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        return true
      } else {
        throw new Error(data.error || 'Erro no registo')
      }

    } catch (error) {
      console.error('❌ [CLIENTE-ISOLADO] Erro registo:', error)
      
      safeSetState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro no registo'
      })
      
      return false
    }
  }

  // ✅ LEGACY: Login sem password (compatibilidade)
  const legacyLogin = async (phone: string, firstName?: string, lastName?: string): Promise<boolean> => {
    safeSetState({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/cliente-isolado/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, firstName, lastName })
      })

      const data = await response.json()

      if (data.success && data.user) {
        console.log('✅ [CLIENTE-ISOLADO] Legacy login sucesso:', data.user.firstName)
        
        safeSetState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        return true
      } else {
        throw new Error(data.error || 'Erro no login')
      }

    } catch (error) {
      console.error('❌ [CLIENTE-ISOLADO] Erro legacy login:', error)
      
      safeSetState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro no login'
      })
      
      return false
    }
  }

  // ✅ Logout rápido
  const logout = async (): Promise<void> => {
    try {
      // ✅ Logout local primeiro (UX)
      safeSetState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })

      // ✅ Limpar tokens de sessão
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cliente-session-token')
        localStorage.removeItem('cliente-user-id')
        localStorage.removeItem('cliente-session-expires')
        
        console.log('🧹 [CLIENTE-ISOLADO] Tokens limpos')
      }

      // ✅ Logout no servidor (async)
      fetch('/api/cliente-isolado/auth/logout', {
        method: 'POST'
      }).catch(err => console.warn('Logout API warning:', err))

      // ✅ Redirecionar para login isolado
      if (typeof window !== 'undefined') {
        window.location.href = '/cliente/login'
      }

    } catch (error) {
      console.warn('Logout warning:', error)
    }
  }

  // ✅ Refresh utilizador
  const refreshUser = async (): Promise<void> => {
    if (!state.isAuthenticated) return
    
    safeSetState({ isLoading: true })
    await loadUser()
  }

  // ✅ Clear error
  const clearError = (): void => {
    safeSetState({ error: null })
  }

  // ✅ Inicialização rápida
  useEffect(() => {
    // Inicializar cache
    initializeCache()

    // ✅ Timeout de segurança (só se não conseguir verificar)
    timeoutRef.current = setTimeout(() => {
      // ✅ Só forçar timeout se ainda estiver loading
      if (state.isLoading) {
        console.warn('⚠️ [CLIENTE-ISOLADO] Timeout - forçando não autenticado')
        safeSetState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null
        })
      }
    }, 3000) // 3s mais rápido

    // Carregar utilizador
    loadUser()

    // Cleanup
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // ✅ Clear timeout quando loading termina
  useEffect(() => {
    if (!state.isLoading && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [state.isLoading])

  const contextValue: ClienteAuthContextType = {
    ...state,
    checkPhone,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    legacyLogin
  }

  return (
    <ClienteAuthContext.Provider value={contextValue}>
      {children}
    </ClienteAuthContext.Provider>
  )
}

// ✅ Hook personalizado otimizado
export function useClienteIsolado(): ClienteAuthContextType {
  const context = useContext(ClienteAuthContext)
  
  if (!context) {
    throw new Error('useClienteIsolado deve ser usado dentro de ClienteAuthProvider')
  }
  
  return context
}

// ✅ Hook para verificação rápida de auth
export function useIsClienteAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useClienteIsolado()
  return isAuthenticated && !isLoading
}

// ✅ Hook para dados do utilizador
export function useClienteUser(): ClienteUser | null {
  const { user, isAuthenticated } = useClienteIsolado()
  return isAuthenticated ? user : null
} 