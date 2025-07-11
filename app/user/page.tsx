'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UserPage() {
  const router = useRouter()

  useEffect(() => {
    // Limpar storage user silenciosamente
    if (typeof window !== 'undefined') {
      const userKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('user-system-') || 
        key.startsWith('user-cache-') ||
        key.startsWith('user-auth')
      )
      
      userKeys.forEach(key => {
        localStorage.removeItem(key)
      })
    }

    // Redirecionar imediatamente para login
    router.replace('/user/login')
  }, [router])

  // Não renderizar nada enquanto redireciona
  return null
} 