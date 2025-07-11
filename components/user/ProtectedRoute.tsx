'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/user/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return null
  }

  if (!user) {
    return null
  }

  return <>{children}</>
} 