'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Plus,
  Edit,
  Copy,
  Scan,
  Pencil,
  UserCheck,
  RefreshCw,
  Link as LinkIcon,
  ExternalLink,
  ListPlus
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { useOrganization } from '@/app/contexts/organization-context'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import NextLink from 'next/link'

// Interface para os eventos
interface Event {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  end_date?: string
  end_time?: string
  location?: string
  organization_id: string
  is_active: boolean
  type?: string
  flyer_url?: string
  status?: 'scheduled' | 'active' | 'completed' // Novo campo de status
  // Outros campos que podem existir
}

// Verificar se um evento já ocorreu com base no status ou nas datas
function isEventPast(event: Event): boolean {
  // Se o evento tiver status, usar ele como primeira verificação
  if (event.status === 'completed') {
    return true;
  }
  
  // Se não tiver status, verificar pela data (fallback)
  if (!event.date) return false;
  
  // Criar data do evento com horário 23:59:59 (ou usar end_date se disponível)
  let eventEndDate: Date;
  
  if (event.end_date) {
    eventEndDate = new Date(event.end_date);
    if (event.end_time) {
      const [hours, minutes] = event.end_time.split(':').map(Number);
      eventEndDate.setHours(hours, minutes);
    } else {
      eventEndDate.setHours(23, 59, 59);
    }
  } else {
    eventEndDate = new Date(event.date);
    eventEndDate.setHours(23, 59, 59);
  }
  
  // Adicionar 8 horas de margem para eventos noturnos
  eventEndDate.setHours(eventEndDate.getHours() + 8);
  
  const today = new Date();
  return eventEndDate < today;
}

// Função para duplicar um evento
async function duplicateEvent(event: Event) {
  try {
    // Clonar o objeto do evento e modificar os campos necessários
    const newEvent = {
      ...event,
      title: `${event.title} - Cópia`,
      id: undefined, // Remover ID para criar um novo registro
      created_at: undefined, // Limpar campos de data de criação
      updated_at: undefined
    };
    
    // Remover o campo status se ele ainda não existir no banco de dados
    // Este campo será adicionado quando o SQL for executado no Supabase
    if ('status' in newEvent) {
      delete newEvent.status;
    }
    
    console.log('Duplicando evento:', newEvent);
    
    // Inserir o novo evento no banco de dados
    const { data, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao duplicar evento:', error);
      throw new Error(error.message);
    }
    
    console.log('Evento duplicado com sucesso:', data);
    return data;
  } catch (err) {
    console.error('Erro ao duplicar evento:', err);
    throw err;
  }
}

