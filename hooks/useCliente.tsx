'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

/**
 * HOOK CLIENTE - VERSÃO REAL COM APIS
 * Usando endpoints reais que já existiam
 */

// ✅ Tipos básicos
interface ClienteUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl?: string
}

interface ClienteAuthState {
  user: ClienteUser | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

interface ClienteAuthContextType extends ClienteAuthState {
  login: (phone: string, password: string) => Promise<boolean>
  register: (phone: string, firstName: string, lastName: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  checkPhone: (phone: string) => Promise<{ exists: boolean, userId?: string }>
}

const ClienteAuthContext = createContext<ClienteAuthContextType | null>(null)

export function ClienteAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClienteAuthState>({
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false
  })

  const checkPhone = async (phone: string): Promise<{ exists: boolean, userId?: string }> => {
    console.log('📞 [CLIENTE] Verificando telefone na BD:', phone)
    
    try {
      // ✅ USAR API REAL QUE JÁ EXISTIA
      const response = await fetch('/api/client-auth/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      })
      
      const result = await response.json()
      
      console.log('📞 [CLIENTE] Resultado verificação:', result)
      
      if (result.success) {
        return { 
          exists: result.exists,
          userId: result.userId 
        }
      }
      
      return { exists: false }
      
    } catch (error) {
      console.error('❌ [CLIENTE] Erro verificar telefone:', error)
      return { exists: false }
    }
  }

  const login = async (phone: string, password: string): Promise<boolean> => {
    console.log('🚀 [CLIENTE] Login real com BD:', { phone })
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // ✅ USAR API REAL QUE JÁ EXISTIA
      const response = await fetch('/api/client-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, password })
      })
      
      const result = await response.json()
      
      console.log('🚀 [CLIENTE] Resultado login:', result)
      
      if (result.success && result.user) {
        const user: ClienteUser = {
          id: result.user.id,
          firstName: result.user.firstName || result.user.first_name,
          lastName: result.user.lastName || result.user.last_name,
          email: result.user.email,
          phone: result.user.phone
        }
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Erro no login'
        }))
        return false
      }
      
    } catch (error) {
      console.error('❌ [CLIENTE] Erro login:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro de conexão'
      }))
      return false
    }
  }

  const register = async (phone: string, firstName: string, lastName: string, password: string): Promise<boolean> => {
    console.log('📝 [CLIENTE] Registo real:', { phone, firstName, lastName })
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // ✅ USAR API REAL QUE JÁ EXISTIA
      const response = await fetch('/api/client-auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          phone, 
          first_name: firstName, 
          last_name: lastName, 
          email: `${phone.replace(/\D/g, '')}@cliente.snap.com`,
          password 
        })
      })
      
      const result = await response.json()
      
      console.log('📝 [CLIENTE] Resultado registo:', result)
      
      if (result.success && result.user) {
        const user: ClienteUser = {
          id: result.user.id,
          firstName: result.user.firstName || result.user.first_name,
          lastName: result.user.lastName || result.user.last_name,
          email: result.user.email,
          phone: result.user.phone
        }
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Erro no registo'
        }))
        return false
      }
      
    } catch (error) {
      console.error('❌ [CLIENTE] Erro registo:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro de conexão'
      }))
      return false
    }
  }

  const logout = async (): Promise<void> => {
    console.log('🚪 [CLIENTE] Fazendo logout')
    
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
    
    // ✅ Redirect para login
    if (typeof window !== 'undefined') {
      window.location.href = '/cliente/login'
    }
  }

  const refreshUser = async (): Promise<void> => {
    console.log('🔄 [CLIENTE] Refresh user')
    // ✅ Implementação vazia por agora
  }

  const contextValue: ClienteAuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    checkPhone
  }

  return (
    <ClienteAuthContext.Provider value={contextValue}>
      {children}
    </ClienteAuthContext.Provider>
  )
}

// ✅ Hook personalizado
export function useCliente(): ClienteAuthContextType {
  const context = useContext(ClienteAuthContext)
  
  if (!context) {
    throw new Error('useCliente deve ser usado dentro de ClienteAuthProvider')
  }
  
  return context
}

// ✅ Hook para verificação rápida de auth
export function useIsClienteAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useCliente()
  return isAuthenticated && !isLoading
}

// ✅ Hook para dados do utilizador
export function useClienteUser(): ClienteUser | null {
  const { user, isAuthenticated } = useCliente()
  return isAuthenticated ? user : null
} 