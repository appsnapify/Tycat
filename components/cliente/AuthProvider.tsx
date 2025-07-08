'use client'

import { ClienteAuthProvider } from '@/hooks/useCliente'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClienteAuthProvider>
      {children}
    </ClienteAuthProvider>
  )
} 