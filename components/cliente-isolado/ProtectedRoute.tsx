'use client'

import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useClienteIsolado()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/cliente-isolado/login')
    }
  }, [isAuthenticated, isLoading, router])

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">A carregar...</p>
        </div>
      </div>
    )
  }

  // ✅ Not authenticated
  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>A redirecionar para login...</p>
        </div>
      </div>
    )
  }

  // ✅ Authenticated - show content
  return <>{children}</>
} 