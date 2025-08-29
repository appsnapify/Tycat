'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { DashboardTeams } from '@/components/dashboard/DashboardTeams'
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
      <DashboardKPIs kpis={kpis} isLoading={loadingKpis} />
      
      {/* Equipas */}
      <DashboardTeams teams={teams} isLoading={loadingTeams} organizationCode={null} />
      
      {/* Ações rápidas */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <Card className="border rounded-xl p-4 md:p-6">
          <div className="space-y-2 mb-4 md:mb-5">
            <h3 className="text-lg md:text-xl font-bold">Acções Rápidas</h3>
            <p className="text-sm md:text-base text-gray-500">Aceda rapidamente às principais funções</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                className="flex items-center gap-3 py-3 md:py-4 px-3 md:px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/app/organizador/evento/criar')}
              >
                <span className="flex-shrink-0">
                  <CalendarPlus className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </span>
                <span className="text-sm md:text-base font-medium">Criar Evento</span>
              </div>
              <div 
                className="flex items-center gap-3 py-3 md:py-4 px-3 md:px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/app/organizador/equipes')}
              >
                <span className="flex-shrink-0">
                  <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </span>
                <span className="text-sm md:text-base font-medium">Gerir Equipas</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                className="flex items-center gap-3 py-3 md:py-4 px-3 md:px-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/app/organizador/check-in')}
              >
                <span className="flex-shrink-0">
                  <TicketCheck className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </span>
                <span className="text-sm md:text-base font-medium">Gestão de Check-in</span>
              </div>
              <div 
                className="flex items-center gap-3 py-3 md:py-4 px-3 md:px-4 rounded-xl border border-gray-100 opacity-50 cursor-not-allowed"
              >
                <span className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                </span>
                <span className="text-sm md:text-base font-medium text-gray-400">Ver Relatórios</span>
                <span className="text-xs text-gray-400 ml-auto">(Em breve)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
} 