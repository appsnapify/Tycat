'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Redirecionamento automático para sistema isolado /login/cliente
 * Remove dependência de PhoneVerificationForm (client-auth-v3) que causa logs PHONE-CACHE-V2
 * Preserva todos os parâmetros de query (redirect, phone, etc.)
 */
export default function ClientAuthRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Preservar TODOS os parâmetros de query e redirecionar para sistema isolado
    const params = new URLSearchParams(searchParams.toString())
    const redirectUrl = `/login/cliente?${params.toString()}`
    
    console.log('🔄 [CLIENT-AUTH-REDIRECT] Redirecionando para sistema isolado:', redirectUrl)
    router.replace(redirectUrl)
  }, [router, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">A redirecionar para sistema seguro...</p>
      </div>
    </div>
  )
} 