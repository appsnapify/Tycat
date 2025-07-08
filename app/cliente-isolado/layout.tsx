import type { Metadata } from 'next'
import AuthProvider from '@/components/cliente-isolado/AuthProvider'

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
        {children}
      </div>
    </AuthProvider>
  )
} 