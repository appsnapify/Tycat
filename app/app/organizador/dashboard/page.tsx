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
  Copy,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  UserCheck,
  CalendarPlus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { User } from '@supabase/supabase-js'
import { useAuthContext } from '@/contexts/auth-context'
import { formatDate } from '@/lib/utils'

interface Team {
  id: string
  name: string
  eventCount: number
}

interface Event {
  id: string
  name: string
  date: string
  location: string
  status: 'upcoming' | 'past' | 'draft' | 'canceled'
}

interface Activity {
  type: string
  title: string
  description: string
  date: string
}

const activityIcons = {
  'guest': Users,
  'ticket': CalendarDays,
  'commission': ArrowRight,
  'other': ArrowRight
}

export default function OrganizadorDashboardPage() {
  const router = useRouter()
  const { user, selectedOrganization } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    teamsCount: 0
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [organizationCode, setOrganizationCode] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [timeFilter, setTimeFilter] = useState('month')
  const [eventFilter, setEventFilter] = useState<'all' | 'active' | 'past' | 'draft'>('all')
  const [copied, setCopied] = useState(false)
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingError, setLoadingError] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  
  useEffect(() => {
    console.log('Dashboard useEffect', { user })
    
    if (user) {
      console.log('Dashboard: Usuário logado mas sem organização, buscando...')
      loadOrganizationAndData()
    }
  }, [user])
  
  const loadOrganizationAndData = async () => {
    if (!user) return
    
    console.log('Iniciando loadOrganizationAndData')
    
    try {
      // Buscar organização do usuário
      console.log('Buscando organizações do usuário:', user.id)
      const { data: orgDataArray, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'organizador'])
        .limit(1)

      // Log detalhado do resultado
      if (orgError) {
        console.error('Erro DETALHADO ao buscar user_organizations:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        })
        if (orgError.code === 'PGRST116') {
           console.warn('A query retornou múltiplas linhas onde apenas uma era esperada. Verifique RLS ou dados duplicados.')
        }
        setLoading(false)
        setLoadingError(true)
        return
      }

      // Verificar se o array tem dados
      if (!orgDataArray || orgDataArray.length === 0) {
        console.log('Nenhuma organização encontrada para o usuário (array vazio ou nulo).', orgDataArray)
        setLoading(false)
        return
      }

      // Se chegou aqui, temos pelo menos uma organização
      const orgData = orgDataArray[0]
      console.log('Organização encontrada via user_organizations, ID:', orgData.organization_id)
      
      // Buscar detalhes da organização
      const { data: orgDetails, error: detailsError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', orgData.organization_id)
        .single()
        
      if (detailsError) {
        console.error('Erro ao buscar detalhes da organização:', {
          code: detailsError.code,
          message: detailsError.message,
          details: detailsError.details
        })
        setLoading(false)
        setLoadingError(true)
        return
      }
      
      if (!orgDetails) {
        console.log('Detalhes da organização não encontrados')
        setLoading(false)
        return
      }
      
      console.log('Detalhes da organização encontrados:', orgDetails)
      const organizationId = orgDetails.id
      
      // Verificar se o ID da organização é válido
      if (!organizationId) {
        console.error('ID da organização é inválido ou vazio')
        setLoading(false)
        setLoadingError(true)
        return
      }
      
      // Carregar dados em paralelo com tratamento individual de erros
      try {
        loadKpis(organizationId)
      } catch (e) {
        console.error('Erro ao iniciar loadKpis:', e)
      }
      
      try {
        loadEvents(organizationId)
      } catch (e) {
        console.error('Erro ao iniciar loadEvents:', e)
      }
      
      try {
        loadTeams(organizationId)
      } catch (e) {
        console.error('Erro ao iniciar loadTeams:', e)
      }
      
      try {
        loadActivities(organizationId)
      } catch (e) {
        console.error('Erro ao iniciar loadActivities:', e)
      }
    } catch (e) {
      const errorInfo = {
        name: e?.name || 'Unknown error',
        message: e?.message || 'No error message available',
        stack: e?.stack || 'No stack trace available',
        toString: e?.toString?.() || 'Error cannot be stringified',
        isError: e instanceof Error,
        constructor: e?.constructor?.name || 'Unknown constructor',
        keys: Object.keys(e || {}).join(', ') || 'No properties'
      }
      
      console.error('Erro detalhado ao carregar organização:', errorInfo)
      setLoading(false)
      setLoadingError(true)
    }
  }
  
  const generateOrganizationCode = (organizationId: string) => {
    const generatedOrgCode = `ORG-${organizationId.substring(0, 6).toUpperCase()}`
    setOrganizationCode(generatedOrgCode)
  }
  
  // Função de KPIs simplificada (apenas eventos e equipes)
  const loadKpis = async (organizationId: string) => {
    setLoadingKpis(true);
    
    try {
      console.log('Iniciando carregamento de KPIs para organização:', organizationId);
      
      if (!organizationId) {
        console.error('ID da organização não fornecido para KPIs');
        setKpis({
          totalEvents: 0,
          upcomingEvents: 0,
          teamsCount: 0
        });
        setLoadingKpis(false);
        return;
      }
      
      // 1. Buscar contagem de eventos com verificação de tabela
      let eventsCount = 0;
      const eventsTableExists = await checkTableExists('events');
      
      if (eventsTableExists) {
        try {
          // Tentar buscar eventos com filtro de organização
          const eventsResponse = await supabase
            .from('events')
            .select('id')
            .eq('organization_id', organizationId);
            
          if (eventsResponse.error) {
            if (eventsResponse.error.code === '42703') {
              console.error('A coluna organization_id não existe na tabela events:', eventsResponse.error);
              
              // Tentar buscar todos os eventos sem filtro
              const allEventsResponse = await supabase
                .from('events')
                .select('id');
                
              if (!allEventsResponse.error) {
                eventsCount = allEventsResponse.data?.length || 0;
                console.log(`Contagem de todos os eventos (sem filtro): ${eventsCount}`);
              }
            } else {
              console.error('Erro ao buscar eventos:', eventsResponse.error);
            }
          } else {
            eventsCount = eventsResponse.data?.length || 0;
            console.log(`Contagem de eventos filtrados: ${eventsCount}`);
          }
        } catch (eventError) {
          console.error('Exceção ao contar eventos:', eventError);
        }
      } else {
        console.log('A tabela events não existe. Usando contagem zero.');
      }
      
      // 2. Buscar contagem de equipes correta pela relação
      let teamsCount = 0;
      const orgTeamsTableExists = await checkTableExists('organization_teams');
      
      if (orgTeamsTableExists) {
        try {
          console.log(`Contando equipes vinculadas à organização ${organizationId}...`);
          const { count, error: countError } = await supabase
        .from('organization_teams')
            .select('team_id', { count: 'exact', head: true })
            .eq('organization_id', organizationId);
            
          if (countError) {
            console.error('Erro ao contar equipes vinculadas:', countError);
          } else {
            teamsCount = count ?? 0;
            console.log(`Contagem de equipes vinculadas: ${teamsCount}`);
          }
        } catch (teamError) {
          console.error('Exceção ao contar equipes vinculadas:', teamError);
        }
      } else {
        console.log('A tabela organization_teams não existe. Usando contagem zero.');
      }
      
      // Atualizar estados com os dados obtidos
      setKpis({
        totalEvents: eventsCount,
        upcomingEvents: 0, // Por enquanto, deixamos como zero
        teamsCount: teamsCount
      });
      
      console.log('KPIs carregados com sucesso');
    } catch (e) {
      console.error('Erro geral ao carregar KPIs:', e);
      setLoadingError(true);
      
      // Usar valores zerados em caso de erro
      setKpis({
        totalEvents: 0,
        upcomingEvents: 0,
        teamsCount: 0
      });
    } finally {
      setLoadingKpis(false);
      setLoading(false);
    }
  };
  
  const loadEvents = async (organizationId: string) => {
    setLoadingEvents(true)
    
    try {
      console.log('Iniciando carregamento de eventos para organização:', organizationId)
      
      if (!organizationId) {
        console.error('ID da organização não fornecido para eventos')
        throw new Error('ID da organização não fornecido')
      }
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: true })
        .limit(5)

      if (error) {
        console.error('Erro na consulta Supabase (events):', {
          code: error.code,
          message: error.message,
          details: error.details
        })
        throw error
      }
      
      if (!eventsData) {
        console.warn('Nenhum evento encontrado para a organização:', organizationId)
        setEvents([])
        return
      }
      
      console.log(`Encontrados ${eventsData.length} eventos para a organização`)
      
      const mappedEvents = eventsData.map(event => {
        // Verificar e fornecer valores padrão para todos os campos
        const eventDate = event.date || event.event_date || new Date().toISOString()
        const eventName = event.name || event.title || 'Evento sem nome'
        const eventLocation = event.location || 'Local não especificado'
        
        return {
          id: event.id || `unknown-${Math.random().toString(36).substring(7)}`,
          name: eventName,
          date: eventDate,
          location: eventLocation,
          status: determineEventStatus(eventDate)
        }
      })
      
      setEvents(mappedEvents)
      console.log('Eventos carregados com sucesso:', mappedEvents.length)
      
    } catch (e) {
      const errorInfo = {
        name: e?.name || 'Unknown error',
        message: e?.message || 'No error message available',
        stack: e?.stack || 'No stack trace available',
        toString: e?.toString?.() || 'Error cannot be stringified',
        isError: e instanceof Error,
        constructor: e?.constructor?.name || 'Unknown constructor',
        keys: Object.keys(e || {}).join(', ') || 'No properties',
        code: e?.code,
        details: e?.details
      }
      
      console.error('Erro detalhado ao carregar eventos:', errorInfo)
      setLoadingError(true)
      setEvents([])
    } finally {
      setLoadingEvents(false)
      setLoading(false)
    }
  }
  
  // Funções para verificar a estrutura do banco de dados
  const checkTableExists = async (tableName) => {
    try {
      // Usamos uma consulta simples para verificar se a tabela existe
      const response = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      // Se não houve erro, a tabela existe
      if (!response.error) {
        console.log(`A tabela ${tableName} existe`);
        return true;
      }
      
      // Se o código de erro for 42P01, a tabela não existe
      if (response.error.code === '42P01') {
        console.error(`A tabela ${tableName} não existe no banco de dados`);
        return false;
      }
      
      // Para outros erros, assumimos que a tabela existe mas há um problema de permissão
      console.warn(`Erro ao verificar tabela ${tableName}:`, response.error);
      return true;
    } catch (e) {
      console.error(`Erro ao verificar se a tabela ${tableName} existe:`, e);
      return false;
    }
  };

  const checkColumnExists = async (tableName, columnName) => {
    try {
      // Se a tabela não existir, a coluna também não existe
      const tableExists = await checkTableExists(tableName)
      if (!tableExists) {
        return false
      }
      
      // Tentar incluir a coluna na cláusula select
      // Se a coluna não existir, vai gerar erro 42703
      const query = `select ${columnName} from ${tableName} limit 0`
      
      const { error } = await supabase.rpc('run_sql_query', { query })
        
      if (error) {
        // Código 42703 significa que a coluna não existe
        if (error.code === '42703') {
          console.log(`Coluna '${columnName}' não existe na tabela '${tableName}'`)
          return false
        }
        
        // Se for outro erro, pode ser permissão ou outra coisa
        console.warn(`Erro ao verificar coluna '${columnName}' na tabela '${tableName}':`, error)
        // Vamos assumir que a coluna não existe para evitar filtrar incorretamente
        return false
      }
      
      // Se não houve erro, a coluna existe
      return true
    } catch (e) {
      console.error(`Exceção ao verificar coluna '${columnName}' na tabela '${tableName}':`, e)
      return false
    }
  }

  // Função para corrigir problemas estruturais nas consultas
  const safeQuery = async (tableName, options = {}) => {
    const { 
      organizationId = null,
      select = '*',
      limit = 5,
      orderColumn = null,
      orderAscending = true
    } = options
    
    try {
      // Verificar se a tabela existe
      const tableExists = await checkTableExists(tableName)
      if (!tableExists) {
        console.error(`Tabela '${tableName}' não existe, retornando array vazio`)
        return { data: [], error: { code: '42P01', message: 'Tabela não existe' } }
      }
      
      // Construir a consulta de forma incremental
      let query = supabase.from(tableName).select(select)
      
      // Verificar se o filtro de organização deve ser aplicado
      if (organizationId) {
        // Verificar se a coluna organization_id existe
        const hasOrgColumn = await checkColumnExists(tableName, 'organization_id')
        
        if (hasOrgColumn) {
          // Se a coluna existir, filtrar por organização
          query = query.eq('organization_id', organizationId)
        } else {
          console.warn(`Coluna 'organization_id' não existe na tabela '${tableName}'. Ignorando filtro.`)
        }
      }
      
      // Adicionar ordenação se especificada
      if (orderColumn) {
        // Verificar se a coluna de ordenação existe
        const hasOrderColumn = await checkColumnExists(tableName, orderColumn)
        
        if (hasOrderColumn) {
          // Se a coluna existir, ordenar por ela
          query = query.order(orderColumn, { ascending: orderAscending })
        } else {
          console.warn(`Coluna de ordenação '${orderColumn}' não existe na tabela '${tableName}'. Ignorando ordenação.`)
        }
      }
      
      // Aplicar limite
      query = query.limit(limit)
      
      // Executar a consulta
      const response = await query
      
      return response
    } catch (e) {
      console.error(`Exceção em safeQuery para '${tableName}':`, e)
      return { data: [], error: e }
    }
  }

  // Função para carregar equipes com tratamento robusto de erros
  const loadTeams = async (organizationId: string) => {
    setLoadingTeams(true);
    
    try {
      console.log('Iniciando carregamento de equipes para organização:', organizationId);
      
      if (!organizationId) {
        console.error('ID da organização não fornecido para equipes');
        setTeams([]);
        setLoadingTeams(false);
        return;
      }
      
      // Verificar se a tabela teams existe
      const tableExists = await checkTableExists('teams');
      
      if (!tableExists) {
        console.warn('A tabela teams não existe. Usando dados simulados.');
        setTeams([
          {
            id: `simulated-1`,
            name: 'Equipe Simulada 1',
            eventCount: 0
          },
          {
            id: `simulated-2`,
            name: 'Equipe Simulada 2',
            eventCount: 0
          }
        ]);
        setLoadingTeams(false);
        return;
      }
      
      // A tabela existe, vamos carregar todas as equipes sem filtrar por organization_id
      // já que sabemos que essa coluna não existe na tabela
      console.log('Carregando todas as equipes sem filtro de organização');
      const response = await supabase
        .from('teams')
        .select('id, name')
        .limit(5);
      
      // Verificar se houve erro na consulta
      if (response.error) {
        console.error('Erro ao buscar equipes:', response.error);
        setTeams([]);
      } else {
        // Não houve erro, processamos os dados
        const teams = response.data || [];
        console.log(`Encontradas ${teams.length} equipes`);
        
        const processedTeams = teams.map(team => ({
          id: team.id,
          name: team.name || 'Equipe sem nome',
          eventCount: 0
        }));
        
        setTeams(processedTeams);
      }
    } catch (e) {
      console.error('Erro geral ao carregar equipes:', e);
      setLoadingError(true);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
      setLoading(false);
    }
  };
  
  const loadActivities = async (organizationId: string) => {
    try {
      console.log('Iniciando carregamento de atividades para organização:', organizationId)
      
      if (!organizationId) {
        console.warn('ID da organização não fornecido para atividades')
      }
      
      // Tentar primeiro buscar atividades reais do banco de dados
      let realActivities: Activity[] = []
      
      try {
        // Verificar se existe uma tabela de atividades/logs
        const { data: activityData, error: activityError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5)
          
        if (activityError) {
          console.log('Tabela de atividades não encontrada ou erro:', {
            code: activityError.code,
            message: activityError.message
          })
        } else if (activityData && activityData.length > 0) {
          // Mapear atividades reais se existirem
          realActivities = activityData.map(act => ({
            type: act.type || 'other',
            title: act.title || 'Atividade',
            description: act.description || 'Sem descrição',
            date: act.created_at || new Date().toISOString()
          }))
          
          console.log(`Encontradas ${realActivities.length} atividades reais`)
        }
      } catch (dbError) {
        console.error('Erro ao buscar atividades reais:', dbError)
      }
      
      // Se encontramos atividades reais, usar elas, senão criar mock
      if (realActivities.length > 0) {
        setActivities(realActivities)
        return
      }
      
      // Simular atividades recentes (em um projeto real, isso seria buscado do banco)
      console.log('Usando atividades simuladas')
      const now = new Date()
      const mockActivities: Activity[] = [
        {
          type: 'guest',
          title: 'Novo convidado registrado',
          description: 'João Silva registrou-se para o evento "Festival de Verão"',
          date: new Date(now.getTime() - 30 * 60000).toISOString() // 30 min atrás
        },
        {
          type: 'ticket',
          title: 'Bilhete vendido',
          description: 'Bilhete VIP vendido para o evento "Noite de Gala"',
          date: new Date(now.getTime() - 2 * 3600000).toISOString() // 2 horas atrás
        },
        {
          type: 'commission',
          title: 'Comissão paga',
          description: 'Comissão de €150 paga para equipe "Vendedores Elite"',
          date: new Date(now.getTime() - 5 * 3600000).toISOString() // 5 horas atrás
        }
      ]
      
      setActivities(mockActivities)
      console.log('Atividades simuladas carregadas com sucesso')
      
    } catch (e) {
      const errorInfo = {
        name: e?.name || 'Unknown error',
        message: e?.message || 'No error message available',
        stack: e?.stack || 'No stack trace available'
      }
      
      console.error('Erro ao carregar atividades:', errorInfo)
      setActivities([])
    }
  }
  
  const determineEventStatus = (dateString: string): 'upcoming' | 'past' | 'draft' => {
    const eventDate = new Date(dateString)
    const now = new Date()
    
    if (eventDate < now) {
      return 'past'
    }
    
    return 'upcoming'
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value)
  }
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Função para obter metadados do banco de dados
  const getDatabaseMetadata = async () => {
    try {
      console.log('Buscando metadados do banco de dados Supabase');
      
      // 1. Obter lista de tabelas
      const { data: tables, error: tablesError } = await supabase.rpc('list_tables');
      
      if (tablesError) {
        // Se a função RPC não existe, tentar uma abordagem alternativa
        console.log('Função RPC não existe, usando alternativa');
        
        // Essa consulta deve funcionar na maioria dos casos com Supabase
        const { data, error } = await supabase.from('_metadata_tables').select('*');
        
        if (error) {
          console.error('Erro ao buscar tabelas:', error);
          return { tables: [], error: error };
        }
        
        return { tables: data || [], error: null };
      }
      
      return { tables: tables || [], error: null };
    } catch (e) {
      console.error('Erro ao buscar metadados:', e);
      return { tables: [], error: e };
    }
  };
  
  // Loading state com skeletons melhorados
  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          
          <div className="flex flex-col sm:flex-row gap-2 opacity-50">
            <div className="w-[200px] h-10 bg-muted rounded animate-pulse"></div>
            <div className="w-[150px] h-10 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card key={item}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full"></div>
                </div>
                <div className="h-3 w-32 bg-muted animate-pulse rounded mt-2"></div>
                <div className="h-9 w-full bg-muted animate-pulse rounded mt-4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-4 h-16 items-center">
                    <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-40 bg-muted animate-pulse rounded mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-4 h-16 items-center">
                    <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-36 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-28 bg-muted animate-pulse rounded mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  if (!kpis && !loading) {
    // Se não estiver carregando e não tiver dados, mostrar dashboard vazio com cards zerados
    const emptyKpis = {
      totalEvents: 0,
      upcomingEvents: 0,
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
  
  // Filtrar eventos conforme o filtro selecionado
  const filteredEvents = events.filter(event => {
    if (eventFilter === 'all') return true
    return event.status === eventFilter
  }).filter(event => {
    if (!searchTerm) return true
    return event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           event.location.toLowerCase().includes(searchTerm.toLowerCase())
  })
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da sua organização
          </p>
        </div>
      </div>
      
      {/* Cards de KPIs simplificados - apenas eventos e equipes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-8">
        {/* Eventos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Eventos
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.upcomingEvents} eventos próximos
            </p>
          </CardContent>
        </Card>
        
        {/* Equipas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Equipas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.teamsCount}</div>
            <p className="text-xs text-muted-foreground">
              Gerenciar vendas e comissões
            </p>
          </CardContent>
        </Card>
      </div>
      
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
            {loadingTeams ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-4 h-16 items-center">
                    <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : teams.length === 0 ? (
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
                      <Badge variant="outline">Sem pendências</Badge>
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
        
        {/* Eventos com filtros rápidos */}
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
            
            {/* Filtros rápidos para eventos */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              <Button 
                variant={eventFilter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setEventFilter('all')}
              >
                Todos
              </Button>
              <Button 
                variant={eventFilter === 'active' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setEventFilter('active')}
              >
                Próximos
              </Button>
              <Button 
                variant={eventFilter === 'past' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setEventFilter('past')}
              >
                Passados
              </Button>
              <Button 
                variant={eventFilter === 'draft' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setEventFilter('draft')}
              >
                Rascunhos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-4 h-16 items-center">
                    <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filterEvents(events, eventFilter).length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Sem eventos {getFilterLabel(eventFilter)}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione eventos para sua organização.
                </p>
                <Link href="/app/organizador/eventos/novo">
                  <Button>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Criar Evento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filterEvents(events, eventFilter).map((event) => (
                  <Link key={event.id} href={`/app/organizador/eventos/${event.id}`}>
                    <div className="flex justify-between items-center border-b pb-3 last:border-0 hover:bg-muted/30 p-2 rounded cursor-pointer">
                    <div className="flex items-center">
                        <CalendarDays className="h-6 w-6 text-muted-foreground/60 mr-3" />
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.date)} • {event.location}
                        </p>
                      </div>
                    </div>
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {getStatusLabel(event.status)}
                      </Badge>
                    </div>
                    </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Atividades recentes */}
      <div className="mb-8">
      <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          <CardDescription>
              Últimas ações realizadas na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-6">
                <ArrowRight className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Nenhuma atividade recente</h3>
                <p className="text-sm text-muted-foreground">
                  As atividades aparecerão aqui conforme o uso da plataforma.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.type] || activityIcons.other
                  
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{activity.title}</h4>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Informações de Diagnóstico (apenas em caso de erro) */}
      {loadingError && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-destructive">Informações de Diagnóstico</CardTitle>
            <CardDescription>Informações para resolver problemas de estrutura do banco de dados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm text-muted-foreground">
              Foi detectado que a coluna <code>organization_id</code> não existe na tabela <code>teams</code>. 
              Para resolver este problema, você pode:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Adicionar a coluna <code>organization_id</code> à tabela <code>teams</code> no Supabase</li>
              <li>Criar a tabela <code>teams</code> com a estrutura correta se ela não existir</li>
              <li>Ou continuar usando o dashboard sem a funcionalidade de filtro por organização</li>
            </ol>
            
            <div className="border rounded p-3 mt-4">
              <h4 className="font-medium mb-2">Consulta SQL para adicionar a coluna:</h4>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                ALTER TABLE teams ADD COLUMN organization_id UUID REFERENCES organizations(id);
              </pre>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}

// Funções auxiliares para filtrar eventos e obter labels de status
const filterEvents = (events: Event[], filter: string) => {
  if (filter === 'all') return events
  return events.filter(event => event.status === filter)
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'upcoming': return 'Próximo'
    case 'past': return 'Passado'
    case 'draft': return 'Rascunho'
    case 'canceled': return 'Cancelado'
    default: return status
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'upcoming': return 'default'
    case 'past': return 'secondary'
    case 'draft': return 'outline'
    case 'canceled': return 'destructive'
    default: return 'outline'
  }
}

const getFilterLabel = (filter: string) => {
  switch (filter) {
    case 'active': return 'próximos'
    case 'past': return 'passados'
    case 'draft': return 'em rascunho'
    default: return ''
  }
} 