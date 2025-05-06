'use client'

import { createReadOnlyClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginWithEmailPassword, checkPhone, logout } from '@/app/auth/actions'
import { useState, useEffect } from 'react'

// Este componente demonstra o padrão correto para autenticação no Next.js com Supabase
// 1. Usa `createReadOnlyClient` para verificar a sessão (somente leitura)
// 2. Usa Server Actions para operações de autenticação que modificam cookies

export default function LoginForm({ redirectPath = '/' }: { redirectPath?: string }) {
  const [phoneValue, setPhoneValue] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  
  // Verificar a sessão ao carregar o componente
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Usar fetch para chamar API que verifica a sessão
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          setSession(data.session)
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
      } finally {
        setIsSessionLoaded(true)
      }
    }
    
    checkSession()
  }, [])
  
  // Se estiver carregando, não mostrar nada ainda
  if (!isSessionLoaded) {
    return <div>Carregando...</div>
  }
  
  // Se já estiver logado, mostrar um componente diferente
  if (session) {
    return <LoggedInUser session={session} />
  }
  
  // Esta função é executada no cliente, mas chama um Server Action
  const handlePhoneCheck = async () => {
    if (!phoneValue || phoneValue.length < 9) {
      setPhoneError('Telefone inválido')
      return
    }
    
    setIsChecking(true)
    setPhoneError('')
    
    try {
      // Chama o Server Action que usa o cliente completo
      // O Server Action pode modificar cookies
      const result = await checkPhone(phoneValue)
      
      if (!result.success) {
        setPhoneError(result.error || 'Erro ao verificar telefone')
        return
      }
      
      if (!result.exists) {
        setPhoneError('Telefone não registrado. Faça seu cadastro primeiro.')
        return
      }
      
      // Se chegou aqui, o telefone existe e o usuário pode fazer login
      setPhoneError('')
    } catch (error) {
      setPhoneError('Erro ao verificar telefone')
      console.error(error)
    } finally {
      setIsChecking(false)
    }
  }
  
  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Login</h2>
        <p className="text-sm text-gray-500">
          Entre com seu telefone e senha para acessar sua conta
        </p>
      </div>
      
      {/* Formulário de login usando Server Action */}
      <form action={loginWithEmailPassword} className="space-y-4">
        {/* Campo oculto para redirecionar após o login */}
        <input type="hidden" name="redirect" value={redirectPath} />
        
        <div className="space-y-2">
          <Label htmlFor="email">Email ou Telefone</Label>
          <Input 
            id="email" 
            name="email" 
            type="text" 
            required 
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            onBlur={handlePhoneCheck}
          />
          {phoneError && (
            <p className="text-sm text-red-500">{phoneError}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        
        <Button type="submit" className="w-full" disabled={isChecking || !!phoneError}>
          {isChecking ? 'Verificando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}

// Componente para mostrar quando o usuário já está logado
function LoggedInUser({ session }: { session: any }) {
  return (
    <div className="space-y-4">
      <p>Você já está logado como {session.user?.email || 'usuário'}</p>
      <form action={logout}>
        <Button type="submit" variant="outline">Sair</Button>
      </form>
    </div>
  )
} 