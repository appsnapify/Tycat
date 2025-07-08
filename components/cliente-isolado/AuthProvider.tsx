'use client'

import { ClienteAuthProvider } from '@/hooks/useClienteIsolado'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClienteAuthProvider>
      {children}
    </ClienteAuthProvider>
  )
} 