'use client'

import React from 'react'
import { StatCard } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  TicketCheck,
  Users,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

// Definição de tipos
interface DashboardContentProps {
  kpis: {
    totalEvents: number
    upcomingEvents: number
    teamsCount: number
    promotersCount: number
  }
  teams: Array<{
    id: string
    name: string
    eventCount: number
  }>
  userProfile: {
    first_name: string
    last_name: string
  } | null
  loadingKpis: boolean
  loadingTeams: boolean
  loadingProfile: boolean
  loadingError: boolean
  onRefresh: () => void
}

// Cores para o tema do dashboard
const dashboardColors = {
  card: {
    bg: "bg-white",
    border: "border-gray-200",
    hoverBorder: "hover:border-gray-300"
  },
  text: {
    primary: "text-gray-900",
    secondary: "text-gray-500",
    muted: "text-gray-400",
    accent: "text-lime-500"
  },
  badge: {
    red: "bg-red-100 text-red-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    yellow: "bg-amber-100 text-amber-800",
    gray: "bg-gray-100 text-gray-800",
    purple: "bg-purple-100 text-purple-800"
  },
  button: {
    primary: "bg-lime-500 hover:bg-lime-600 text-white",
    secondary: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700",
    accent: "bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
  }
}

export function DashboardContent({
  kpis,
  teams,
  userProfile,
  loadingKpis,
  loadingTeams,
  loadingProfile,
  loadingError,
  onRefresh
}: DashboardContentProps) {
  if (loadingError) {
    return (
      <div className={cn("p-6 rounded-lg border", dashboardColors.badge.red)}>
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold">Erro ao carregar dados</h3>
            <p className="text-sm">Ocorreu um erro ao carregar os dados do dashboard. Tente novamente mais tarde.</p>
          </div>
        </div>
        <Button 
          onClick={onRefresh} 
          className={cn("mt-4", dashboardColors.button.secondary)} 
          size="sm"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Mensagem de Boas-vindas */}
      <div className="mb-8">
        {loadingProfile ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 animate-pulse rounded-md w-64"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded-md w-96"></div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Olá, {userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Organizador'}! 👋
            </h1>
            <p className="text-gray-600 text-lg">
              Bem-vindo ao seu painel de controle. Aqui pode gerir os seus eventos e equipas.
            </p>
          </div>
        )}
      </div>

      {/* KPIs / Métricas principais - Cards Elegantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total de Eventos"
          value={loadingKpis ? "..." : kpis.totalEvents}
          icon={CalendarDays}
          loading={loadingKpis}
        />
        <StatCard
          title="Eventos Próximos"
          value={loadingKpis ? "..." : kpis.upcomingEvents} 
          icon={TicketCheck}
          loading={loadingKpis}
        />
        <StatCard
          title="Equipas"
          value={loadingKpis ? "..." : kpis.teamsCount}
          icon={Users}
          loading={loadingKpis}
        />
        <StatCard
          title="Promotores"
          value={loadingKpis ? "..." : kpis.promotersCount}
          icon={Users}
          loading={loadingKpis}
        />
      </div>

    </div>
  )
} 