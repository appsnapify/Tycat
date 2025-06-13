'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  CalendarPlus,
  TicketCheck,
  Users,
  Percent,
  UserPlus,
  TrendingUp,
  ArrowRight,
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
  loadingKpis: boolean
  loadingTeams: boolean
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
  loadingKpis,
  loadingTeams,
  loadingError,
  onRefresh
}: DashboardContentProps) {
  const router = useRouter()
  
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
    <div className="space-y-6">
      {/* KPIs / Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Eventos Completos"
          value={loadingKpis ? "..." : kpis.totalEvents}
          icon={<CalendarDays size={18} />}
          color="lime"
          loading={loadingKpis}
        />
        <StatCard
          title="Eventos Próximos"
          value={loadingKpis ? "..." : kpis.upcomingEvents} 
          icon={<TicketCheck size={18} />}
          color="fuchsia"
          loading={loadingKpis}
        />
        <StatCard
          title="Equipes"
          value={loadingKpis ? "..." : kpis.teamsCount}
          icon={<Users size={18} />}
          color="fuchsia"
          loading={loadingKpis}
        />
        <StatCard
          title="Promotores"
          value={loadingKpis ? "..." : kpis.promotersCount}
          icon={<Users size={18} />}
          color="lime"
          loading={loadingKpis}
        />
      </div>
      
      {/* Ações rápidas */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <Card className="border rounded-xl p-6">
          <div className="space-y-2 mb-5">
            <h3 className="text-xl font-bold">Ações Rápidas</h3>
            <p className="text-gray-500">Acesse rapidamente as principais funções</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="flex items-center gap-3 py-4 px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push('/app/organizador/eventos/novo')}
              >
                <span className="flex-shrink-0">
                  <CalendarPlus className="h-6 w-6 text-lime-600" />
                </span>
                <span className="font-medium">Criar Evento</span>
              </div>
              <div 
                className="flex items-center gap-3 py-4 px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push('/app/organizador/equipes/nova')}
              >
                <span className="flex-shrink-0">
                  <UserPlus className="h-6 w-6 text-fuchsia-600" />
                </span>
                <span className="font-medium">Nova Equipe</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="flex items-center gap-3 py-4 px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push('/app/organizador/check-in')}
              >
                <span className="flex-shrink-0">
                  <TicketCheck className="h-6 w-6 text-lime-600" />
                </span>
                <span className="font-medium">Gestão Check-in</span>
              </div>
              <div 
                className="flex items-center gap-3 py-4 px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push('/app/organizador/relatorios')}
              >
                <span className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-fuchsia-600" />
                </span>
                <span className="font-medium">Ver Relatórios</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
} 