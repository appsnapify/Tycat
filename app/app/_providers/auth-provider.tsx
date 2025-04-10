'use client'

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// Função que verifica se um erro está relacionado à autenticação
function isAuthError(error: any): boolean {
  if (!error) return false
  
  // Lista de frases comuns em erros de autenticação
  const authErrorPhrases = [
    'jwt expired',
    'invalid token',
    'invalid signature',
    'invalid claim',
    'invalid auth',
    'token expired',
    'invalid jwt',
    'authorization failed',
    'not authenticated',
    'invalid refresh token',
    '401',
    'invalid session'
  ]
  
  const errorString = JSON.stringify(error).toLowerCase()
  return authErrorPhrases.some(phrase => errorString.includes(phrase))
}

export default function AuthErrorProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [hasAuthError, setHasAuthError] = useState(false)
  
  useEffect(() => {
    // Verificar se já tem flag de erro de autenticação
    const storedAuthError = localStorage.getItem('authError')
    
    if (storedAuthError === 'true') {
      // Limpar o sinalizador
      localStorage.removeItem('authError')
      
      // Redirecionar para login
      router.push('/login')
    }
    
    // Listener para erros não tratados (uncaught)
    const handleUnhandledError = (event: ErrorEvent) => {
      try {
        const error = event.error || event
        console.error('Erro não tratado detectado:', error)
        
        if (isAuthError(error)) {
          console.warn('Erro de autenticação detectado, reiniciando sessão')
          
          // Definir flag para redirecionar após reload
          localStorage.setItem('authError', 'true')
          
          // Limpar sessão
          const supabase = createClient()
          supabase.auth.signOut().then(() => {
            console.log('Sessão encerrada após erro de autenticação')
            
            // Redirecionar para login
            router.push('/login')
          })
        }
      } catch (handlerError) {
        console.error('Erro ao processar erro não tratado:', handlerError)
      }
    }
    
    // Monitorar erros de requisição fetch
    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch(...args)
        
        // Se for erro 401, é provável problema de autenticação
        if (response.status === 401) {
          console.warn('Erro 401 detectado em fetch, provável erro de autenticação')
          
          // Verificar se a requisição é para a API Supabase
          const url = args[0]?.toString() || ''
          if (url.includes('supabase')) {
            // Definir flag para redirecionar após reload
            localStorage.setItem('authError', 'true')
            
            // Limpar sessão
            const supabase = createClient()
            await supabase.auth.signOut()
            console.log('Sessão encerrada após erro 401')
            
            // Redirecionar para login
            router.push('/login')
          }
        }
        
        return response
      } catch (error) {
        if (isAuthError(error)) {
          console.warn('Erro de autenticação detectado em fetch, reiniciando sessão')
          
          // Definir flag para redirecionar após reload
          localStorage.setItem('authError', 'true')
          
          // Limpar sessão
          const supabase = createClient()
          await supabase.auth.signOut()
          console.log('Sessão encerrada após erro de fetch')
          
          // Redirecionar para login
          router.push('/login')
        }
        
        throw error
      }
    }
    
    // Adicionar os listeners
    window.addEventListener('error', handleUnhandledError)
    window.addEventListener('unhandledrejection', (event) => handleUnhandledError(event.reason))
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleUnhandledError)
      window.removeEventListener('unhandledrejection', (event) => handleUnhandledError(event.reason))
      window.fetch = originalFetch
    }
  }, [router])
  
  return <>{children}</>
} 