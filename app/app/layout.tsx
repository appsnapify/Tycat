"use client"

import '@/app/globals.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { OrganizationProvider } from '@/app/contexts/organization-context'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ErrorBoundary } from 'react-error-boundary'
import { Suspense } from 'react'
import { Card, Button } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { XCircle } from 'lucide-react'
import { ContentArea } from '@/components/content-area'
import { AppHeader } from '@/components/app-header'
import { MobileMenu } from '@/components/mobile-menu'
import { AppSidebar } from '@/components/app-sidebar'

const inter = Inter({ subsets: ['latin'] })

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <OrganizationProvider>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <AppLayoutContent>
              {children}
            </AppLayoutContent>
          </main>
        </div>
        <Toaster />
      </OrganizationProvider>
    </SidebarProvider>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sessionChecks, setSessionChecks] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const MAX_SESSION_CHECKS = 3
  
  console.log("DEBUG - AppLayoutContent iniciando:", { 
    userAutenticado: !!user, 
    isLoading,
    checkingAuth,
    sessionChecks
  });
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Se ainda está carregando, esperar
        if (isLoading) {
          console.log("DEBUG - AppLayoutContent: isLoading é true, aguardando");
          return
        }
        
        // Se já temos um usuário, permitir acesso
        if (user) {
          console.log('Layout: Usuário autenticado detectado', user.user_metadata)
          setCheckingAuth(false)
          return
        }
        
        // Se não há usuário e já tentamos verificar múltiplas vezes
        if (sessionChecks >= MAX_SESSION_CHECKS) {
          console.log('Layout: Limite de verificações excedido, redirecionando para login')
          // Em vez de usar window.location.href que pode causar problemas de navegação,
          // usar o router do Next.js
          router.push('/login')
          return
        }
        
        // Se não há usuário, verificar a sessão manualmente
        console.log(`Layout: Verificando sessão manualmente (tentativa ${sessionChecks + 1})`)
        const supabase = createClientComponentClient()
        const { data } = await supabase.auth.getSession()
        
        if (data.session) {
          console.log('Layout: Sessão encontrada manualmente')
          // Temos uma sessão, mas o hook não detectou - aguardar mais
          setSessionChecks(prev => prev + 1)
          setTimeout(() => setCheckingAuth(true), 500) // Verificar novamente em 500ms
        } else {
          console.log('Layout: Nenhuma sessão encontrada, redirecionando para login')
          router.push('/login')
        }
      } catch (error) {
        console.error('Layout: Erro ao verificar sessão manualmente:', error)
        setError(error instanceof Error ? error : new Error('Erro desconhecido'))
        // Em caso de erro na verificação, redirecionar para login após um pequeno atraso
        setTimeout(() => {
          router.push('/login')
        }, 1000)
      }
    }
    
    if (checkingAuth) {
      checkAuth()
    }
  }, [user, isLoading, checkingAuth, sessionChecks, router])

  // Se ocorreu um erro, exibir mensagem
  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Erro ao verificar sessão</h2>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        <button 
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Voltar para o login
        </button>
      </div>
    )
  }

  if (isLoading || (checkingAuth && sessionChecks < MAX_SESSION_CHECKS)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  if (!user) {
    console.log("DEBUG - AppLayoutContent: Não há usuário após verificações");
    return null
  }
  
  console.log("DEBUG - AppLayoutContent: Renderizando children");
  return children
} 