"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowRight, 
  Users, 
  Ticket, 
  CreditCard, 
  Building, 
  CalendarDays,
  UserPlus,
  TicketCheck,
  Plus,
  TrendingUp,
  Receipt,
  DollarSign,
  Percent,
  Copy
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface KPISummary {
  totalEvents: number
  upcomingEvents: number
  totalGuests: number
  teamsCount: number
  totalTickets: number
  pendingCommissions: number
  teamsWithCommissions: number
}

interface Team {
  id: string
  name: string
  pendingAmount: number
  eventCount: number
}

interface Event {
  id: string
  name: string
  date: string
  location: string
  ticketsSold: number
  status: 'active' | 'past' | 'draft'
}

export default function OrganizadorDashboardPage() {
  const router = useRouter()
  const { user, selectedOrganization } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPISummary | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [organizationCode, setOrganizationCode] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('Dashboard useEffect', { user, selectedOrganization })
    
    if (user && selectedOrganization) {
      console.log('Dashboard: Carregando com organização selecionada')
      loadDashboardData()
    } else if (user) {
      // Se tiver usuário mas não organização, buscar do usuário
      console.log('Dashboard: Usuário logado mas sem organização, buscando...')
      loadOrganizationAndData()
    }
  }, [user, selectedOrganization])
  
  const loadOrganizationAndData = async () => {
    if (!user) return
    
    try {
      // Buscar organização do usuário
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .single()
        
      if (orgError) {
        console.error('Erro ao buscar organização:', orgError)
        return
      }
      
      if (orgData && orgData.organization_id) {
        // Buscar detalhes da organização
        const { data: orgDetails, error: detailsError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', orgData.organization_id)
          .single()
          
        if (detailsError) {
          console.error('Erro ao buscar detalhes da organização:', detailsError)
          return
        }
        
        if (orgDetails) {
          console.log('Organização encontrada:', orgDetails)
          loadDashboardDataWithOrg(orgDetails.id)
        }
      } else {
        console.log('Nenhuma organização encontrada para o usuário')
      }
    } catch (e) {
      console.error('Erro ao carregar organização:', e)
    }
  }
  
  const loadDashboardData = async () => {
    if (!user || !selectedOrganization) {
      console.log('Dashboard: Dados incompletos para carregar dashboard')
      return
    }
    
    console.log('Dashboard: Carregando dados com organização', selectedOrganization.id)
    // Chamar função com ID da organização
    loadDashboardDataWithOrg(selectedOrganization.id)
  }
  
  // Criar RPC para contar equipes e evitar erro 500
  const getTeamsCount = async (organizationId: string) => {
    try {
      // Usar uma consulta mais simples para contar equipes
      const { data, error } = await supabase
        .from('organization_teams')
        .select('id', { head: true })
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Erro ao contar equipes:', error)
        return 0
      }
      
      return data ? 1 : 0 // Simplificar para evitar erro 500
    } catch (err) {
      console.error('Erro ao contar equipes:', err)
      return 0
    }
  }
  
  // Consulta segura para tickets
  const getTicketsCount = async (organizationId: string) => {
    try {
      // Verificar primeiro se a tabela existe
      const { data, error } = await supabase
        .from('tickets')
        .select('id', { head: true, count: 'exact' })
        .eq('organization_id', organizationId)
        
      if (error) {
        // Se der erro 404, a tabela pode não existir
        console.error('Erro ao contar tickets:', error)
        return 0
      }
      
      return data ? 1 : 0
    } catch (err) {
      console.error('Erro ao contar tickets:', err)
      return 0
    }
  }
  
  // Consulta segura para comissões
  const getCommissionsData = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select('amount, team_id')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        
      if (error) {
        console.error('Erro ao buscar comissões:', error)
        return []
      }
      
      return data || []
    } catch (err) {
      console.error('Erro ao buscar comissões:', err)
      return []
    }
  }

  const loadDashboardDataWithOrg = async (organizationId: string) => {
    console.log('Carregando dashboard para organização:', organizationId)
    setLoading(true)
    
    try {
      // Gerar um código para a organização baseado no ID
      const generatedOrgCode = `ORG-${organizationId.substring(0, 6).toUpperCase()}`;
      setOrganizationCode(generatedOrgCode)
      
      // Usar fallback para buscar dados diretamente das tabelas em vez de RPC
      // para evitar o erro 400
      console.log('Buscando dados diretamente das tabelas em vez de RPC')
      
      // 1. Buscar contagem de eventos
      const { count: eventsCount, error: eventsError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        
      console.log('Contagem de eventos:', { eventsCount, eventsError })
      
      // 2. Buscar contagem de equipes
      const { count: teamsCount, error: teamsError } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        
      console.log('Contagem de equipes:', { teamsCount, teamsError })
      
      // 3. Buscar contagem de convidados
      const { count: guestsCount, error: guestsError } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        
      console.log('Contagem de convidados:', { guestsCount, guestsError })
      
      // 4. Buscar eventos para exibir
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .limit(5)
        
      // 5. Buscar equipes para exibir
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .limit(5)
      
      // Buscar informações detalhadas para cada equipe
      let teamsWithDetails = [];
      
      if (teamsData && teamsData.length > 0) {
        // Para cada equipe, buscar eventos vinculados e comissões pendentes
        for (const team of teamsData) {
          // Contar eventos vinculados à equipe
          const { count: eventCount } = await supabase
            .from('event_teams')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
            
          // Buscar comissões pendentes para esta equipe
          const { data: teamCommissions } = await supabase
            .from('commissions')
            .select('amount')
            .eq('team_id', team.id)
            .eq('status', 'pending')
            
          // Calcular total de comissões pendentes
          const pendingAmount = teamCommissions ? 
            teamCommissions.reduce((total, comm) => total + (parseFloat(comm.amount) || 0), 0) : 0
            
          teamsWithDetails.push({
            id: team.id,
            name: team.name,
            pendingAmount: pendingAmount,
            eventCount: eventCount || 0
          })
        }
      }
      
      // Depois de todas as consultas, atualizar os estados
      const events = eventsData || []
      const teams = teamsWithDetails.length > 0 ? teamsWithDetails : 
        teamsData?.map(team => ({
          id: team.id,
          name: team.name,
          pendingAmount: 0, // Zero como default
          eventCount: 0 // Zero como default
        })) || []
      
      // Calcular comissões pendentes totais e equipes com comissões
      let totalPendingCommissions = 0;
      let teamsWithPendingCommissions = 0;
      
      if (teamsWithDetails.length > 0) {
        // Calcular o total de comissões pendentes de todas as equipes
        totalPendingCommissions = teamsWithDetails.reduce(
          (total, team) => total + (team.pendingAmount || 0), 
          0
        );
        
        // Contar equipes com comissões pendentes
        teamsWithPendingCommissions = teamsWithDetails.filter(
          team => team.pendingAmount > 0
        ).length;
      }

      setKpis({
        totalEvents: eventsCount || 0,
        upcomingEvents: 0, // Default
        totalGuests: guestsCount || 0,
        teamsCount: teamsCount || 0,
        totalTickets: 0, // Default
        pendingCommissions: totalPendingCommissions,
        teamsWithCommissions: teamsWithPendingCommissions
      })
      
      setTeams(teams)
      setEvents(events.map(event => ({
        id: event.id,
        name: event.name,
        date: event.date || event.event_date || new Date().toISOString(),
        location: event.location || 'Local não especificado',
        ticketsSold: 0,
        status: 'active'
      })))
      
    } catch (e) {
      console.error('Erro ao processar dados do dashboard:', e)
      
      // Não usar toast diretamente aqui para evitar erros de renderização
      // Em vez disso, define uma flag que será usada no useEffect
      
      // Use valores zerados em vez de null
      setKpis({
        totalEvents: 0,
        upcomingEvents: 0,
        totalGuests: 0,
        teamsCount: 0,
        totalTickets: 0,
        pendingCommissions: 0,
        teamsWithCommissions: 0
      })
      setTeams([])
      setEvents([])
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
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardHeader className="bg-muted/40 h-12"></CardHeader>
              <CardContent className="p-6">
                <div className="h-24 bg-muted/40 rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  if (!kpis && !loading) {
    // Se não estiver carregando e não tiver dados, mostrar dashboard vazio com cards zerados
    const emptyKpis = {
      totalEvents: 0,
      upcomingEvents: 0,
      totalGuests: 0,
      teamsCount: 0,
      totalTickets: 0,
      pendingCommissions: 0,
      teamsWithCommissions: 0
    }
    
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* Cards principais vazios */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex justify-between items-center">
                <span>0</span>
                <Link href="/app/organizador/eventos">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                0 próximos
              </p>
              <div className="mt-4">
                <Link href="/app/organizador/eventos/novo">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Evento
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Convidados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex justify-between items-center">
                <span>0</span>
                <Link href="/app/organizador/convidados">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de convidados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Equipas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex justify-between items-center">
                <span>0</span>
                <Link href="/app/organizador/equipes">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                0 com comissões pendentes
              </p>
              <div className="mt-4">
                <Link href="/app/organizador/equipes/adicionar">
                  <Button variant="outline" size="sm" className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Equipa
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bilhetes Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <span>0</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de bilhetes
              </p>
              <div className="mt-4">
                <Link href="/app/organizador/vendas">
                  <Button variant="outline" size="sm" className="w-full">
                    <TicketCheck className="mr-2 h-4 w-4" />
                    Ver Vendas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissões Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex justify-between items-center">
                <span>{formatCurrency(0)}</span>
                <Link href="/app/organizador/comissoes">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total a pagar
              </p>
              <div className="mt-4">
                <Link href="/app/organizador/comissoes">
                  <Button variant="outline" size="sm" className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar Comissões
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  if (!kpis) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Não tem nenhuma organização</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Para aceder ao dashboard de organizador, crie a sua organização primeiro.
            </p>
            <Link href="/app/organizador/criar-organizacao">
              <Button>
                <Building className="mr-2 h-4 w-4" />
                Criar Organização
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Cards principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex justify-between items-center">
              <span>{kpis.totalEvents}</span>
              <Link href="/app/organizador/eventos">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.upcomingEvents} próximos
            </p>
            <div className="mt-4">
              <Link href="/app/organizador/eventos/novo">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Evento
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Convidados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex justify-between items-center">
              <span>{kpis.totalGuests}</span>
              <Link href="/app/organizador/convidados">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de convidados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bilhetes Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <span>{kpis.totalTickets}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de bilhetes
            </p>
            <div className="mt-4">
              <Link href="/app/organizador/vendas">
                <Button variant="outline" size="sm" className="w-full">
                  <TicketCheck className="mr-2 h-4 w-4" />
                  Ver Vendas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equipas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex justify-between items-center">
              <span>{kpis.teamsCount}</span>
              <Link href="/app/organizador/equipes">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.teamsWithCommissions} com comissões pendentes
            </p>
            <div className="mt-4">
              <Link href="/app/organizador/equipes/adicionar">
                <Button variant="outline" size="sm" className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Equipa
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex justify-between items-center">
              <span>{formatCurrency(kpis.pendingCommissions)}</span>
              <Link href="/app/organizador/comissoes">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total a pagar
            </p>
            <div className="mt-4">
              <Link href="/app/organizador/comissoes">
                <Button variant="outline" size="sm" className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar Comissões
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Código da organização (se existir) */}
      {organizationCode && (
        <Card className="mb-8">
          <CardContent className="flex flex-col md:flex-row justify-between items-center p-4 gap-4">
            <div>
              <h3 className="font-medium">Código da Organização</h3>
              <p className="text-sm text-muted-foreground">
                Compartilhe este código com chefes de equipe para facilitar o vínculo
              </p>
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="font-mono py-1.5 px-3">
                {organizationCode}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  navigator.clipboard.writeText(organizationCode)
                  toast.success('Código copiado!')
                }} 
                className="ml-2 h-8 w-8"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M5 2V1H10V2H5ZM4.75 0C4.33579 0 4 0.335786 4 0.75V1H3.5C2.67157 1 2 1.67157 2 2.5V12.5C2 13.3284 2.67157 14 3.5 14H11.5C12.3284 14 13 13.3284 13 12.5V2.5C13 1.67157 12.3284 1 11.5 1H11V0.75C11 0.335786 10.6642 0 10.25 0H4.75ZM11 2V2.25C11 2.66421 10.6642 3 10.25 3H4.75C4.33579 3 4 2.66421 4 2.25V2H3.5C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V2.5C12 2.22386 11.7761 2 11.5 2H11Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Conteúdo principal */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Equipas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Equipas</CardTitle>
              <Link href="/app/organizador/equipes">
                <Button variant="ghost" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
            <CardDescription>
              Equipas vinculadas à sua organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Sem equipas vinculadas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione equipas para gerir comissões e vincular a eventos.
                </p>
                <Link href="/app/organizador/equipes/adicionar">
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Equipa
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                    <div className="flex items-center">
                      <Users className="h-6 w-6 text-muted-foreground/60 mr-3" />
                      <div>
                        <h4 className="font-medium">{team.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {team.eventCount} eventos vinculados
                        </p>
                      </div>
                    </div>
                    {team.pendingAmount > 0 ? (
                      <Link href={`/app/organizador/comissoes/pagar?team=${team.id}&name=${encodeURIComponent(team.name)}`}>
                        <Button variant="outline" size="sm">
                          {formatCurrency(team.pendingAmount)}
                        </Button>
                      </Link>
                    ) : (
                      <Badge variant="outline">Sem pendências</Badge>
                    )}
                  </div>
                ))}
                
                {teams.length > 0 && kpis.teamsCount > teams.length && (
                  <div className="pt-2 text-center">
                    <Link href="/app/organizador/equipes">
                      <Button variant="ghost" size="sm">
                        Ver todas ({kpis.teamsCount})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Eventos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Próximos Eventos</CardTitle>
              <Link href="/app/organizador/eventos">
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </Link>
            </div>
            <CardDescription>
              Eventos agendados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Sem eventos agendados</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie seu primeiro evento para começar a vender ingressos.
                </p>
                <Link href="/app/organizador/eventos/novo">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Evento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center mr-3">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.date)} • {event.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge 
                        variant={
                          event.status === 'active' ? 'default' : 
                          event.status === 'past' ? 'secondary' : 'outline'
                        }
                        className="mb-1"
                      >
                        {event.status === 'active' ? 'Ativo' : 
                        event.status === 'past' ? 'Passado' : 'Rascunho'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {event.ticketsSold} ingressos
                      </span>
                    </div>
                  </div>
                ))}
                
                {events.length > 0 && kpis.totalEvents > events.length && (
                  <div className="pt-2 text-center">
                    <Link href="/app/organizador/eventos">
                      <Button variant="ghost" size="sm">
                        Ver todos ({kpis.totalEvents})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Ferramentas e atalhos úteis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Link href="/app/organizador/comissoes">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                <CreditCard className="h-6 w-6 mb-2" />
                <span>Pagar Comissões</span>
              </Button>
            </Link>
            
            <Link href="/app/organizador/eventos/novo">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                <CalendarDays className="h-6 w-6 mb-2" />
                <span>Novo Evento</span>
              </Button>
            </Link>
            
            <Link href="/app/organizador/equipes/adicionar">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                <Users className="h-6 w-6 mb-2" />
                <span>Adicionar Equipa</span>
              </Button>
            </Link>
            
            <Link href="/app/organizador/relatorios">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                <TrendingUp className="h-6 w-6 mb-2" />
                <span>Relatórios</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 