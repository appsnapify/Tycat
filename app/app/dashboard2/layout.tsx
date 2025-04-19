"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { User } from '@supabase/supabase-js'
import { Loader2, LayoutDashboard, Users, CalendarDays, CreditCard, Settings, BarChart4, UserCheck } from 'lucide-react'
import Link from 'next/link'

interface SidebarItemProps {
  href: string
  icon: React.ReactNode
  text: string
  isActive: boolean
}

const SidebarItem = ({ href, icon, text, isActive }: SidebarItemProps) => {
  return (
    <Link href={href} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-primary text-primary-foreground' 
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}>
      {icon}
      <span className="font-medium">{text}</span>
    </Link>
  )
}

interface ProfileType {
  role: 'organizer' | 'team_leader' | 'promoter'
  baseUrl: string
  title: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileType | null>(null)

  useEffect(() => {
    determineUserProfile(user, pathname)
  }, [user, pathname])

  // Determina qual perfil de usuário está sendo usado
  const determineUserProfile = (user: User | null, path: string) => {
    if (!user) return

    if (path.includes('/organizador/')) {
      setProfile({
        role: 'organizer',
        baseUrl: '/app/organizador',
        title: 'Dashboard do Organizador'
      })
    } else if (path.includes('/chefe-equipe/')) {
      setProfile({
        role: 'team_leader',
        baseUrl: '/app/chefe-equipe',
        title: 'Dashboard do Chefe de Equipe'
      })
    } else if (path.includes('/promotor/')) {
      setProfile({
        role: 'promoter',
        baseUrl: '/app/promotor',
        title: 'Dashboard do Promotor'
      })
    } else {
      // Direcionar para dashboard correto baseado em alguma lógica de perfil
      // Temporariamente, redireciona para organizador
      router.push('/app/organizador/dashboard')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando...</span>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando perfil...</span>
      </div>
    )
  }

  const renderNavItems = () => {
    const baseUrl = profile.baseUrl

    // Items comuns
    const commonItems = [
      {
        href: `${baseUrl}/dashboard`,
        icon: <LayoutDashboard className="h-5 w-5" />,
        text: 'Dashboard',
      }
    ]

    // Items específicos por perfil
    const roleSpecificItems = {
      organizer: [
        {
          href: `${baseUrl}/equipes`,
          icon: <Users className="h-5 w-5" />,
          text: 'Equipes',
        },
        {
          href: `${baseUrl}/eventos`,
          icon: <CalendarDays className="h-5 w-5" />,
          text: 'Eventos',
        },
        {
          href: `${baseUrl}/comissoes`,
          icon: <CreditCard className="h-5 w-5" />,
          text: 'Comissões',
        },
        {
          href: `${baseUrl}/relatorios`,
          icon: <BarChart4 className="h-5 w-5" />,
          text: 'Relatórios',
        }
      ],
      team_leader: [
        {
          href: `${baseUrl}/minha-equipe`,
          icon: <Users className="h-5 w-5" />,
          text: 'Minha Equipe',
        },
        {
          href: `${baseUrl}/organizacoes`,
          icon: <UserCheck className="h-5 w-5" />,
          text: 'Organizações',
        },
        {
          href: `${baseUrl}/financeiro`,
          icon: <CreditCard className="h-5 w-5" />,
          text: 'Financeiro',
        },
        {
          href: `${baseUrl}/relatorios`,
          icon: <BarChart4 className="h-5 w-5" />,
          text: 'Relatórios',
        }
      ],
      promoter: [
        {
          href: `${baseUrl}/equipes`,
          icon: <Users className="h-5 w-5" />,
          text: 'Minhas Equipes',
        },
        {
          href: `${baseUrl}/eventos`,
          icon: <CalendarDays className="h-5 w-5" />,
          text: 'Eventos Ativos',
        },
        {
          href: `${baseUrl}/financeiro`,
          icon: <CreditCard className="h-5 w-5" />,
          text: 'Financeiro',
        }
      ]
    }

    // Configuraçoes (comum a todos)
    const configItems = [
      {
        href: `${baseUrl}/configuracoes`,
        icon: <Settings className="h-5 w-5" />,
        text: 'Configurações',
      }
    ]

    // Obter items específicos do perfil atual
    const currentRoleItems = roleSpecificItems[profile.role] || []

    // Concatenar todos os items
    const allItems = [...commonItems, ...currentRoleItems, ...configItems]

    // Renderizar os items
    return allItems.map((item) => (
      <SidebarItem
        key={item.href}
        href={item.href}
        icon={item.icon}
        text={item.text}
        isActive={pathname === item.href}
      />
    ))
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r shadow-sm hidden md:block p-4 overflow-y-auto">
        <div className="mb-8 px-4">
          <h2 className="text-xl font-bold">{profile.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.email}
          </p>
        </div>

        <nav className="space-y-1">
          {renderNavItems()}
        </nav>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
} 