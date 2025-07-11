import type { Metadata } from 'next'
import AuthProvider from '@/components/cliente-isolado/AuthProvider'
import { Toaster } from '@/components/ui/toaster'
import Header from '@/components/cliente-isolado/Dashboard/Header'

export const metadata: Metadata = {
  title: 'SNAP - Cliente',
  description: 'Sistema cliente isolado SNAP',
}

export default function ClienteIsoladoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900">
        <Header />
        {children}
        <Toaster />
      </div>
    </AuthProvider>
  )
} 