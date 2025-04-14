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
    console.log("PromotorDashboard: Rendering Loading state.")
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">A carregar Dashboard...</h1>
        {/* Basic loading skeleton */}
        <div className="space-y-4">
             <div className="h-10 w-1/2 bg-muted/40 rounded animate-pulse"></div>
             <div className="h-8 w-1/3 bg-muted/40 rounded animate-pulse"></div>
             <div className="h-40 bg-muted/40 rounded animate-pulse mt-6"></div>
        </div>
      </div>
    )
  }
  
  // If not loading and promoterTeams is still empty, it implies a redirect should have happened
  // or there was an error before data processing. This state shouldn't normally be reached
  // unless the user isn't logged in and the initial check didn't catch it.
  if (promoterTeams.length === 0) {
      console.log("PromotorDashboard: Rendering - No teams loaded and not loading. Likely redirecting or error state.");
      // Avoid rendering the incorrect "no team associated" message directly here.
      // Render minimal content or potentially trigger a re-check/redirect if needed.
      return (
          <div className="container py-8">
             <h1 className="text-2xl font-bold mb-1">Dashboard de Promotor</h1>
             <p className="text-muted-foreground">Verificando associação da equipa...</p>
             {/* Optionally add a button to manually trigger redirect or retry */}
             <Button variant="outline" onClick={() => router.push('/app/promotor/equipes')} className="mt-4">
                 Ir para página de Equipas
             </Button>
          </div>
      );
  }

  console.log(`PromotorDashboard: Rendering Dashboard content. Teams: ${promoterTeams.length}, Org: ${!!organizationData}`);

  // --- Main Dashboard Render (Assumes promoterTeams.length > 0) ---
  return (
    <div className="flex flex-col space-y-6">
      {/* --- Page Header --- */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard de Promotor</h1>
        {/* Add any header actions here if needed */}
      </div>
      
      {/* --- Saudação Personalizada --- */}
      {user && (
        <h2 className="text-xl text-muted-foreground">
          Olá, {user.user_metadata?.first_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Promotor'}!
        </h2>
      )}
      
      {/* --- Welcome Message --- */}
      {/* Texto simplificado */} 
      <p className="text-muted-foreground">
        Bem-vindo ao seu painel de promotor
      </p>
      
      {/* --- Loading State --- */}
      {/* Rest of the component code remains unchanged */}

      {/* Scenario 1: One Team WITH Organization */}
      {promoterTeams.length === 1 && organizationData && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Org Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card 
              className="hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer group"
              onClick={navigateToOrgEvents}
            >
              <CardHeader className="pb-2">
                <CardTitle className="group-hover:text-primary transition-colors">Organização Associada</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Org Logo with animation */}
                <div className="flex items-center space-x-4">
                  {organizationData?.logotipo ? (
                    <Avatar className="h-16 w-16 rounded border group-hover:scale-105 transition-transform duration-300">
                      <AvatarImage src={organizationData.logotipo} alt={organizationData.name} />
                      <AvatarFallback>
                        <Building className="h-7 w-7 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-16 w-16 rounded border flex items-center justify-center bg-muted group-hover:bg-muted/80 group-hover:scale-105 transition-all duration-300">
                      <Building className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {organizationData.name}
                    </CardTitle>
                    <div className="flex items-center mt-2 space-x-2">
                      <CalendarHeart className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {activeEventsCount} {activeEventsCount === 1 ? 'Evento Ativo' : 'Eventos Ativos'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Call to action button */}
                <Button 
                  variant="outline" 
                  className="w-full mt-4 group-hover:bg-primary/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation(); // Previne duplo trigger do evento onClick do Card
                    navigateToOrgEvents();
                  }}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Ver Todos os Eventos
                </Button>
              </CardContent>
            </Card>
          </div>
                    
          {/* Right Column: Events */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Próximos Eventos da Organização</h2>
              {organizationEvents.length > 0 && (
                <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20 transition-colors">
                  {organizationEvents.length} {organizationEvents.length === 1 ? 'Evento' : 'Eventos'}
                </Badge>
              )}
            </div>
            
            {organizationEvents.length > 0 ? (
              <div className="space-y-4">
                {organizationEvents.map(event => (
                  <Card key={event.id} className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-md">{event.name}</CardTitle>
                      <CardDescription>
                        {formatDate(event.date)} {event.location ? `| ${event.location}` : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 pb-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary/80 hover:bg-primary/10 p-0"
                      >
                        <ChevronRight className="h-4 w-4 mr-1" />
                        Ver detalhes
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                router={router} // Pass router
                icon={CalendarDays}
                title="Sem eventos futuros"
                description="Não há eventos futuros da organização associados à sua equipa no momento."
              />
            )}
          </div>
        </div>
      )}

      {/* Scenario 2: One Team WITHOUT Organization */}
      {promoterTeams.length === 1 && !organizationData && (
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800 hover:shadow-lg transition-all duration-300">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 dark:text-yellow-400" />
            <CardTitle className="mt-4 text-yellow-800 dark:text-yellow-200">Equipa Sem Organização</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-yellow-700 dark:text-yellow-300">
            <p>
              A tua equipa ainda não tem organizações associadas.<br />
              Fala com o teu chefe de Equipa.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Scenario 3: Multiple Teams */}
      {promoterTeams.length > 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Selecione a Equipa</h2>
          <p className="text-muted-foreground mb-4">Você pertence a múltiplas equipas. Selecione uma para ver detalhes.</p>
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
                      // TODO: Implement team context switching logic
                      toast.info(`Seleção da equipa ${team.name} ainda não implementada.`);
                    }}
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Ver Dashboard da Equipa
            </Button>
          </CardFooter>
        </Card>
            ))}
      </div>
    </div>
      )}
    </div>
  )
} 