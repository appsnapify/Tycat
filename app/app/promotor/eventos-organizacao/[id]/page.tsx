"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Building, CalendarDays, MapPin, Clock, AlertCircle, Search, ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Interfaces
interface Organization {
  id: string
  name: string
  logotipo?: string | null
  description?: string | null
}

interface Event {
  id: string
  name: string
  description?: string | null
  date?: string | null
  time?: string | null
  end_date?: string | null
  end_time?: string | null
  location?: string | null
  status?: string
  is_featured?: boolean
  max_promoters?: number | null
  organization_id: string
}

// Componente EmptyState (utilitário)
const EmptyState = ({
  icon: Icon = AlertCircle,
  title = "Sem dados",
  description = "Não foram encontrados dados para mostrar",
  actionLabel = "",
  actionLink = "",
  onAction,
}: {
  icon?: React.ElementType,
  title?: string,
  description?: string,
  actionLabel?: string,
  actionLink?: string,
  onAction?: () => void,
}) => (
  <div className="text-center py-12 px-4">
    <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
    {actionLabel && (
      <Button
        variant="outline"
        onClick={onAction || (actionLink ? () => window.location.href = actionLink : undefined)}
      >
        {actionLabel}
      </Button>
    )}
  </div>
)

export default function OrganizationEventsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  // States para dados
  const [loading, setLoading] = useState(true)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userCanAccessEvents, setUserCanAccessEvents] = useState(false)
  
  // Obter o ID da organização dos parâmetros
  const organizationId = params.id as string

  // Effect para carregar dados
  useEffect(() => {
    if (user && organizationId) {
      loadOrganizationData()
    } else {
      // Se não tiver usuário após delay, definir loading como false
      const timer = setTimeout(() => {
        if (!user) {
          setLoading(false)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [user, organizationId])

  // Effect para filtrar eventos baseado na busca
  useEffect(() => {
    if (events.length > 0) {
      if (searchQuery.trim() === '') {
        setFilteredEvents(events)
      } else {
        const lowercaseQuery = searchQuery.toLowerCase()
        const filtered = events.filter(
          event => 
            event.name.toLowerCase().includes(lowercaseQuery) || 
            (event.description && event.description.toLowerCase().includes(lowercaseQuery)) ||
            (event.location && event.location.toLowerCase().includes(lowercaseQuery))
        )
        setFilteredEvents(filtered)
      }
    } else {
      setFilteredEvents([])
    }
  }, [searchQuery, events])

  // Função para carregar dados da organização e eventos
  const loadOrganizationData = async () => {
    setLoading(true)
    
    try {
      // Primeiro, verificar se o usuário tem acesso a esta organização
      const { data: teamAssociations, error: teamError } = await supabase
        .from('team_members')
        .select(`
          teams!inner (
            organization_id
          )
        `)
        .eq('user_id', user?.id)
      
      if (teamError) {
        console.error("Error verifying team association:", teamError)
        toast.error("Erro ao verificar permissões de acesso")
        setLoading(false)
        return
      }
      
      // Verificar se alguma das equipes pertence à organização solicitada
      const hasAccess = teamAssociations.some(
        ta => ta.teams && ta.teams[0]?.organization_id === organizationId
      )
      
      setUserCanAccessEvents(hasAccess)
      
      if (!hasAccess) {
        toast.error("Você não tem permissão para acessar eventos desta organização")
        // Ainda carregaremos os dados básicos da organização, mas não os eventos
      }
      
      // Carregar dados da organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, logotipo, description')
        .eq('id', organizationId)
        .single()
      
      if (orgError) {
        console.error("Error loading organization:", orgError)
        toast.error("Erro ao carregar dados da organização")
        setLoading(false)
        return
      }
      
      setOrganization(orgData)
      
      // Se tiver acesso, carregar eventos PUBLICADOS
      if (hasAccess) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, name, description, event_date, time, end_date, end_time, location, status, is_featured, max_promoters, organization_id')
          .eq('organization_id', organizationId)
          .eq('is_published', true)
          .gte('event_date', new Date().toISOString().split('T')[0]) // Eventos a partir de hoje
          .order('event_date', { ascending: true })
        
        if (eventsError) {
          console.error("Error loading events:", eventsError)
          toast.error("Erro ao carregar eventos")
        } else if (eventsData) {
          // Converter os eventos para o formato esperado pelo componente
          const formattedEvents: Event[] = eventsData.map(event => ({
            ...event,
            date: event.event_date // Mapear event_date para date
          }));
          setEvents(formattedEvents)
          setFilteredEvents(formattedEvents)
        } else {
          setEvents([])
          setFilteredEvents([])
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      toast.error("Ocorreu um erro inesperado")
    } finally {
      setLoading(false)
    }
  }
  
  // Helper para formatar data
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Data não definida'
    try {
      const options = { day: '2-digit', month: '2-digit', year: 'numeric' } as const
      return new Date(dateString).toLocaleDateString('pt-PT', options)
    } catch (e) {
      return 'Data inválida'
    }
  }
  
  // Helper para formatar status do evento
  const renderEventStatus = (status?: string) => {
    if (!status) return null
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Ativo</Badge>
      case 'draft':
        return <Badge variant="outline" className="text-muted-foreground">Rascunho</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Concluído</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }
  
  // Renderização do componente em loading
  if (loading) {
    return (
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-10 rounded-full mr-2" />
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Skeleton className="h-10 w-full max-w-lg mb-8" />
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }
  
  // Renderização quando a organização não foi encontrada
  if (!organization) {
    return (
      <div className="container py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <EmptyState 
          title="Organização não encontrada"
          description="Não conseguimos encontrar os dados da organização solicitada."
          actionLabel="Voltar ao Dashboard"
          onAction={() => router.push('/app/promotor/dashboard')}
        />
      </div>
    )
  }
  
  // Renderização principal
  return (
    <div className="container py-8 max-w-6xl">
      {/* Botão de voltar */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar ao Dashboard
      </Button>
      
      {/* Cabeçalho da Organização */}
      <div className="flex items-center mb-8">
        {organization.logotipo ? (
          <Avatar className="h-16 w-16 mr-4 rounded border">
            <AvatarImage src={organization.logotipo} alt={organization.name} />
            <AvatarFallback>
              <Building className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-16 w-16 mr-4 rounded border flex items-center justify-center bg-muted">
            <Building className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        <div>
          <h1 className="text-2xl font-bold">{organization.name}</h1>
          {organization.description && (
            <p className="text-muted-foreground mt-1">{organization.description}</p>
          )}
        </div>
      </div>
      
      {/* Seção de eventos */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold">
            Eventos Ativos
            {events.length > 0 && (
              <Badge variant="outline" className="ml-3 bg-primary/10">
                {events.length} {events.length === 1 ? 'Evento' : 'Eventos'}
              </Badge>
            )}
          </h2>
          
          {/* Barra de pesquisa */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar eventos..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {!userCanAccessEvents ? (
          <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="text-center text-yellow-800 dark:text-yellow-200">Acesso Restrito</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-yellow-700 dark:text-yellow-300">
              <p>
                Você não tem permissão para visualizar os eventos desta organização.<br />
                Por favor, entre em contato com o seu líder de equipe.
              </p>
            </CardContent>
          </Card>
        ) : filteredEvents.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map(event => (
              <Card 
                key={event.id} 
                className="overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    {renderEventStatus(event.status)}
                  </div>
                  {event.is_featured && (
                    <Badge className="w-fit mt-2 bg-primary/10 text-primary hover:bg-primary/20">
                      Destaque
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="flex-grow">
                  {event.description && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDate(event.date)}
                        {event.end_date && event.end_date !== event.date && 
                          ` até ${formatDate(event.end_date)}`
                        }
                      </span>
                    </div>
                    
                    {event.time && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">
                          {event.time}
                          {event.end_time && ` - ${event.end_time}`}
                        </span>
                      </div>
                    )}
                    
                    {event.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="border-t pt-4">
                  <Button 
                    className="w-full"
                    onClick={() => router.push(`/app/promotor/eventos/${event.id}`)}
                  >
                    Ver Detalhes
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum evento encontrado"
            description={
              searchQuery
                ? "Não encontramos eventos que correspondam aos seus critérios de busca."
                : "Não há eventos ativos registrados para esta organização no momento."
            }
            actionLabel={searchQuery ? "Limpar busca" : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        )}
      </div>
    </div>
  )
} 