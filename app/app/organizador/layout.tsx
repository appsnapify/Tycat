"use client"

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OrganizationSelector } from '@/components/organization-selector'
import { useOrganization } from '@/app/contexts/organization-context'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, X } from 'lucide-react'
import { logout } from '@/lib/auth'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button'
import {
  BadgePercent,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  QrCode,
  TicketCheck,
  Users,
  Settings,
  FileText,
  Building,
} from 'lucide-react'

// Estilos Atualizados
const colors = {
  brand: {
    lime: 'text-lime-500',
    limeHover: 'hover:text-lime-600',
    limeBg: 'bg-lime-500',
    limeBgHover: 'hover:bg-lime-600',
    limeBorder: 'border-lime-500',
    fuchsia: 'text-fuchsia-500',
    fuchsiaBg: 'bg-fuchsia-500',
    fuchsiaBgHover: 'hover:bg-fuchsia-600'
  },
  sidebar: {
    bg: 'bg-gray-900',
    text: 'text-gray-300',
    hover: 'hover:bg-gray-800 hover:text-lime-400',
    active: 'bg-gray-800 text-lime-400 border-l-2 border-lime-400',
    border: 'border-gray-800'
  },
  main: {
    bg: 'bg-gray-50',
    card: 'bg-white'
  }
}

interface NavItemProps {
  href: string
  icon: ReactNode
  children: ReactNode
  disabled?: boolean
}

function NavItem({ href, icon, children, disabled }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  if (disabled) {
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-gray-500 cursor-not-allowed mx-2",
      )}>
        {icon}
        <span>{children}</span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-gray-400 rounded-md transition-colors duration-200 mx-2 my-1 text-sm font-medium",
        colors.sidebar.hover,
        isActive && colors.sidebar.active
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

export default function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { hasOrganizations, isLoading } = useOrganization()
  const pathname = usePathname()
  const isCreatingOrg = pathname === '/app/organizador/organizacoes/nova'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Links da barra lateral - Mesmos links, apenas ícones atualizados
  const sidebarLinks = [
    { href: '/app/organizador/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/app/organizador/eventos', label: 'Eventos', icon: <CalendarDays size={18} /> },
    { href: '/app/organizador/bilheteria', label: 'Bilheteria', icon: <TicketCheck size={18} /> },
    { href: '/app/organizador/eventos/checkin', label: 'Check-in', icon: <QrCode size={18} /> },
    { href: '/app/organizador/equipes', label: 'Equipes', icon: <Users size={18} /> },
    { href: '/app/organizador/relatorios', label: 'Relatórios', icon: <FileText size={18} /> },
    { href: '/app/organizador/organizacao', label: 'Organização', icon: <Building size={18} /> },
    { href: '/app/organizador/configuracoes', label: 'Configurações', icon: <Settings size={18} /> },
  ]

  // Função para fazer logout - Mantém a mesma lógica
  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logout realizado com sucesso')
      router.push('/login')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
  }

  // Se estiver carregando, não mostra nada
  if (isLoading) {
    return null
  }

  // Se não tiver organizações e não estiver na página de criar, redireciona
  if (!hasOrganizations && !isCreatingOrg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Nenhuma organização encontrada</h1>
        <p className="text-gray-500 mb-8">Você precisa criar uma organização para começar.</p>
        <Button asChild className={cn(colors.brand.limeBg, colors.brand.limeBgHover, "text-white")}>
          <Link href="/app/organizador/organizacoes/nova">
            Criar Organização
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Botão do menu móvel - Redesenhado com cores da marca */}
      <button 
        className="md:hidden fixed top-4 left-4 z-30 bg-lime-500 text-white rounded-full p-2 shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - Redesenhada com novo esquema de cores */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-20 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
          colors.sidebar.bg, "border-r", colors.sidebar.border,
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-gray-800 px-6">
          <div className="text-xl font-bold text-lime-400">SNAPIFY</div>
        </div>
        <div className="px-4 py-4">
          <OrganizationSelector />
        </div>
        <nav className="space-y-1 px-2 py-4 flex flex-col h-[calc(100%-9rem)]">
          <div className="flex-1 space-y-1">
            {sidebarLinks.map(link => (
              <NavItem 
                key={link.href}
                href={link.href} 
                icon={link.icon}
                disabled={!hasOrganizations}
              >
                {link.label}
              </NavItem>
            ))}
          </div>
          
          {/* Botão de Logout - Redesenhado */}
          <Button 
            variant="ghost" 
            className="w-full justify-start mt-auto text-gray-400 hover:bg-gray-800 hover:text-red-400"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </nav>
      </aside>

      {/* Overlay - Mantido igual */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal - Redesenhado com novo esquema de cores */}
      <main className={cn("flex-1 overflow-auto pt-16 md:pt-0", colors.main.bg)}>
        {/* Header com breadcrumbs e ações */}
        <div className="bg-white border-b p-4 md:py-4 md:px-8 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold">{getCurrentPageTitle(pathname)}</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Espaço para ações de página, notificações, etc */}
          </div>
        </div>
        
        {/* Conteúdo da página */}
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

// Função auxiliar para pegar o título da página atual
function getCurrentPageTitle(pathname: string): string {
  if (pathname.includes('/dashboard')) return 'Dashboard'
  if (pathname.includes('/eventos')) {
    if (pathname.includes('/checkin')) return 'Check-in'
    return 'Gerenciar Eventos'
  }
  if (pathname.includes('/bilheteria')) return 'Bilheteria'
  if (pathname.includes('/equipes')) return 'Equipes'
  if (pathname.includes('/relatorios')) return 'Relatórios'
  if (pathname.includes('/organizacao')) return 'Organização'
  if (pathname.includes('/configuracoes')) return 'Configurações'
  return 'Dashboard'
} 