export default function EventosPage() {
  const [eventList, setEventList] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusTab, setStatusTab] = useState('all') // Novo estado para tabs de status
  const { toast } = useToast()
  const [refreshKey, setRefreshKey] = useState(0) // Estado para forçar refresh
  
  // Função para forçar atualização da página
  const forceRefresh = () => {
    console.log("Forçando atualização da página de eventos");
    setRefreshKey(prev => prev + 1);
  };
  
  // Chamar API para atualizar status dos eventos
  const updateEventStatus = async () => {
    try {
      setLoading(true);
      
      // Simular chamada à API de atualização de status
      // Em produção, substituir por fetch('/api/cron/update-event-status')
      
      // Código simplificado: atualizar status baseado em datas
      const updatedEvents = eventList.map(event => {
        const today = new Date();
        const eventDate = new Date(event.date);
        
        // Definir o status baseado na comparação de datas
        let newStatus: 'scheduled' | 'active' | 'completed';
        
        if (isEventPast(event)) {
          newStatus = 'completed'; // Evento já ocorreu
        } else if (today.toDateString() === eventDate.toDateString()) {
          newStatus = 'active'; // Mesmo dia = em andamento
        } else {
          newStatus = 'scheduled'; // Futuro = agendado
        }
        
        // Atualizar apenas se o status for diferente
        if (event.status !== newStatus) {
          // Atualizar no Supabase
          supabase
            .from('events')
            .update({ status: newStatus })
            .eq('id', event.id)
            .then(({ error }) => {
              if (error) {
                console.error(`Erro ao atualizar status do evento ${event.id}:`, error);
              }
            });
          
          // Retornar evento com status atualizado
          return { ...event, status: newStatus };
        }
        
        return event;
      });
      
      // Atualizar a lista local
      setEventList(updatedEvents);
      
      toast({
        title: "Status atualizado",
        description: "Status dos eventos foi atualizado com sucesso.",
      });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao atualizar status dos eventos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Carregar eventos
    async function loadEvents() {
      if (!currentOrganization?.id) return;
      
      setLoading(true);
      
      try {
        console.log(`Buscando eventos para organização: ${currentOrganization.id}`);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao carregar eventos:', error);
          toast({
            title: "Erro ao carregar eventos",
            description: error.message,
            variant: "destructive"
          });
        } else {
          console.log(`${data?.length || 0} eventos encontrados`);
          
          // Atualizar status para eventos que não têm o campo
          const eventsWithStatus = data?.map(event => {
            if (!event.status) {
              // Determinar status baseado na data
              const isPast = isEventPast({...event, status: undefined});
              return {
                ...event,
                status: isPast ? 'completed' : new Date(event.date) <= new Date() ? 'active' : 'scheduled'
              };
            }
            return event;
          }) || [];
          
          setEventList(eventsWithStatus);
        }
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
        toast({
          title: "Erro inesperado",
          description: "Não foi possível carregar seus eventos",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadEvents();
    
    // Atualizar status de eventos na primeira carga
    updateEventStatus();
  }, [currentOrganization, refreshKey]); // Manter refreshKey como dependência

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2">Carregando organização...</span>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <div className="p-4 border border-amber-300 bg-amber-50 rounded-md text-amber-800">
        <h2 className="text-lg font-medium">Nenhuma organização selecionada</h2>
        <p className="mt-2">Você precisa selecionar ou criar uma organização para ver os eventos.</p>
        <Button onClick={() => router.push('/app/organizador/organizacoes')} className="mt-4">
          Gerenciar Organizações
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2">Carregando eventos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
          Tentar novamente
        </Button>
      </div>
    )
  }

  // Contadores por status
  const scheduledCount = eventList.filter(e => e.status === 'scheduled').length;
  const activeCount = eventList.filter(e => e.status === 'active').length;
  const completedCount = eventList.filter(e => e.status === 'completed').length;

  // Ordenar eventos por data (mais próximos primeiro) antes de filtrar
  const sortedEvents = [...eventList].sort((a, b) => {
    // Eventos sem data vão para o final
    if (!a.date) return 1;
    if (!b.date) return -1;

    // Para eventos com status diferente
    if (a.status !== b.status) {
      // Prioridade: active -> scheduled -> completed
      const statusPriority = { active: 0, scheduled: 1, completed: 2 };
      return (statusPriority[a.status || 'scheduled'] || 1) - (statusPriority[b.status || 'scheduled'] || 1);
    }

    // Para eventos com mesmo status, ordenar por data
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  const filteredEvents = sortedEvents.filter(event => {
    // Filtro por texto de busca
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    
    // Filtro por status temporal (agendado, em andamento, realizado)
    const matchesStatusFilter = statusTab === 'all' || 
                              (statusTab === 'scheduled' && event.status === 'scheduled') ||
                              (statusTab === 'active' && event.status === 'active') ||
                              (statusTab === 'completed' && event.status === 'completed');
    
    return matchesSearch && matchesStatusFilter;
  });

  const handleAction = (action: string, eventId: string) => {
    switch (action) {
      case 'edit':
        router.push(`/app/organizador/evento/${eventId}`)
        break
      case 'duplicate':
        // Encontrar o evento a ser duplicado
        const eventToDuplicate = eventList.find(event => event.id === eventId);
        if (eventToDuplicate) {
          setLoading(true);
          duplicateEvent(eventToDuplicate)
            .then(newEvent => {
              toast({
                title: "Evento duplicado",
                description: "O evento foi duplicado com sucesso",
              });
              // Atualizar a lista de eventos
              forceRefresh();
            })
            .catch(err => {
              toast({
                title: "Erro ao duplicar evento",
                description: err.message || "Não foi possível duplicar o evento",
                variant: "destructive"
              });
            })
            .finally(() => {
              setLoading(false);
            });
        }
        break
      case 'archive':
        // Implementar arquivamento
        break
      case 'delete':
        // Implementar exclusão
        break
    }
  }

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para formatar hora - pode receber string de data ou hora
  const formatTime = (timeString: string) => {
    // Se for uma string de hora (formato HH:MM:SS)
    if (timeString.includes(':') && !timeString.includes('-') && !timeString.includes('T')) {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    }
    
    // Se for uma string de data completa
    const date = new Date(timeString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os eventos da sua organização: {currentOrganization?.name || '...'}
          </p>
        </div>
        <div className="flex gap-2">
            {/* Temporarily disable Create Event button */}
           <Button onClick={() => router.push('/app/organizador/evento/criar')} disabled>
             <Plus className="mr-2 h-4 w-4" />
             Criar Evento
           </Button>
            {/* Restore Create Guest List button */}
           <NextLink href="/app/organizador/evento/criar/guest-list">
              <Button>
                <ListPlus className="mr-2 h-4 w-4" />
                Criar Guest List
              </Button>
           </NextLink>
        </div>
      </div>

      {/* Tabs de status de eventos */}
      <div className="w-full">
        <Tabs defaultValue="all" className="w-full" onValueChange={setStatusTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">
              Todos {eventList.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-800 text-xs rounded-full">{eventList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Próximos {scheduledCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{scheduledCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="active">
              Em Andamento {activeCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">{activeCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Realizados {completedCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">{completedCount}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={updateEventStatus} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Status
        </Button>
      </div>

      {eventList.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum evento encontrado</h3>
          <p className="mt-2 text-sm text-gray-500">
            Você ainda não criou nenhum evento. Comece criando seu primeiro evento.
          </p>
          <Button onClick={() => router.push('/app/organizador/eventos/criar')} className="mt-4">
            Criar Evento
          </Button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum evento corresponde aos filtros</h3>
          <p className="mt-2 text-sm text-gray-500">
            Tente ajustar seus critérios de busca ou filtros.
          </p>
          <Button onClick={() => { setSearchQuery(''); setStatusTab('all'); }} className="mt-4">
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  )
}

// Componente para o card de evento
function EventCard({ event, onAction }: { event: Event, onAction: (action: string, eventId: string) => void }) {
  const router = useRouter()
  const eventImg = event.flyer_url || '/placeholder-event.jpg'
  const { toast } = useToast()
  const [guestCount, setGuestCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { currentOrganization } = useOrganization()
  
  // Verificar se o evento já ocorreu com base no status ou data
  const isPast = event.status === 'completed' || isEventPast(event);
  
  // Definir cor do badge de status
  const statusConfig = {
    scheduled: { label: "Próximo", color: "bg-blue-500" },
    active: { label: "Em Andamento", color: "bg-green-500" },
    completed: { label: "Realizado", color: "bg-gray-500" }
  };
  
  // Usar status do evento, ou determinar baseado na data
  const status = event.status || (isPast ? 'completed' : new Date(event.date) <= new Date() ? 'active' : 'scheduled');
  
  // Função para tentar navegar para edição com verificação de status
  const handleEditClick = () => {
    if (isPast) {
      toast({
        title: "Operação não permitida",
        description: "Não é possível editar um evento que já foi realizado.",
        variant: "destructive"
      });
      return;
    }
    
    if (event.type === 'guest-list') {
      router.push(`/app/organizador/evento/criar/guest-list?id=${event.id}`);
    } else {
      router.push(`/app/organizador/eventos/criar?id=${event.id}`);
    }
  };
  
  // Função para tentar fazer check-in com verificação de status
  const handleCheckinClick = () => {
    // Navegar para a página de detalhes do evento
    console.log(`Navegando para detalhes do evento: ${event.id}`)
    router.push(`/app/organizador/eventos/${event.id}`)
  }
  
  // Função para tentar duplicar com verificação
  const handleDuplicateClick = () => {
    onAction('duplicate', event.id);
  }
  
  // Função para copiar o link do evento para a área de transferência
  const handleCopyLink = () => {
    // Lógica para gerar o link público do evento
    // Assumindo que a URL base é conhecida e o ID do evento é suficiente
    // Substitua 'https://seusite.com/evento/' pela sua URL real
    const publicEventUrl = `${window.location.origin}/evento/${event.id}`;
    navigator.clipboard.writeText(publicEventUrl)
      .then(() => {
        toast({
          title: "Link Copiado!",
          description: "O link público do evento foi copiado para a área de transferência.",
        });
        console.log("Link copiado:", publicEventUrl);
      })
      .catch(err => {
        console.error("Falha ao copiar link: ", err);
        toast({
          title: "Erro ao Copiar",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      });
  }
  
  // Função para atualizar contagem de convidados
  const refreshGuestCount = async () => {
    if (event.type === 'guest-list') {
      setIsLoading(true);
      
      try {
        console.log(`EventCard [${event.id}] - Buscando contagem via API`);
        
        // Usar o endpoint de API dedicado para contagem
        const response = await fetch(`/api/guest-count?eventId=${event.id}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
        });
        
        if (!response.ok) {
          throw new Error(`API retornou erro: ${response.status}`);
        }
        
        const data = await response.json();
        const count = data.count || 0;
        
        console.log(`EventCard [${event.id}] - API retornou ${count} convidados`);
        setGuestCount(count);
      } catch (err) {
        console.error(`EventCard [${event.id}] - Erro ao buscar contagem:`, err);
        // Fallback: tentar buscar diretamente no Supabase como plano B
        try {
          console.log(`EventCard [${event.id}] - Tentando fallback direto`);
          const { data, error } = await supabase
            .from('guests')
            .select('id')
            .eq('event_id', event.id);
          
          if (error) {
            console.error(`EventCard [${event.id}] - Erro no fallback:`, error);
            setGuestCount(0);
          } else {
            const count = data?.length || 0;
            console.log(`EventCard [${event.id}] - Fallback encontrou ${count} convidados`);
            setGuestCount(count);
          }
        } catch (fbErr) {
          console.error(`EventCard [${event.id}] - Erro no fallback:`, fbErr);
          setGuestCount(0);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Carregar contagem inicial e configurar atualização periódica
  useEffect(() => {
    if (event.type === 'guest-list') {
      // Buscar contagem inicial (uma única vez)
      refreshGuestCount();
      
      // Removida atualização automática a cada 5 segundos
      // const interval = setInterval(refreshGuestCount, 5000);
      // return () => clearInterval(interval);
    }
  }, [event.id, event.type]);

  return (
    <Card className={`overflow-hidden ${isPast ? 'opacity-80 border-gray-300' : ''}`}>
      <CardHeader className="p-0">
        <div className="relative h-40">
          <Image 
            src={eventImg}
            alt={event.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Overlay para eventos passados */}
          {isPast && (
            <div className="absolute inset-0 bg-gray-200 bg-opacity-20"></div>
          )}
          
          {/* Badge para indicar tipo de evento */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
            {event.type === 'guest-list' && (
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md">
                Guest List
              </div>
            )}
            
            {/* Badge de status */}
            <div className={`${statusConfig[status].color} text-white text-xs px-2 py-1 rounded-md ml-auto`}>
              {statusConfig[status].label}
            </div>
          </div>
          
          {/* Badge para eventos passados - mais visível */}
          {isPast && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white text-center py-2 text-sm font-semibold">
              EVENTO REALIZADO
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={`p-4 ${isPast ? 'bg-gray-50' : ''}`}>
        <h3 className="font-semibold text-lg">{event.title}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {event.description || 'Sem descrição'}
        </p>
        <div className="flex items-center gap-1 text-xs mt-2">
          <Calendar className="w-3 h-3" />
          <span>{event.date ? new Date(event.date).toLocaleDateString('pt-BR') : '-'}</span>
        </div>
        
        {/* Mostrar contagem de convidados para guest list */}
        {event.type === 'guest-list' && (
          <div className="mt-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                {isLoading ? (
                  <span>Carregando...</span>
                ) : (
                  <span>{guestCount !== null ? `${guestCount} convidados registrados` : 'Nenhum convidado'}</span>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  refreshGuestCount();
                }}
                className="text-xs text-blue-500 hover:text-blue-700"
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Atualizar'}
              </button>
            </div>
          </div>
        )}
        
        {/* Mensagem informativa para eventos realizados */}
        {isPast && (
          <div className="mt-3 text-xs text-gray-500 italic border-t border-gray-200 pt-2">
            Este evento já foi realizado e algumas opções estão desativadas
          </div>
        )}
      </CardContent>
      <CardFooter className={`p-4 pt-0 flex flex-wrap gap-2 ${isPast ? 'bg-gray-50' : ''}`}>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={handleCopyLink}
        >
          <LinkIcon className="w-4 h-4 mr-1" />
          Link Evento
        </Button>
        
        <Button 
          variant={isPast ? "ghost" : "outline"}
          size="sm" 
          className="flex-1"
          onClick={handleCheckinClick}
          disabled={isPast}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Detalhes
        </Button>
        
        <Button 
          variant="outline"
          size="sm" 
          className="flex-1"
          onClick={handleEditClick}
          disabled={isPast}
        >
          <Pencil className="w-4 h-4 mr-1" />
          Editar
        </Button>
        
        {event.type === 'guest-list' && (
          <Button 
            variant="outline"
            size="sm" 
            className="flex-1"
            onClick={handleDuplicateClick}
          >
            <Copy className="w-4 h-4 mr-1" />
            Duplicar
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 