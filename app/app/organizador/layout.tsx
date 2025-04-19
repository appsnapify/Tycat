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
import { Sidebar } from '@/components/ui/sidebar'
import {
  BadgePercent,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  QrCode,
  TicketCheck
} from 'lucide-react'

interface NavItemProps {
  href: string
  icon: ReactNode
  children: ReactNode
  disabled?: boolean
}

function NavItem({ href, icon, children, disabled }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  if (disabled) {
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed",
        "hover:bg-gray-100 hover:text-gray-900"
      )}>
        {icon}
        {children}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500",
        "hover:bg-gray-100 hover:text-gray-900",
        isActive && "bg-gray-100 text-gray-900"
      )}
    >
      {icon}
      {children}
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

  // Links da barra lateral
  const sidebarLinks = [
    { href: '/app/organizador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/app/organizador/eventos', label: 'Eventos', icon: CalendarDays },
    { href: '/app/organizador/organizacoes', label: 'Organizações', icon: BadgePercent },
    { href: '/app/organizador/eventos/checkin', label: 'Check-in', icon: QrCode },
  ]

  // Função para fazer logout
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
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Nenhuma organização encontrada</h1>
        <p className="text-gray-500 mb-8">Você precisa criar uma organização para começar.</p>
        <Button asChild>
          <Link href="/app/organizador/organizacoes/nova">
            Criar Organização
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Botão do menu móvel */}
      <button 
        className="md:hidden fixed top-4 left-4 z-30 bg-white rounded-full p-2 shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-20 w-64 border-r bg-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <OrganizationSelector />
        </div>
        <nav className="space-y-1 p-4 flex flex-col h-[calc(100%-3.5rem)]">
          <div className="flex-1">
            <NavItem 
              href="/app/organizador/dashboard" 
              icon={<span>📊</span>}
              disabled={!hasOrganizations}
            >
              Dashboard
            </NavItem>
            <NavItem 
              href="/app/organizador/eventos" 
              icon={<span>📅</span>}
              disabled={!hasOrganizations}
            >
              Eventos
            </NavItem>
            <NavItem 
              href="/app/organizador/bilheteria" 
              icon={<span>🎟️</span>}
              disabled={!hasOrganizations}
            >
              Bilheteria
            </NavItem>
            <NavItem 
              href="/app/organizador/eventos/checkin" 
              icon={<span>🔍</span>}
              disabled={!hasOrganizations}
            >
              Check-in
            </NavItem>
            <NavItem 
              href="/app/organizador/equipes" 
              icon={<span>👥</span>}
              disabled={!hasOrganizations}
            >
              Equipes
            </NavItem>
            <NavItem 
              href="/app/organizador/relatorios" 
              icon={<span>📈</span>}
              disabled={!hasOrganizations}
            >
              Relatórios
            </NavItem>
            <NavItem 
              href="/app/organizador/organizacao" 
              icon={<span>🏢</span>}
              disabled={!hasOrganizations}
            >
              Organização
            </NavItem>
            <NavItem 
              href="/app/organizador/configuracoes" 
              icon={<span>⚙️</span>}
              disabled={!hasOrganizations}
            >
              Configurações
            </NavItem>
          </div>
          
          {/* Botão de Logout */}
          <Button 
            variant="ghost" 
            className="w-full justify-start mt-auto text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </nav>
      </aside>

      {/* Overlay para fechar o sidebar em mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto p-8 md:p-8 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  )
} 