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
  Building,
  CalendarDays,
  Calendar,
  QrCode,
  UserPlus,
  CheckCircle,
  Clock,
  ChevronRight,
  ClipboardList,
  BadgePercent,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// Importar componentes do dashboard
import { MetricCard } from '@/components/dashboard/metric-card'
import { ActivityFeed, ActivityItem } from '@/components/dashboard/activity-feed'
import { TeamCodeDisplay } from '@/components/dashboard/team-code-display'

// *** NOVA Interface para Equipas do Promotor ***
interface PromoterTeam {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  role?: string; // Papel do promotor nesta equipa
  isPartial?: boolean; // Indica se os dados são completos ou placeholder
  member_count?: number; // Opcional: Contagem de membros
}

// *** NOVA Interface para Organização ***
interface Organization {
  id: string;
  name: string;
  // Adicionar outros campos necessários
}

// *** NOVA Interface para Evento ***
interface EventSummary {
  id: string;
  name: string;
  date: string;
  location?: string | null;
  organizations?: { name: string } | null; // Organização associada
}

export default function PromotorDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [promoterTeams, setPromoterTeams] = useState<PromoterTeam[]>([]) // Usado se >1 equipa ou sem org
  const [organizationData, setOrganizationData] = useState<Organization | null>(null) // Usado se 1 equipa com org
  const [organizationEvents, setOrganizationEvents] = useState<EventSummary[]>([]) // Eventos da org para a equipa
  
  // Manter Stats (exceto comissões)
  const [userStats, setUserStats] = useState({
    totalSales: 0,
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
    setPromoterTeams([]) // Reset states
    setOrganizationData(null)
    setOrganizationEvents([])
    setUserStats({ totalSales: 0, eventsJoined: 0, tasksDone: 0 }) // Reset stats
    try {
      console.log("PromotorDashboard: Carregando dados (Direct Query Mode)...") // Mudança no log
      const userId = user?.id;
      if (!userId) {
          console.error("Utilizador não autenticado.");
          toast.error("Utilizador não autenticado.");
          setLoading(false);
          return;
      }

      // 1. Buscar a primeira associação em team_members
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error('PromotorDashboard: Erro ao carregar associação de equipa:', memberError);
        toast.error("Erro ao verificar sua equipa.");
      }

      // 2. Se encontrou uma associação, buscar detalhes da equipa e ID da organização
      let teamId: string | null = null;
      let teamDetailsForDisplay: PromoterTeam | null = null;
      let orgIdToLoad: string | null = null;

      if (memberData) {
          teamId = memberData.team_id;
          const userRoleInTeam = memberData.role || 'promotor';
          console.log(`PromotorDashboard: Encontrado na equipa ${teamId} com papel ${userRoleInTeam}`);

          // Query à tabela teams (RLS 'Permitir leitura aos membros da equipa' deve permitir)
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, name, description, logo_url, organization_id')
            .eq('id', teamId)
            .single();

          if (teamError) {
              console.error(`PromotorDashboard: Erro ao buscar detalhes da equipa ${teamId} (RLS?):`, teamError);
              toast.error("Erro ao carregar detalhes da sua equipa.");
              teamDetailsForDisplay = { id: teamId, name: `Equipa (${teamId.substring(0,6)}...)`, role: userRoleInTeam, isPartial: true };
          } else if (teamData) {
              orgIdToLoad = teamData.organization_id; // Guardar ID da organização
              teamDetailsForDisplay = {
                  id: teamData.id,
                  name: teamData.name || `Equipa s/ Nome (${teamId.substring(0,6)}...)`,
                  description: teamData.description,
                  logo_url: teamData.logo_url,
                  role: userRoleInTeam,
                  isPartial: false
              };
              console.log(`PromotorDashboard: Equipa ${teamData.name} pertence à organização ID: ${orgIdToLoad}`);
          }
      } else {
          console.log("PromotorDashboard: Nenhuma associação de equipa encontrada.");
          // A UI deve mostrar estado vazio ou mensagem, não necessariamente erro
      }

      // 3. Se temos um ID de organização, FAZER QUERY SEPARADA (RLS 'Allow read for team members...' deve permitir)
      if (orgIdToLoad) {
          console.log(`PromotorDashboard: Buscando organização ${orgIdToLoad} separadamente...`);
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, logotipo') // Apenas o necessário
            .eq('id', orgIdToLoad)
            .single(); // Espera-se uma organização

          if (orgError) {
              console.error(`PromotorDashboard: Erro ao buscar organização ${orgIdToLoad} (RLS?):`, orgError);
              toast.warning("Não foi possível carregar os detalhes da organização associada.");
          } else if (orgData) {
              console.log("PromotorDashboard: Detalhes da organização carregados:", orgData);
              setOrganizationData(orgData as Organization); // Define o estado!
          } else {
              console.warn(`PromotorDashboard: Organização ${orgIdToLoad} não encontrada (Dados inconsistentes?).`);
          }
      } else {
          if (teamId) {
              console.log(`PromotorDashboard: Equipa ${teamId} não está associada a uma organização.`);
          }
      }

      // 4. Guardar detalhes da equipa no estado (se encontrados)
      if (teamDetailsForDisplay) {
          setPromoterTeams([teamDetailsForDisplay]);
      }


      // 5. Carregar outras métricas (AGORA USANDO QUERIES DIRETAS E RLS SIMPLES)
      console.log("PromotorDashboard: Carregando métricas adicionais (Direct Query)...");
      // Vendas (Requer RLS `auth.uid() = user_id` em 'sales')
      try {
           const { data: salesData, error: salesError } = await supabase.from('sales').select('quantity').eq('user_id', userId);
           if (salesError && salesError.code !== '42P01') { // Ignorar 'relation does not exist'
               console.warn("PromotorDashboard: Erro vendas (RLS?):", salesError);
           } else if (salesData) {
               const totalSales = salesData.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
               setUserStats(prev => ({ ...prev, totalSales }));
           }
      } catch (err) { console.error("PromotorDashboard: Erro crítico vendas:", err); }

      // Eventos Participados (Requer RLS `auth.uid() = user_id` em 'event_participants' OU nome correto da tabela)
      // ASSUMINDO NOME CORRETO DA TABELA DE CHECK-INS / PARTICIPANTES
      const participantsTable = 'guests'; // <-- **AJUSTAR SE O NOME FOR DIFERENTE**
       try {
           const { count: joinedCount, error: joinedError } = await supabase
               .from(participantsTable)
               .select('*', { count: 'exact', head: true })
               .eq('promoter_id', userId); // <-- **AJUSTAR SE A COLUNA FOR DIFERENTE** (ex: checked_in_by, user_id?)

           if (joinedError && joinedError.code !== '42P01') { // Ignorar 'relation does not exist'
               console.warn(`PromotorDashboard: Erro eventos participados na tabela ${participantsTable} (RLS ou Coluna?):`, joinedError);
           } else if (joinedCount !== null) {
               setUserStats(prev => ({ ...prev, eventsJoined: joinedCount }));
           }
       } catch (err) { console.error("PromotorDashboard: Erro crítico eventos participados:", err); }

       // Outras métricas (tasksDone, etc.) podem ser adicionadas aqui


    } catch (error: any) {
      console.error("PromotorDashboard: Erro GERAL ao carregar dashboard:", error)
      toast.error(error.message || "Ocorreu um erro inesperado.")
    } finally {
      setLoading(false)
      console.log("PromotorDashboard: Carregamento finalizado (Direct Query Mode).")
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
    <>
      {/* Cabeçalho e Métricas - Sempre visíveis (exceto em loading) */}
      <div className="mb-6"> 
          <h1 className="text-2xl font-bold mb-1">Dashboard de Promotor</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de promotor
          </p>
      </div>
      
      {/* --- Conteúdo Principal Condicional --- */}

      {/* CENÁRIO 4: Nenhuma Equipa */}
      { promoterTeams.length === 0 && !organizationData && (
              <EmptyState
                icon={Users}
            title="Nenhuma equipa associada"
            description="Você ainda não está associado a nenhuma equipa."
            actionLabel="Procurar Equipas"
            onAction={() => router.push('/app/promotor/equipes')} 
          />
      )}

      {/* CENÁRIO 1: Uma Equipa COM Organização */}
      { promoterTeams.length === 1 && organizationData && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Coluna Esquerda: Card da Organização */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                 <CardHeader>
                   <CardTitle>Organização Associada</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-lg font-medium">{organizationData.name}</p>
          </CardContent>
        </Card>
            </div>

            {/* Coluna Direita: Próximos Eventos Permitidos */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Próximos Eventos da Organização</h2>
              {organizationEvents.length > 0 ? (
                <div className="space-y-4">
                  {organizationEvents.map(event => (
                    <Card key={event.id}>
                      <CardHeader>
                        <CardTitle className="text-md">{event.name}</CardTitle>
                        <CardDescription>
                           {formatDate(event.date)} {event.location ? `| ${event.location}` : ''}
                        </CardDescription>
          </CardHeader>
                    </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                    icon={CalendarDays}
                    title="Sem eventos futuros"
                    description="Não há eventos futuros agendados ou permitidos para a sua equipa nesta organização."
                  />
              )}
            </div>
          </div>
      )}

       {/* CENÁRIO 2: Uma Equipa SEM Organização - Mensagem Ajustada */}
      { promoterTeams.length === 1 && !organizationData && (
         <Card className="border-dashed bg-muted/50">
           <CardContent className="flex flex-col items-center justify-center py-10">
             <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-medium mb-2">Equipa Sem Organização</h3>
             <p className="text-muted-foreground text-center mb-6 max-w-md">
               A equipa <span className="font-medium">{promoterTeams[0]?.name}</span> ainda não tem nenhuma organização activa. 
               Contacte o líder da sua equipa ou o suporte.
             </p>
          </CardContent>
         </Card>
      )}

      {/* CENÁRIO 3: Múltiplas Equipas */}
      { promoterTeams.length > 1 && (
          <div>
            {/* Mostrar a lista de equipas para seleção */}
            <h2 className="text-xl font-semibold mb-4">Selecione a Equipa</h2>
            <p className="text-muted-foreground mb-4">Você pertence a múltiplas equipas. Selecione uma para ver detalhes ou eventos.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promoterTeams.map((team) => (
                <Card key={team.id} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    {team.description && (
                      <CardDescription>{team.description}</CardDescription>
                    )}
                    {team.isPartial && (
                      <Badge variant="outline" className="w-fit mt-2">Detalhes Limitados</Badge>
                    )}
                  </CardHeader>
                  <CardFooter className="border-t p-4">
            <Button 
              variant="outline" 
              className="w-full"
                      onClick={() => {
                        console.log("Selecionou equipa:", team.id); 
                        // TO DO: Implementar lógica de seleção/contexto da equipa
                        toast.info(`Seleção da equipa ${team.id.substring(0,6)}... ainda não implementada.`);
                      }}
                    >
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Selecionar Equipa
            </Button>
          </CardFooter>
        </Card>
              ))}
            </div>
              </div>
      )}

    </>
  )
} 