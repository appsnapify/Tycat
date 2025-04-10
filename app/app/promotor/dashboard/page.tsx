"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowRight,
  Users,
  Ticket,
  CreditCard,
  Building,
  CalendarDays,
  ShoppingBag,
  Calendar,
  QrCode,
  UserPlus,
  CheckCircle,
  Clock,
  ChevronRight,
  ClipboardList,
  BadgePercent,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// Importar componentes do dashboard
import { MetricCard } from '@/components/dashboard/metric-card'
import { ActivityFeed, ActivityItem } from '@/components/dashboard/activity-feed'
import { TeamCodeDisplay } from '@/components/dashboard/team-code-display'

export default function PromotorDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [teamData, setTeamData] = useState<any>(null)
  const [teamCode, setTeamCode] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState(0)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [userStats, setUserStats] = useState({
    totalSales: 0,
    totalCommission: 0,
    eventsJoined: 0,
    tasksDone: 0
  })
  
  useEffect(() => {
    console.log("PromotorDashboardPage - Montado")
    
    if (user) {
      loadDashboardData()
    } else {
      const timer = setTimeout(() => {
        setLoading(false)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
    
    return () => {
      console.log("PromotorDashboardPage - Desmontado")
    }
  }, [user])
  
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      console.log("Carregando dados do dashboard do promotor")
      
      // Obter ID da equipe dos metadados do usuário
      const teamId = user?.user_metadata?.team_id
      const teamCode = user?.user_metadata?.team_code
      
      setTeamCode(teamCode)
      
      // Se não houver ID da equipe, mostrar estados vazios
      if (!teamId) {
        console.log("ID da equipa não encontrado nos metadados")
        setLoading(false)
        return
      }
      
      // Buscar dados da equipe
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()
        
        if (teamError) {
          console.error("Erro ao buscar dados da equipa:", teamError)
        } else if (teamData) {
          setTeamData(teamData)
        }
        
        // Contar membros da equipe
        const { count, error: countError } = await supabase
          .from('team_members')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
        
        if (!countError) {
          setTeamMembers(count || 1)
        }
      } catch (err) {
        console.error("Erro ao buscar dados da equipa:", err)
      }
      
      // Buscar eventos próximos
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            id,
            name,
            date,
            location,
            status,
            organizations (
              name
            )
          `)
          .eq('team_id', teamId)
          .eq('status', 'upcoming')
          .order('date', { ascending: true })
          .limit(3)
        
        if (eventsError) {
          console.error("Erro ao buscar eventos:", eventsError)
          setUpcomingEvents([])
        } else if (eventsData && eventsData.length > 0) {
          setUpcomingEvents(eventsData)
        } else {
          setUpcomingEvents([])
        }
        
        // Contar eventos que o promotor participou
        try {
          const userId = user?.id
          const { count: joinedCount, error: joinedError } = await supabase
            .from('event_participants')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
          
          if (!joinedError) {
            setUserStats(prev => ({
              ...prev,
              eventsJoined: joinedCount || 0
            }))
          } else {
            setUserStats(prev => ({
              ...prev,
              eventsJoined: 0
            }))
          }
        } catch (err) {
          console.error("Erro ao contar eventos participados:", err)
          setUserStats(prev => ({
            ...prev,
            eventsJoined: 0
          }))
        }
      } catch (err) {
        console.error("Erro ao buscar eventos:", err)
        setUpcomingEvents([])
      }
      
      // Buscar vendas e comissões
      try {
        const userId = user?.id
        
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('quantity, amount')
          .eq('user_id', userId)
        
        if (!salesError && salesData && salesData.length > 0) {
          const totalSales = salesData.reduce((sum, sale) => sum + (parseInt(sale.quantity) || 0), 0)
          setUserStats(prev => ({
            ...prev,
            totalSales
          }))
        } else {
          setUserStats(prev => ({
            ...prev,
            totalSales: 0
          }))
        }
        
        // Buscar comissões
        const { data: commissionsData, error: commissionsError } = await supabase
          .from('commissions')
          .select('amount')
          .eq('user_id', userId)
          .eq('status', 'paid')
        
        if (!commissionsError && commissionsData && commissionsData.length > 0) {
          const totalCommission = commissionsData.reduce((sum, comm) => sum + (parseFloat(comm.amount) || 0), 0)
          setUserStats(prev => ({
            ...prev,
            totalCommission
          }))
        } else {
          setUserStats(prev => ({
            ...prev,
            totalCommission: 0
          }))
        }
      } catch (err) {
        console.error("Erro ao buscar vendas e comissões:", err)
        setUserStats(prev => ({
          ...prev,
          totalSales: 0,
          totalCommission: 0
        }))
      }
      
      // Contar tarefas concluídas
      try {
        const userId = user?.id
        const { count: tasksCount, error: tasksError } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed')
        
        if (!tasksError) {
          setUserStats(prev => ({
            ...prev,
            tasksDone: tasksCount || 0
          }))
        } else {
          setUserStats(prev => ({
            ...prev,
            tasksDone: 0
          }))
        }
      } catch (err) {
        console.error("Erro ao contar tarefas:", err)
        setUserStats(prev => ({
          ...prev,
          tasksDone: 0
        }))
      }
      
      // Buscar atividades
      try {
        // Verificar se a tabela 'activities' existe antes de tentar consultar
        const { error: tableCheckError } = await supabase
          .from('activities')
          .select('id')
          .limit(1)
          
        // Se houver erro ao verificar a tabela, provavelmente ela não existe
        if (tableCheckError) {
          console.warn("A tabela 'activities' pode não existir:", tableCheckError)
          setActivities([])
        } else {
          const userId = user?.id
          const { data: activitiesData, error: activitiesError } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)
          
          if (!activitiesError && activitiesData && activitiesData.length > 0) {
            // Converter para o formato de ActivityItem
            const formattedActivities: ActivityItem[] = activitiesData.map(activity => ({
              id: activity.id,
              type: activity.type || 'unknown',
              timestamp: activity.created_at,
              data: activity.data || {}
            }))
            setActivities(formattedActivities)
          } else {
            setActivities([])
          }
        }
      } catch (err) {
        console.error("Erro ao buscar atividades:", err)
        setActivities([])
      }
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados do dashboard")
      
      // Em caso de erro, definir estados vazios
      setUpcomingEvents([])
      setActivities([])
      setUserStats({
        totalSales: 0,
        totalCommission: 0,
        eventsJoined: 0,
        tasksDone: 0
      })
    } finally {
      setLoading(false)
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
  
  // Componente para estados vazios
  const EmptyState = ({ 
    icon: Icon = AlertCircle, 
    title = "Sem dados", 
    description = "Não foram encontrados dados para mostrar",
    actionLabel = "",
    actionLink = "",
    onAction
  }: {
    icon?: any,
    title?: string,
    description?: string,
    actionLabel?: string,
    actionLink?: string,
    onAction?: () => void
  }) => (
    <div className="text-center py-8">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">
        {description}
      </p>
      {actionLabel && (
        <Button 
          variant="outline"
          onClick={onAction || (actionLink ? () => router.push(actionLink) : undefined)}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">A carregar Dashboard...</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-12 bg-muted/40"></CardHeader>
              <CardContent className="p-6">
                <div className="h-24 bg-muted/40 rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard de Promotor</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de promotor
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {teamCode ? (
            <Badge variant="outline" className="text-sm">
              Código da Equipa: {teamCode}
            </Badge>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => router.push('/app/promotor/equipes/entrar')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Entrar numa Equipa
            </Button>
          )}
        </div>
      </div>
      
      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <MetricCard 
          title="Bilhetes Vendidos"
          value={userStats.totalSales}
          description="Total de vendas"
          icon={<Ticket className="h-4 w-4" />}
        />
        
        <MetricCard 
          title="Comissões Ganhas"
          value={formatCurrency(userStats.totalCommission)}
          description="Valor recebido"
          icon={<BadgePercent className="h-4 w-4" />}
        />
        
        <MetricCard 
          title="Eventos"
          value={userStats.eventsJoined}
          description="Eventos participados"
          icon={<Calendar className="h-4 w-4" />}
        />
        
        <MetricCard 
          title="Tarefas Concluídas"
          value={userStats.tasksDone}
          description="Tarefas completadas"
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>
      
      {/* Conteúdo Principal */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Status da Equipe */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>A Minha Equipa</CardTitle>
              <CardDescription>
                {teamData?.name || 'Equipa'} • {teamMembers} {teamMembers === 1 ? 'membro' : 'membros'}
              </CardDescription>
            </div>
            {teamCode && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/app/promotor/equipe')}
              >
                Ver Detalhes
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {teamCode ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Meu progresso na equipa</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Vendas</span>
                        <span className="text-muted-foreground">{userStats.totalSales}/100</span>
                      </div>
                      <Progress value={Math.min(userStats.totalSales, 100)} className="h-2" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Eventos</span>
                        <span className="text-muted-foreground">{userStats.eventsJoined}/10</span>
                      </div>
                      <Progress value={Math.min(userStats.eventsJoined * 10, 100)} className="h-2" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Tarefas</span>
                        <span className="text-muted-foreground">{userStats.tasksDone}/20</span>
                      </div>
                      <Progress value={Math.min(userStats.tasksDone * 5, 100)} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Sem equipa"
                description="Ainda não pertence a nenhuma equipa"
                actionLabel="Entrar numa Equipa"
                onAction={() => router.push('/app/promotor/equipes/entrar')}
              />
            )}
          </CardContent>
          {teamCode && (
            <CardFooter className="border-t px-6 py-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/app/promotor/equipe')}
              >
                <Users className="mr-2 h-4 w-4" />
                Ver Detalhes da Equipa
              </Button>
            </CardFooter>
          )}
        </Card>
        
        {/* Próximos Eventos */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Próximos Eventos</CardTitle>
              <CardDescription>
                Eventos agendados para a sua equipa
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/app/promotor/eventos')}
            >
              Ver Todos
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex flex-col space-y-2">
                    <div className="font-medium">{event.name}</div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center">
                        <CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Building className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{event.organizations?.name || 'Organização'}</span>
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="Sem eventos"
                description="Sem eventos próximos"
                actionLabel="Explorar Eventos"
                onAction={() => router.push('/app/promotor/eventos')}
              />
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/app/promotor/eventos')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Ver Calendário de Eventos
            </Button>
          </CardFooter>
        </Card>
        
        {/* Atividade Recente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Minhas Atividades</CardTitle>
            <CardDescription>
              Suas ações recentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed 
              activities={activities}
              emptyMessage="Sem atividades recentes para mostrar"
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Acesso Rápido */}
      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>QR Venda Rápida</CardTitle>
            <CardDescription>
              Acesse o código QR para vendas rápidas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="bg-muted p-4 rounded-md w-40 h-40 flex items-center justify-center">
              <QrCode className="h-24 w-24 text-muted-foreground/60" />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button 
              className="w-full"
              onClick={() => router.push('/app/promotor/vender')}
            >
              Vender Bilhetes
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Suas Vendas</CardTitle>
            <CardDescription>
              Acompanhe seu desempenho de vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="justify-between"
              onClick={() => router.push('/app/promotor/vendas')}
            >
              <div className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Histórico de Vendas
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="justify-between"
              onClick={() => router.push('/app/promotor/comissoes')}
            >
              <div className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Minhas Comissões
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
            <CardDescription>
              Suas tarefas e pendências
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="justify-between"
              onClick={() => router.push('/app/promotor/tarefas')}
            >
              <div className="flex items-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                Minhas Tarefas
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="justify-between"
              onClick={() => router.push('/app/promotor/perfil')}
            >
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Meu Perfil
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 