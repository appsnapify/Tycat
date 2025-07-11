'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthResponse, PhoneCheckResponse, UserAuthState } from '@/lib/user/types'
import { userSessionCache } from '@/lib/user/cache'

// 🎯 HOOK AUTENTICAÇÃO INDEPENDENTE SISTEMA USER
// Zero dependências dos sistemas antigos + Integração Supabase completa + Tokens personalizados

interface UserAuthContextType extends UserAuthState {
  login: (phone: string, password: string) => Promise<boolean>
  register: (phone: string, firstName: string, lastName: string, password: string) => Promise<boolean>
  checkPhone: (phone: string) => Promise<PhoneCheckResponse>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined)

// ✅ STORAGE INDEPENDENTE
const STORAGE_PREFIX = 'user-system-'
const TOKEN_KEY = `${STORAGE_PREFIX}token`
const USER_KEY = `${STORAGE_PREFIX}user`
const EXPIRES_KEY = `${STORAGE_PREFIX}expires`

// ✅ Provider do Sistema User
export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!user

  // ✅ Verificar sessão existente na inicialização (cache + localStorage)
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        // 1. Tentar cache primeiro (ultrarrápido)
        const cachedUser = userSessionCache.getUser()
        if (cachedUser) {
          setUser(cachedUser)
          setIsLoading(false)
          return
        }

        // 2. Tentar localStorage como fallback
        const token = localStorage.getItem(TOKEN_KEY)
        const userData = localStorage.getItem(USER_KEY)
        const expires = localStorage.getItem(EXPIRES_KEY)

        if (!token || !userData || !expires) {
          setIsLoading(false)
          return
        }

        // Verificar expiração
        const expiresDate = new Date(expires)
        if (expiresDate <= new Date()) {
          setIsLoading(false)
          return
        }

        // Restaurar dados
        const user = JSON.parse(userData)
        setUser(user)
        setIsLoading(false)

      } catch (error) {
        console.error('[USER] Erro ao verificar sessão:', error)
        setIsLoading(false)
      }
    }

    checkExistingSession()
  }, [])

  // ✅ Limpar storage e cache
  const clearStorage = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    userSessionCache.clearUser()
  }

  // ✅ Salvar sessão
  const saveSession = (user: User, session: any) => {
    const expires = session.expires_at ? new Date(session.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000)

    localStorage.setItem(TOKEN_KEY, session.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(EXPIRES_KEY, expires.toISOString())
    
    // Salvar no cache também
    userSessionCache.setUser(user)
  }

  // ✅ Verificar telemóvel
  const checkPhone = async (phone: string): Promise<PhoneCheckResponse> => {
    try {
      const response = await fetch('/api/user/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      const data = await response.json()
      
      if (data.success) {
        return {
          success: true,
          status: data.status,
          message: data.message,
          exists: data.exists,
          userInfo: data.userInfo
        }
      } else {
        return { 
          success: false,
          exists: false, 
          message: data.error || 'Erro de conexão'
        }
      }
    } catch (error) {
      console.error('❌ [USER-AUTH] Erro verificar telemóvel:', error)
      return { 
        success: false,
        exists: false, 
        message: 'Erro de conexão' 
      }
    }
  }

  // ✅ Login
  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      const response = await fetch('/api/user/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })

      const data = await response.json()

      if (data.success && data.user && data.session) {
        setUser(data.user)
        saveSession(data.user, data.session)
        return true
      } else {
        setError(data.error || 'Erro no login')
        return false
      }
    } catch (error) {
      console.error('❌ [USER-AUTH] Erro no login:', error)
      setError('Erro de conexão')
      return false
    }
  }

  // ✅ Registo
  const register = async (phone: string, firstName: string, lastName: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      const response = await fetch('/api/user/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, firstName, lastName, password })
      })

      const data = await response.json()

      if (data.success && data.user && data.session) {
        setUser(data.user)
        saveSession(data.user, data.session)
        return true
      } else {
        setError(data.error || 'Erro no registo')
        return false
      }
    } catch (error) {
      console.error('❌ [USER-AUTH] Erro no registo:', error)
      setError('Erro de conexão')
      return false
    }
  }

  // ✅ Logout
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/user/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('[USER] Erro no logout:', error)
    } finally {
      // Limpar dados mesmo se API falhar
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(EXPIRES_KEY)
      setUser(null)
    }
  }

  // ✅ Refresh user (verificar se sessão ainda é válida)
  const refreshUser = async (): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) return

      // Se chegou aqui mas não tem utilizador, tentar recuperar do cache
      const cachedUser = userSessionCache.getUser()
      if (cachedUser && !user) {
        setUser(cachedUser)
      }
    } catch (error) {
      console.error('❌ [USER-AUTH] Erro no refresh:', error)
    }
  }

  // ✅ Limpar erro
  const clearError = (): void => {
    setError(null)
  }

  const value: UserAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    checkPhone,
    logout,
    refreshUser,
    clearError
  }

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  )
}

// ✅ Hook para usar o contexto
export function useUser(): UserAuthContextType {
  const context = useContext(UserAuthContext)
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de UserAuthProvider')
  }
  return context
} 