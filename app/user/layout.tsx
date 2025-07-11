'use client'

import React from 'react'
import { UserAuthProvider } from '@/hooks/useUser'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserAuthProvider>
      <div className="min-h-screen bg-gray-900">
      {children}
      </div>
    </UserAuthProvider>
  )
} 