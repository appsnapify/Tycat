"use client"

import '@/app/globals.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
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
import { LayoutDashboard, Building, Users } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const router = useRouter()
  
  // Importar o custom hook para verificar ações pendentes
  const { usePendingActions } = require('@/hooks/use-pending-actions');
  usePendingActions();
  
  console.log("DEBUG - AppLayoutContent iniciando:", { 
    userAutenticado: !!user, 
    isLoadingAuth
  });
  
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      console.log('AppLayoutContent: Auth carregado, sem utilizador. Redirecionando para /login.')
      router.push('/login')
    }
  }, [isLoadingAuth, user, router])

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  if (!user) {
    console.log("DEBUG - AppLayoutContent: Não há utilizador após carregamento do Auth (redirecionamento pendente).");
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  console.log("DEBUG - AppLayoutContent: Auth carregado, utilizador encontrado. Renderizando children");
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