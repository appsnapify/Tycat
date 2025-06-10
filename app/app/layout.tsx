"use client"

import '@/app/globals.css'
// import Link from 'next/link' // Comentado se não usado diretamente neste ficheiro
import { useRouter } from 'next/navigation' // Mantido para AppLayoutContent
import { Toaster } from 'sonner'
import { useEffect } from 'react' // Mantido para AppLayoutContent
// import { createClient } from '@/lib/supabase' // Comentado, não parece ser usado e pode causar confusão
import { SidebarProvider } from '@/contexts/sidebar-context'
import { OrganizationProvider } from '@/app/contexts/organization-context'
import { Loader2 } from 'lucide-react'
// import { useAuth } from '@/hooks/use-auth' // REMOVIDO - Será usado o de _providers
import { useAuth, ClientAuthProvider } from '@/app/app/_providers/auth-provider' // ADICIONADO ClientAuthProvider aqui
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs' // Comentado, não parece ser usado diretamente aqui
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
// import { ErrorBoundary } from 'react-error-boundary' // Comentado se não usado
// import { Suspense } from 'react' // Comentado se não usado
// import { Card, Button } from '@/components/ui/card' // Comentado se não usado
// import { Badge } from '@/components/ui/badge' // Comentado se não usado
// import { XCircle } from 'lucide-react' // Comentado se não usado
// import { ContentArea } from '@/components/content-area' // Comentado se não usado
// import { AppHeader } from '@/components/app-header' // Comentado se não usado
// import { MobileMenu } from '@/components/mobile-menu' // Comentado se não usado
// import { AppSidebar } from '@/components/app-sidebar' // Comentado se não usado
import { LayoutDashboard, Building, Users } from 'lucide-react' // Mantido para getNavLinks

const inter = Inter({ subsets: ['latin'] })

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientAuthProvider serverSession={null}>
      <SidebarProvider>
        <OrganizationProvider>
          <Toaster />
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">
              <AppLayoutContent>
                {children}
              </AppLayoutContent>
            </main>
          </div>
        </OrganizationProvider>
      </SidebarProvider>
    </ClientAuthProvider>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoadingUser, initialAuthCheckCompleted } = useAuth() // DESESTRUTURAR initialAuthCheckCompleted
  const router = useRouter()
  
  // Importar o custom hook para verificar ações pendentes
  // const { usePendingActions } = require('@/hooks/use-pending-actions'); // Comentado se a lógica de pending actions não for central aqui
  // usePendingActions();
  
  // Debug logs removidos para performance
  
  useEffect(() => {
    // Só redirecionar se a verificação inicial estiver completa E não houver user E não estiver carregando
    if (initialAuthCheckCompleted && !isLoadingUser && !user?.id) {
      console.log('AppLayoutContent: Verificação de Auth completa, sem utilizador. Redirecionando para /login.')
      router.push('/login')
    }
  }, [initialAuthCheckCompleted, isLoadingUser, user?.id]) // CORREÇÃO: Lógica e dependências agora consistentes

  // Mostrar loader principal enquanto a verificação inicial de autenticação não estiver completa
  if (!initialAuthCheckCompleted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  // Se a verificação inicial estiver completa, mas ainda estiver carregando o user
  if (isLoadingUser) { 
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  // Se não há user, mostrar loader (redirect deve ocorrer)
  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  return children
}

const getNavLinks = (role: string) => {
  switch (role) {
    case 'organizador':
      return [
        { href: '/app/organizador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/app/organizador/organizations', label: 'Organizações', icon: Building },
        { href: '/app/organizador/configuracao', label: 'Configurações', icon: Users },
        // ... outros links organizador
      ];
    case 'chefe-equipe':
      return [
        { href: '/app/chefe-equipe/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/app/chefe-equipe/equipe', label: 'A Minha Equipa', icon: Users },
        // ... outros links chefe
      ];
    case 'promotor':
      return [
        { href: '/app/promotor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        // { href: '/app/promotor/equipes', label: 'Equipas', icon: Users }, // <-- LINHA REMOVIDA
        // ... outros links promotor
      ];
    default:
      return [];
  }
};

// Dentro do componente que renderiza os links (ex: SidebarNav):
// const navLinks = getNavLinks(userRole);
// ... (código que mapeia navLinks para elementos de link) ...

// --- Instrução Específica para o Modelo de Edição --- 
// Localize a definição dos links de navegação para a role 'promotor'.
// Remova ou comente a linha/objeto que representa o link para '/app/promotor/equipes' com o label 'Equipas'.
// Certifique-se de que apenas o link para promotores é afetado.

// ... código existente ... 