'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
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
  AlertCircle,
  Plus,
  Search
} from 'lucide-react'

// Definição de tipos
interface DashboardContentProps {
  kpis: {
    totalEvents: number
    upcomingEvents: number
    teamsCount: number
    promotersCount: number
  }
  events: Array<{
    id: string
    name: string
    date: string
    location: string
    status: 'upcoming' | 'past' | 'draft' | 'canceled'
  }>
  teams: Array<{
    id: string
    name: string
    eventCount: number
  }>
  loadingKpis: boolean
  loadingEvents: boolean
  loadingTeams: boolean
  loadingError: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
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
  events,
  teams,
  loadingKpis,
  loadingEvents,
  loadingTeams,
  loadingError,
  searchTerm,
  setSearchTerm,
  onRefresh
}: DashboardContentProps) {
  const router = useRouter()
  
  const upcomingEvents = events.filter(e => e.status === 'upcoming')
  
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
      
      {/* Ações rápidas e próximos eventos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
        
        <Card className={cn("border shadow-sm col-span-2", dashboardColors.card.border, dashboardColors.card.hoverBorder)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Próximos Eventos</CardTitle>
            <CardDescription>Eventos que ocorrerão em breve</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="space-y-2">
                <div className="h-12 bg-gray-100 rounded-md animate-pulse"></div>
                <div className="h-12 bg-gray-100 rounded-md animate-pulse"></div>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <ul className="space-y-2">
                {upcomingEvents
                  .slice(0, 3)
                  .map(event => (
                    <li key={event.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full bg-lime-500")}></div>
                        <span>{event.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{new Date(event.date).toLocaleDateString()}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/app/organizador/eventos/${event.id}`)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className={cn("text-center py-4", dashboardColors.text.muted)}>
                Nenhum evento próximo encontrado.
              </p>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(dashboardColors.text.accent)}
              onClick={() => router.push('/app/organizador/eventos')}
            >
              Ver todos os eventos
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Lista de eventos */}
      <Card className={cn("border shadow-sm", dashboardColors.card.border, dashboardColors.card.hoverBorder)}>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Seus Eventos</CardTitle>
              <CardDescription>Gerencie todos os seus eventos</CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar evento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 md:w-[200px] lg:w-[300px]"
                />
              </div>
              <Button onClick={() => router.push('/app/organizador/eventos/novo')} className={cn(dashboardColors.button.primary)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-lime-500 data-[state=active]:text-white">
                Próximos
              </TabsTrigger>
              <TabsTrigger value="past" className="data-[state=active]:bg-lime-500 data-[state=active]:text-white">
                Passados
              </TabsTrigger>
              <TabsTrigger value="draft" className="data-[state=active]:bg-lime-500 data-[state=active]:text-white">
                Rascunhos
              </TabsTrigger>
            </TabsList>
            
            {/* Conteúdo das tabs */}
            <TabsContent value="upcoming">
              {loadingEvents ? (
                <div className="space-y-3">
                  <div className="h-16 bg-gray-100 rounded-md animate-pulse"></div>
                  <div className="h-16 bg-gray-100 rounded-md animate-pulse"></div>
                  <div className="h-16 bg-gray-100 rounded-md animate-pulse"></div>
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="rounded-md border">
                  <div className="bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 grid grid-cols-[1fr,auto,auto] gap-4">
                    <div>Nome</div>
                    <div>Data</div>
                    <div>Ações</div>
                  </div>
                  <div className="divide-y">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="grid grid-cols-[1fr,auto,auto] gap-4 px-4 py-3 items-center">
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-gray-500">{event.location}</p>
                        </div>
                        <div>
                          <Badge className={dashboardColors.badge.green}>
                            {new Date(event.date).toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/app/organizador/eventos/${event.id}`)}>
                            Detalhes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md">
                  <p className={dashboardColors.text.secondary}>Nenhum evento próximo encontrado</p>
                  <Button
                    onClick={() => router.push('/app/organizador/eventos/novo')}
                    className={cn("mt-4", dashboardColors.button.primary)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Novo Evento
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past">
              {/* Conteúdo similar ao de próximos eventos */}
              <div className="text-center py-8 border rounded-md">
                <p className={dashboardColors.text.secondary}>Lista de eventos passados aparecerá aqui</p>
              </div>
            </TabsContent>
            
            <TabsContent value="draft">
              {/* Conteúdo similar ao de próximos eventos */}
              <div className="text-center py-8 border rounded-md">
                <p className={dashboardColors.text.secondary}>Lista de rascunhos de eventos aparecerá aqui</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 