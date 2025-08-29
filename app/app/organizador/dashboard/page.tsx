"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useOrganization } from '@/app/contexts/organization-context'
import Link from 'next/link'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { DashboardTeams } from '@/components/dashboard/DashboardTeams'

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
import { formatDate, cn } from '@/lib/utils'

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
    fuchsia: "bg-fuchsia-100 text-fuchsia-800",
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
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    teamsCount: 0,
    promotersCount: 0
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [organizationCode, setOrganizationCode] = useState<string | null>(null)
  
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingError, setLoadingError] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  
  // Cache para verificações de tabela - evita consultas repetitivas
  const [tableCache] = useState(() => new Map<string, boolean>())
  
  const loadOrganizationAndData = useCallback(async () => {
    if (!user) return
    
    try {
      // Se currentOrganization já está disponível, usar ela
      if (currentOrganization) {
        const organizationId = currentOrganization.id
        
        // Carregar dados em paralelo com tratamento individual de erros
        try {
          loadKpis(organizationId)
        } catch (e) {
          console.error('Erro ao iniciar loadKpis:', e)
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
        
        setLoading(false)
        return
      }
      
      // Buscar organização do usuário (código de fallback mantido)
      const { data: orgDataArray, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'organizador'])
        .limit(1)

      if (orgError) {
        console.error('Erro ao buscar user_organizations:', orgError.message)
        if (orgError.code === 'PGRST116') {
           console.warn('A query retornou múltiplas linhas onde apenas uma era esperada. Verifique RLS ou dados duplicados.')
        }
        setLoading(false)
        setLoadingError(true)
        return
      }

      // Verificar se o array tem dados
      if (!orgDataArray || orgDataArray.length === 0) {
        setLoading(false)
        return
      }

      // Se chegou aqui, temos pelo menos uma organização
      const orgData = orgDataArray[0]
      
      // Buscar detalhes da organização
      const { data: orgDetails, error: detailsError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', orgData.organization_id)
        .single()
        
      if (detailsError) {
        console.error('Erro ao buscar detalhes da organização:', detailsError.message)
        setLoading(false)
        setLoadingError(true)
        return
      }
      
      if (!orgDetails) {
        setLoading(false)
        return
      }
      
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
      console.error('Erro ao carregar organização:', e)
      setLoading(false)
      setLoadingError(true)
    }
  }, [user, currentOrganization, supabase])

  useEffect(() => {
    if (user && currentOrganization) {
      loadOrganizationAndData()
  }
  }, [user, currentOrganization, loadOrganizationAndData])
  
  const generateOrganizationCode = (organizationId: string) => {
    const generatedOrgCode = `ORG-${organizationId.substring(0, 6).toUpperCase()}`
    setOrganizationCode(generatedOrgCode)
  }
  
  // Função de KPIs atualizada para buscar dados corretos
  const loadKpis = useCallback(async (organizationId: string) => {
    setLoadingKpis(true);
    
    try {
      if (!organizationId) {
        console.error('ID da organização não fornecido para KPIs');
        setKpis({
          totalEvents: 0,
          upcomingEvents: 0,
          teamsCount: 0,
          promotersCount: 0
        });
        setLoadingKpis(false);
        return;
      }
      
      // 1. Buscar eventos da organização para calcular corretamente
      let completedEvents = 0;
      let upcomingEvents = 0;
      
      const eventsTableExists = await checkTableExists('events');
      
      if (eventsTableExists) {
        try {
          // Buscar todos os eventos da organização
          const eventsResponse = await supabase
            .from('events')
            .select('id, date')
            .eq('organization_id', organizationId);
            
          if (eventsResponse.error) {
            console.error('Erro ao buscar eventos:', eventsResponse.error);
          } else {
            const events = eventsResponse.data || [];
            const now = new Date();
            
            // Separar eventos passados e futuros
            events.forEach(event => {
              const eventDate = new Date(event.date);
              if (eventDate < now) {
                completedEvents++;
              } else {
                upcomingEvents++;
              }
            });
          }
        } catch (eventError) {
          console.error('Exceção ao contar eventos:', eventError);
        }
      }
      
      // 2. Buscar contagem de equipes (já estava correto)
      let teamsCount = 0;
      const orgTeamsTableExists = await checkTableExists('organization_teams');
      
      if (orgTeamsTableExists) {
        try {
          const { count, error: countError } = await supabase
            .from('organization_teams')
            .select('team_id', { count: 'exact', head: true })
            .eq('organization_id', organizationId);
            
          if (countError) {
            console.error('Erro ao contar equipes vinculadas:', countError);
          } else {
            teamsCount = count ?? 0;
          }
        } catch (teamError) {
          console.error('Exceção ao contar equipes vinculadas:', teamError);
        }
      }
      
      // 3. Buscar contagem de promotores únicos nas equipes da organização
      let promotersCount = 0;
      const teamMembersTableExists = await checkTableExists('team_members');
      
      if (teamMembersTableExists && orgTeamsTableExists) {
        try {
          // CORRIGIDO: Primeiro buscar IDs das equipes da organização
          const { data: orgTeamIds, error: orgTeamsError } = await supabase
            .from('organization_teams')
            .select('team_id')
            .eq('organization_id', organizationId);
            
          if (orgTeamsError) {
            console.error('Erro ao buscar equipes da organização:', orgTeamsError);
          } else {
            const teamIdArray = orgTeamIds?.map(ot => ot.team_id) || [];
            
            if (teamIdArray.length > 0) {
              // Agora buscar promotores únicos nessas equipes
              const { count, error: promotersError } = await supabase
              .from('team_members')
                .select('user_id', { count: 'exact', head: true })
              .in('team_id', teamIdArray);
              
            if (promotersError) {
              console.error('Erro ao contar promotores:', promotersError);
            } else {
                promotersCount = count ?? 0;
              }
            }
          }
        } catch (promotersError) {
          console.error('Exceção ao contar promotores:', promotersError);
        }
      }
      
      // Atualizar estados com os dados obtidos
      setKpis({
        totalEvents: completedEvents,
        upcomingEvents: upcomingEvents,
        teamsCount: teamsCount,
        promotersCount: promotersCount
      });
      
    } catch (e) {
      console.error('Erro geral ao carregar KPIs:', e);
      setLoadingError(true);
      
      // Usar valores zerados em caso de erro
      setKpis({
        totalEvents: 0,
        upcomingEvents: 0,
        teamsCount: 0,
        promotersCount: 0
      });
    } finally {
      setLoadingKpis(false);
      setLoading(false);
    }
  }, [supabase]);
  
  // Função para carregar equipes com tratamento robusto de erros
  const loadTeams = useCallback(async (organizationId: string) => {
    setLoadingTeams(true);
    
    try {
      if (!organizationId) {
        console.error('ID da organização não fornecido para equipes');
        setTeams([]);
        setLoadingTeams(false);
        return;
      }
      
      // Verificar se a tabela teams existe
      const tableExists = await checkTableExists('teams');
      
      if (!tableExists) {
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
  }, [supabase]);
  
  const loadActivities = useCallback(async (organizationId: string) => {
    try {
      if (!organizationId) {
        setActivities(getMockActivities())
        return
      }
      
      let realActivities: Activity[] = []
      
      // Tentar buscar atividades reais do banco de dados diretamente
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('type, title, description, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (activityError) {
        if (activityError.code !== '42P01') {
          console.error('Erro ao buscar activity_logs:', activityError);
        }
        setActivities(getMockActivities())
        return
      }
      
      // Se não houve erro e activityData existe (pode ser um array vazio)
      if (activityData) {
        if (activityData.length > 0) {
          realActivities = activityData.map(act => ({
            type: act.type || 'other',
            title: act.title || 'Atividade',
            description: act.description || 'Sem descrição',
            date: act.created_at || new Date().toISOString()
          }))
          setActivities(realActivities)
        } else {
          setActivities(getMockActivities())
        }
      } else {
        setActivities(getMockActivities())
      }
      
    } catch (e) {
      console.error('Erro ao carregar atividades:', e)
      setActivities(getMockActivities())
    }
  }, [supabase])
  
  // Função auxiliar para obter mock de atividades, para evitar repetição
  const getMockActivities = (): Activity[] => {
    const now = new Date()
    return [
      {
        type: 'guest',
        title: 'Novo convidado registrado',
        description: 'João Silva registrou-se para o evento "Festival de Verão"',
        date: new Date(now.getTime() - 30 * 60000).toISOString()
      },
      {
        type: 'ticket',
        title: 'Bilhete vendido',
        description: 'Bilhete VIP vendido para o evento "Noite de Gala"',
        date: new Date(now.getTime() - 2 * 3600000).toISOString()
      },
      {
        type: 'commission',
        title: 'Comissão paga',
        description: 'Comissão de €150 paga para equipe "Vendedores Elite"',
        date: new Date(now.getTime() - 5 * 3600000).toISOString()
      }
    ];
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
      // 1. Obter lista de tabelas
      const { data: tables, error: tablesError } = await supabase.rpc('list_tables');
      
      if (tablesError) {
        // Se a função RPC não existe, tentar uma abordagem alternativa
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

  // Verificação de existência de tabelas com cache para performance
  const checkTableExists = useCallback(async (tableName) => {
    // Verificar cache primeiro
    if (tableCache.has(tableName)) {
      return tableCache.get(tableName);
    }

    try {
      // Usamos uma consulta simples para verificar se a tabela existe
      const response = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      let exists = true;
      
      // Se não houve erro, a tabela existe
      if (!response.error) {
        exists = true;
      }
      // Se o código de erro for 42P01, a tabela não existe
      else if (response.error.code === '42P01') {
        exists = false;
      }
      // Para outros erros, assumimos que a tabela existe mas há um problema de permissão
      else {
        exists = true;
      }

      // Armazenar no cache
      tableCache.set(tableName, exists);
      return exists;
    } catch (e) {
      console.error(`Erro ao verificar se a tabela ${tableName} existe:`, e);
      // Em caso de erro, não cachear e retornar false
      return false;
    }
  }, [supabase, tableCache]);

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
  
  // Renderização do novo dashboard com o componente DashboardContent
    return (
    <DashboardContent
      kpis={kpis}
      teams={teams}
      loadingKpis={loadingKpis}
      loadingTeams={loadingTeams}
      loadingError={loadingError} 
      onRefresh={loadOrganizationAndData}
    />
  )
} 