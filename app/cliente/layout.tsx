import type { Metadata } from 'next'
import AuthProvider from '@/components/cliente-isolado/AuthProvider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'SNAP - Cliente',
  description: 'Sistema cliente isolado - Performance otimizada',
}

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        {children}
        <Toaster />
      </div>
    </AuthProvider>
  )
} 