"use client"

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/app/app/_providers/auth-provider'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Settings,
  LogOut,
  Building2,
  CreditCard,
} from 'lucide-react'
import { TeamSwitcher } from './team-switcher'

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/app/organizador/dashboard',
    color: 'text-sky-500',
  },
  {
    label: 'Eventos',
    icon: CalendarDays,
    href: '/app/organizador/eventos',
    color: 'text-violet-500',
  },
  {
    label: 'Organizações',
    icon: Building2,
    href: '/app/organizador/organizacoes',
    color: 'text-pink-700',
  },
  {
    label: 'Utilizadores',
    icon: Users,
    href: '/app/organizador/utilizadores',
    color: 'text-orange-700',
  },
  {
    label: 'Definições',
    icon: Settings,
    href: '/app/organizador/definicoes',
    color: 'text-gray-500',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1">
        <div className="space-y-1">
          {routes.map((route) => (
            <Button
              key={route.href}
              onClick={() => router.push(route.href)}
              className={cn(
                'w-full justify-start',
                pathname === route.href
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'hover:bg-white/10'
              )}
              variant="ghost"
            >
              <route.icon className={cn('h-5 w-5 mr-3', route.color)} />
              {route.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <Button
          onClick={handleSignOut}
          className="w-full justify-start hover:bg-white/10"
          variant="ghost"
        >
          <LogOut className="h-5 w-5 mr-3 text-red-500" />
          Terminar Sessão
        </Button>
      </div>
    </div>
  )
} 