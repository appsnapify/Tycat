"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'
import { toast } from 'sonner'
import { LogOut, Menu, X } from 'lucide-react'

import {
  BarChart3,
  Building,
  Users,
  Wallet,
  CalendarDays,
  LayoutDashboard,
  ShoppingBag,
} from 'lucide-react'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
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

export default function ChefeEquipeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Links da barra lateral
  const sidebarLinks = [
    { href: '/app/chefe-equipe/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/app/chefe-equipe/equipe', label: 'Equipe', icon: Users },
    { href: '/app/chefe-equipe/organizacoes', label: 'Organizações', icon: Building },
    { href: '/app/chefe-equipe/eventos', label: 'Eventos', icon: CalendarDays },
    { href: '/app/chefe-equipe/vendas', label: 'Vendas', icon: ShoppingBag },
    { href: '/app/chefe-equipe/financeiro', label: 'Financeiro', icon: BarChart3 },
    { href: '/app/chefe-equipe/wallet', label: 'Wallet', icon: Wallet },
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
          <h2 className="text-lg font-bold">Área do Chefe</h2>
        </div>
        <nav className="space-y-1 p-4 flex flex-col h-[calc(100%-3.5rem)]">
          <div className="flex-1">
            {sidebarLinks.map((link) => (
              <NavItem 
                key={link.href}
                href={link.href} 
                icon={<link.icon className="h-5 w-5" />}
              >
                {link.label}
              </NavItem>
            ))}
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