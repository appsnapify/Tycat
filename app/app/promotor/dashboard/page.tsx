"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CalendarDays, AlertCircle, ChevronRight, Building, CalendarHeart } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

// Interfaces (mantendo as definições anteriores)
interface PromoterTeam {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  role?: string;
  isPartial?: boolean;
}

interface Organization {
  id: string;
  name: string;
  logotipo?: string | null; // Nome correto do campo na tabela organizations
}

interface EventSummary {
  id: string;
  name: string;
  date: string;
  location?: string | null;
}

// Componente EmptyState (mantido)
const EmptyState = ({
  icon: Icon = AlertCircle,
  title = "Sem dados",
  description = "Não foram encontrados dados para mostrar",
  actionLabel = "",
  actionLink = "",
  onAction,
  router // Pass router for navigation
}: {
  icon?: React.ElementType,
  title?: string,
  description?: string,
  actionLabel?: string,
  actionLink?: string,
  onAction?: () => void,
  router: ReturnType<typeof useRouter> // Ensure router type
}) => (
  <div className="text-center py-8">
    <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <p className="text-muted-foreground mb-4">{description}</p>
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

export default function PromotorDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  // State variables
  const [loading, setLoading] = useState(true)
  const [promoterTeams, setPromoterTeams] = useState<PromoterTeam[]>([])
  const [organizationData, setOrganizationData] = useState<Organization | null>(null)
  const [organizationEvents, setOrganizationEvents] = useState<EventSummary[]>([]) // Placeholder for future use
  const [activeEventsCount, setActiveEventsCount] = useState(0) // Contador para eventos ativos
  const [userStats, setUserStats] = useState({ totalSales: 0, eventsJoined: 0 }) // Simplified stats

  // --- Data Loading Effect ---
  useEffect(() => {
    console.log("PromotorDashboard: useEffect triggered.")
    if (user) {
      console.log("PromotorDashboard: User found, calling loadDashboardData.")
      loadDashboardData()
    } else {
      // If user is null after initial load, maybe set loading false or handle appropriately
      // Adding a small delay in case user object is loading async
      console.log("PromotorDashboard: User not found yet, waiting...")
      const timer = setTimeout(() => {
         // Re-check user after delay, only set loading false if still no user
         if (!user) { 
            console.log("PromotorDashboard: User still not found after delay, setting loading false (may redirect later if needed).")
        setLoading(false)
            // Consider redirecting here too if auth state is definitely 'unauthenticated'
            // However, the primary check is after the RPC call.
    }
      }, 1500); // Increased delay slightly
      return () => clearTimeout(timer);
    }
  }, [user]) // Dependency on user object
  
  // --- Data Loading Function ---
  const loadDashboardData = async () => {
    console.log("PromotorDashboard: loadDashboardData started.")
    setLoading(true)
    // Reset states at the beginning
    setPromoterTeams([])
    setOrganizationData(null)
    setOrganizationEvents([])
    setActiveEventsCount(0)
    setUserStats({ totalSales: 0, eventsJoined: 0 })

    if (!user?.id) {
      console.error("PromotorDashboard: loadDashboardData called without user ID. Aborting.")
      toast.error("Erro de autenticação. Tente recarregar a página.")
        setLoading(false)
      // Potentially redirect to login here if desired
        return
      }
      
    const userId = user.id
    console.log(`PromotorDashboard: Calling RPC get_promoter_dashboard_data for user: ${userId}`)

    try {
      const { data: dashboardData, error: rpcError } = await supabase.rpc(
        'get_promoter_dashboard_data',
        { promoter_user_id: userId }
      )

      if (rpcError) {
        console.error("PromotorDashboard: Error calling RPC:", rpcError)
        toast.error(`Erro ao carregar dados: ${rpcError.message}`)
        setLoading(false) // Stop loading on error
        return // Stop processing
      }

      console.log("PromotorDashboard: RPC successful. Data received:", dashboardData)

      if (!dashboardData?.team_association?.team_id) {
        console.log("PromotorDashboard: No team association found in RPC data. Redirecting...")
        router.push('/app/promotor/equipes') // Redirect
        // No need to setLoading(false) here, the component will unmount.
        return // Stop processing immediately after initiating redirect
      }

      console.log("PromotorDashboard: Team association found. Processing data...")

      const teamAssoc = dashboardData.team_association
      const teamDetails = dashboardData.team_details
      const orgDetails = dashboardData.organization_details
      const metrics = dashboardData.metrics

      // Usar os dados da equipe que já vêm da RPC
      if (teamDetails) {
        const finalTeamData: PromoterTeam = {
          id: teamAssoc.team_id,
          name: teamDetails.name || `Equipa (${teamAssoc.team_id.substring(0, 6)}...)`,
          description: teamDetails.description,
          logo_url: teamDetails.logo_url,
          role: teamAssoc.role || 'promotor',
          isPartial: false
        };
        
        setPromoterTeams([finalTeamData]);
        console.log("PromotorDashboard: promoterTeams state set (from RPC data):", [finalTeamData]);
      } else {
        console.warn("PromotorDashboard: Dados da equipa não encontrados na RPC");
        const fallbackTeamData: PromoterTeam = {
          id: teamAssoc.team_id,
          name: `Equipa (${teamAssoc.team_id.substring(0, 6)}...)`,
          role: teamAssoc.role || 'promotor',
          isPartial: true,
          description: "Detalhes não disponíveis."
        };
        setPromoterTeams([fallbackTeamData]);
        console.log("PromotorDashboard: promoterTeams state set with fallback data");
      }

      // Set Organization State
      if (orgDetails?.id) {
        const org: Organization = {
            id: orgDetails.id,
            name: orgDetails.name || 'Organização s/ Nome',
            logotipo: orgDetails.logotipo  // Nome correto do campo
        }
        setOrganizationData(org)
        console.log("PromotorDashboard: organizationData state set:", org)
        
        // Buscar eventos reais da organização
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, name, event_date:date, location')
          .eq('organization_id', orgDetails.id)
          .gte('event_date', new Date().toISOString().split('T')[0]) // Eventos a partir de hoje
          .order('event_date', { ascending: true })
          .limit(5); // Limitando aos próximos 5 eventos

        if (eventsError) {
          console.error("PromotorDashboard: Error loading events:", eventsError);
        } else if (events && events.length > 0) {
          const formattedEvents: EventSummary[] = events.map(event => ({
            id: event.id,
            name: event.name,
            date: event.event_date,
            location: event.location
          }));
          
          setOrganizationEvents(formattedEvents);
          setActiveEventsCount(formattedEvents.length);
          console.log("PromotorDashboard: organizationEvents loaded:", formattedEvents.length);
        } else {
          console.log("PromotorDashboard: No events found for organization");
          setOrganizationEvents([]);
          setActiveEventsCount(0);
        }
      } else {
        setOrganizationData(null)
        console.log("PromotorDashboard: No organization details found in RPC.")
      }

      // Set Metrics State
      if (metrics) {
         const stats = {
             totalSales: metrics.totalSales || 0,
             eventsJoined: metrics.eventsJoined || 0,
         }
         setUserStats(stats)
         console.log("PromotorDashboard: userStats state set:", stats)
      }

    } catch (error: any) {
      console.error("PromotorDashboard: General error in loadDashboardData:", error)
      toast.error(error.message || "Ocorreu um erro inesperado ao carregar o dashboard.")
      // Ensure loading is set to false even if a non-RPC error occurs
       setLoading(false)
    } finally {
      // Ensure loading is always set to false eventually, unless redirecting
      // Check if redirect happened before setting loading state
      // This finally block might run even after a redirect is initiated, but before it completes.
      // It's generally safe, but checking if the component is still mounted could be more robust if needed.
      console.log("PromotorDashboard: loadDashboardData finished.")
      setLoading(false);
    }
  }

  // --- Helper Functions ---
  const formatDate = (dateString: string | null | undefined): string => {
     if (!dateString) return 'Data Indisponível';
    try {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Data Inválida';
    }
  }

  // Função para navegar para a página de eventos da organização
  const navigateToOrgEvents = () => {
    if (organizationData?.id) {
      router.push(`/app/promotor/eventos-organizacao/${organizationData.id}`);
    } else {
      toast.error("Não foi possível acessar os eventos da organização.");
    }
  };

  // --- Render Logic ---
  if (loading) {
    // Enhanced loading state with multiple skeletons
    return (
      <div className="container mx-auto p-4 md:p-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }
  
  // Handle case where user might somehow not be logged in despite checks
  if (!user) {
      return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <p>Erro: Utilizador não autenticado. Por favor, faça login.</p>
        {/* Optionally add a login button */}
          </div>
      );
  }

  // Handle the case where promoter is not associated with any team after loading
  // This should ideally be caught by the redirect in loadDashboardData, but as a fallback:
  if (promoterTeams.length === 0) {
     return (
       <div className="container mx-auto p-4 md:p-8">
         <EmptyState
            icon={Users}
            title="Nenhuma Equipa Encontrada"
            description="Parece que você não está associado a nenhuma equipa ativa."
            actionLabel="Gerir Equipas"
            actionLink="/app/promotor/equipes"
            router={router}
         />
       </div>
     )
  }

  // Main dashboard content
  const currentTeam = promoterTeams[0]; // Assuming only one team association is primary for the dashboard view

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard do Promotor</h1>
         {/* Can add action buttons here if needed later */}
      </div>
      
      {/* Grid for Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipa Atual</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold truncate">{currentTeam.name}</div>
            <p className="text-xs text-muted-foreground">{currentTeam.role === 'leader' ? 'Líder da Equipa' : 'Membro Promotor'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organização Associada</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
             {organizationData ? (
                 <div className="text-lg sm:text-xl font-bold truncate">{organizationData.name}</div>
             ) : (
                 <div className="text-lg sm:text-xl font-bold text-muted-foreground">N/A</div>
             )}
            <p className="text-xs text-muted-foreground">Entidade promotora dos eventos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Ativos</CardTitle>
             <CalendarHeart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-lg sm:text-xl font-bold">{activeEventsCount}</div>
            <p className="text-xs text-muted-foreground">Eventos futuros disponíveis</p>
              </CardContent>
            </Card>
         {/* Add more metric cards here if needed (e.g., totalSales, eventsJoined from userStats) */}
          </div>
                    
      {/* Main Content Area - Using Grid for two columns on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column / Main Area (takes 2 cols on lg screens) */}
        <div className="lg:col-span-2 space-y-6">
            {/* Team Details Card */}
          <Card>
                    <CardHeader>
               <div className="flex items-center gap-4">
                 <Avatar className="h-12 w-12">
                   <AvatarImage src={currentTeam.logo_url || undefined} alt={currentTeam.name} />
                   <AvatarFallback>{currentTeam.name?.charAt(0).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <div>
                   <CardTitle className="text-xl md:text-2xl">{currentTeam.name}</CardTitle>
                   <CardDescription>{currentTeam.description || "Detalhes da equipa."}</CardDescription>
                 </div>
               </div>
                    </CardHeader>
             <CardContent>
                {/* Add more team details or actions here if needed */}
                 {currentTeam.isPartial && (
                    <p className="text-sm text-destructive">Informações da equipa podem estar incompletas.</p>
                 )}
             </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => router.push('/app/promotor/equipes')}>
                Ver Minhas Equipas
                      </Button>
                    </CardFooter>
                  </Card>

           {/* Upcoming Events Card */}
            <Card>
             <CardHeader>
                 <CardTitle className="text-lg md:text-xl">Próximos Eventos da Organização</CardTitle>
                 <CardDescription>Eventos organizados por {organizationData?.name || 'esta organização'}.</CardDescription>
             </CardHeader>
             <CardContent>
                 {organizationEvents.length > 0 ? (
                  <ul className="space-y-4">
                     {organizationEvents.map(event => (
                       <li key={event.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md hover:bg-muted/50">
                         <div>
                             <p className="font-semibold">{event.name}</p>
                             <p className="text-sm text-muted-foreground">
                                 {formatDate(event.date)} {event.location ? ` - ${event.location}` : ''}
                             </p>
                         </div>
                         {/* Add action button for event if needed */}
                         <Button variant="ghost" size="sm" className="mt-2 sm:mt-0" onClick={() => router.push(`/evento/${event.id}`)}> {/* Example Link */}
                           Detalhes <ChevronRight className="h-4 w-4 ml-1" />
                         </Button>
                       </li>
                     ))}
                   </ul>
            ) : (
              <EmptyState
                icon={CalendarDays}
                         description={organizationData ? `Nenhum evento futuro encontrado para ${organizationData.name}.` : "Nenhum evento futuro encontrado."}
                         router={router}
                         actionLabel={organizationData ? "Ver Organização" : ""}
                         actionLink={organizationData ? `/organizacao/${organizationData.id}` : ""} // Needs slug/id logic
                     />
                 )}
             </CardContent>
             {organizationData && (
                  <CardFooter className="flex justify-end">
                     <Button variant="outline" size="sm" onClick={navigateToOrgEvents}>
                       Ver Todos Eventos da Organização
                     </Button>
                 </CardFooter>
             )}
           </Card>
        </div>

        {/* Right Column / Sidebar Area (takes 1 col on lg screens) */}
        <div className="space-y-6">
            {/* Placeholder for Promoter Stats Card */}
            <Card>
             <CardHeader>
               <CardTitle>Minhas Estatísticas</CardTitle>
               <CardDescription>Resumo do seu desempenho.</CardDescription>
          </CardHeader>
             <CardContent className="space-y-2">
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Vendas Totais</span>
                   <span className="font-semibold">{userStats.totalSales}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Eventos Participados</span>
                   <span className="font-semibold">{userStats.eventsJoined}</span>
                </div>
                 {/* Add more stats as needed */}
          </CardContent>
             {/* Optional Footer */}
        </Card>
           
           {/* Placeholder for Quick Actions or Links */}
           <Card>
          <CardHeader>
               <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
             <CardContent>
                <Button className="w-full mb-2" onClick={() => router.push('/app/eventos')}> {/* Adjust link */}
                  Procurar Eventos
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/app/promotor/equipes')}>
                  Gerir Equipas
            </Button>
                {/* Add more relevant actions */}
             </CardContent>
        </Card>
        </div>

      </div>
    </div>
  )
} 