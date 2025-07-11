'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PhoneVerificationCliente } from './PhoneVerificationCliente'
import { LoginFormCliente } from './LoginFormCliente'
import { RegisterFormCliente } from './RegisterFormCliente'
import type { ClienteUser } from './types'

interface LoginClienteFlowProps {
  onComplete?: (user: ClienteUser) => void
  initialPhone?: string
}

export function LoginClienteFlow({ onComplete, initialPhone = '' }: LoginClienteFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'phone' | 'login' | 'register'>('phone')
  const [phone, setPhone] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  
  // Extrair parâmetros de redirecionamento para guest creation
  const redirectUrl = searchParams.get('redirect')
  const eventId = searchParams.get('eventId')
  const promoterId = searchParams.get('promoterId')
  const teamId = searchParams.get('teamId')
  const context = searchParams.get('context') // 'organizacao' para páginas /g/[id]

  const handlePhoneVerified = (verifiedPhone: string, exists: boolean, verifiedUserId?: string | null) => {
    setPhone(verifiedPhone)
    setUserId(verifiedUserId || null)
    
    if (exists) {
      setStep('login')
    } else {
      setStep('register')
    }
  }

  const handleLoginSuccess = async (user: ClienteUser) => {
    console.log('[LOGIN-CLIENTE-FLOW] Login bem-sucedido:', user)
    
    // Verificar se há parâmetros para criação de guest
    if (eventId && user.id) {
      console.log('[LOGIN-CLIENTE-FLOW] Criando guest após login bem-sucedido...')
      
      try {
        // Escolher API baseada no contexto
        const apiUrl = context === 'organizacao' 
          ? '/api/login-cliente/organizador/guests/create'
          : '/api/login-cliente/guests/create'
        
        const requestBody = context === 'organizacao'
          ? {
              event_id: eventId,
              client_user_id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              phone: user.phone || ''
            }
          : {
              event_id: eventId,
              client_user_id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              phone: user.phone || '',
              promoter_id: promoterId,
              team_id: teamId
            }
        
        console.log('[LOGIN-CLIENTE-FLOW] Usando API:', apiUrl, 'para contexto:', context || 'promo')
        
        // Criar guest usando API isolada apropriada
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
        
        const result = await response.json()
        
        if (result.success) {
          console.log('[LOGIN-CLIENTE-FLOW] Guest criado com sucesso, redirecionando...')
          // Redirecionar de volta para a página original com sucesso
          if (redirectUrl) {
            router.push(redirectUrl + '?success=true')
          } else {
            router.push('/cliente/dashboard')
          }
        } else {
          console.error('[LOGIN-CLIENTE-FLOW] Erro ao criar guest:', result.error)
          // Mesmo com erro, redirecionar para o destino
          router.push(redirectUrl || '/cliente/dashboard')
        }
      } catch (error) {
        console.error('[LOGIN-CLIENTE-FLOW] Erro na criação do guest:', error)
        // Mesmo com erro, redirecionar para o destino
        router.push(redirectUrl || '/cliente/dashboard')
      }
    } else {
      // ✅ SOLUÇÃO DEFINITIVA: Redirecionamento direto e simples
      if (onComplete) {
        onComplete(user)
      } else {
        console.log('[LOGIN-CLIENTE-FLOW] Redirecionando para dashboard (direto)...')
        // Pequeno delay apenas para feedback visual
        setTimeout(() => {
          router.push('/cliente/dashboard')
        }, 300)
      }
    }
  }

  const handleRegisterSuccess = async (user: ClienteUser) => {
    // Mesma lógica que o login
    await handleLoginSuccess(user)
  }

  const handleBack = () => {
    setStep('phone')
    setUserId(null)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {step === 'phone' && (
        <PhoneVerificationCliente
          onVerified={handlePhoneVerified}
          defaultPhone={initialPhone}
        />
      )}

      {step === 'login' && (
        <LoginFormCliente
          phone={phone}
          userId={userId}
          onSuccess={handleLoginSuccess}
          onBack={handleBack}
        />
      )}

      {step === 'register' && (
        <RegisterFormCliente
          phone={phone}
          onSuccess={handleRegisterSuccess}
          onBack={handleBack}
        />
      )}
    </div>
  )
} 