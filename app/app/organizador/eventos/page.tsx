'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit,
  Copy,
  Scan,
  Pencil,
  UserCheck,
  Link as LinkIcon,
  ExternalLink,
  ListPlus,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { useOrganization } from '@/app/contexts/organization-context'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import NextLink from 'next/link'
import { Badge } from '@/components/ui/badge'

// ✅ NOVO: Cache global para guest counts
const guestCountCache = new Map<string, { count: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const pendingRequests = new Map<string, Promise<number>>();

// ✅ NOVO: Função para invalidar cache específico
const invalidateGuestCountCache = (eventId: string) => {
  guestCountCache.delete(eventId);
  pendingRequests.delete(eventId);
};

// ✅ NOVO: Limpeza automática do cache (a cada 10 minutos)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [eventId, cached] of guestCountCache.entries()) {
      if (now - cached.timestamp > CACHE_TTL * 2) { // Limpar itens com mais de 10 minutos
        guestCountCache.delete(eventId);
      }
    }
  }, 10 * 60 * 1000);
}

// ✅ NOVO: Função para obter guest count com cache
const getCachedGuestCount = async (eventId: string): Promise<number> => {
  // Verificar cache primeiro
  const cached = guestCountCache.get(eventId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.count;
  }

  // Se já existe request pendente, aguardar ela
  if (pendingRequests.has(eventId)) {
    return pendingRequests.get(eventId)!;
  }

  // Criar nova request
  const requestPromise = (async () => {
    try {
      const response = await fetch(`/api/guest-count?eventId=${eventId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=300',
        },
      });

      if (!response.ok) {
        throw new Error(`API retornou erro: ${response.status}`);
      }

      const data = await response.json();
      const count = data.count || 0;

      // Armazenar no cache
      guestCountCache.set(eventId, { count, timestamp: Date.now() });
      
      return count;
    } catch (err) {
      // Fallback direto ao Supabase
      try {
        const { data, error } = await createClient()
          .from('guests')
          .select('id')
          .eq('event_id', eventId);
        
        const count = error ? 0 : (data?.length || 0);
        
        // Cache do fallback também
        guestCountCache.set(eventId, { count, timestamp: Date.now() });
        
        return count;
      } catch (fbErr) {
        return 0;
      }
    } finally {
      // Remover request das pendentes
      pendingRequests.delete(eventId);
    }
  })();

  // Armazenar request como pendente
  pendingRequests.set(eventId, requestPromise);
  
  return requestPromise;
};

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
  is_published?: boolean
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
    const supabase = createClient();
    
    // Verificar se a sessão está ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // Armazenar intenção de duplicar para retomar após login
      sessionStorage.setItem('pendingAction', JSON.stringify({
        type: 'duplicate_event',
        eventId: event.id
      }));
      
      // Redirecionar para login com parâmetro de retorno de forma segura
      window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    
    // Clonar o objeto do evento e modificar os campos necessários
    const newEvent = {
      ...event,
      title: `${event.title} - Cópia`,
      id: undefined, // Remover ID para criar um novo registro
      created_at: undefined, // Limpar campos de data de criação
      updated_at: undefined
    };
    
    // Remover o campo status se ele ainda não existir no banco de dados
    if ('status' in newEvent) {
      delete newEvent.status;
    }
    
    // Inserir o novo evento no banco de dados
    const { data, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();
    
    if (error) {
      // Tratamento específico para erro de RLS
      if (error.code === '42501') {
        throw new Error('Você não tem permissão para duplicar este evento. Verifique se você ainda está na mesma organização.');
      }
      
      throw new Error(error.message);
    }
    
    return data;
  } catch (err) {
    throw err;
  }
}

export default function EventosPage() {
  const [eventList, setEventList] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  useEffect(() => {
    async function loadEvents() {
      if (!currentOrganization?.id) return;
      
      setLoading(true);
      
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          toast.error("Erro ao carregar eventos: " + error.message);
        } else {
          const eventsWithStatus = data?.map(event => {
            if (!event.status) {
              const isPast = isEventPast({...event, status: undefined});
              return {
                ...event,
                status: isPast ? 'completed' : new Date(event.date) <= new Date() ? 'active' : 'scheduled'
              };
            }
            return event;
          }) || [];
          
          setEventList(eventsWithStatus);
          
          // ✅ CORRIGIDO: Pré-carregar guest counts apenas para guest-lists próximos (visíveis)
          const upcomingGuestListEvents = eventsWithStatus.filter(event => 
            event.type === 'guest-list' && !isEventPast(event)
          );
          if (upcomingGuestListEvents.length > 0) {
            // Fazer em background sem bloquear UI
            setTimeout(() => {
              upcomingGuestListEvents.forEach((event, index) => {
                // Delay escalonado para não sobrecarregar
                setTimeout(() => {
                  getCachedGuestCount(event.id).catch(() => {
                    // Falhas silenciosas no background preload
                  });
                }, index * 100);
              });
            }, 500);
          }
        }
      } catch (err) {
        toast.error("Não foi possível carregar seus eventos");
      } finally {
        setLoading(false);
      }
    }
    
    loadEvents();
  }, [currentOrganization, refreshKey]);

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
        <Button onClick={() => router.push('/app/organizador/organizacoes')} className="mt-4 bg-lime-500 hover:bg-lime-600 text-white">
          Gerenciar Organizações
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
        <span className="ml-2">Carregando eventos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-2 border-fuchsia-500 hover:bg-fuchsia-50 text-fuchsia-600">
          Tentar novamente
        </Button>
      </div>
    )
  }

  // Separar eventos em próximos e passados
  const upcomingEvents = eventList
    .filter(event => !isEventPast(event))
    .sort((a, b) => {
      // Ordenar próximos eventos por data crescente (mais próximos primeiro)
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

  const pastEvents = eventList
    .filter(event => isEventPast(event))
    .sort((a, b) => {
      // Ordenar eventos passados por data decrescente (mais recentes primeiro)
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

  const handleAction = (action: string, eventId: string) => {
    switch (action) {
      case 'edit':
        router.push(`/app/organizador/evento/${eventId}`)
        break
      case 'duplicate':
        const eventToDuplicate = eventList.find(event => event.id === eventId);
        if (eventToDuplicate) {
          setLoading(true);
          duplicateEvent(eventToDuplicate)
            .then(newEvent => {
              toast.success("Evento duplicado com sucesso");
              forceRefresh();
            })
            .catch(err => {
              if (err.message.includes('Sessão expirada')) {
                toast.error("Sua sessão expirou. Você será redirecionado para fazer login novamente.");
              } else if (err.message.includes('permissão')) {
                toast.error(err.message);
              } else {
                toast.error(err.message || "Falha ao duplicar o evento");
              }
            })
            .finally(() => {
              setLoading(false);
            });
        }
        break
      default:
        console.warn(`Ação não reconhecida: ${action}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie os eventos da sua organização: {currentOrganization?.name || '...'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
           <Button 
             onClick={() => router.push('/app/organizador/evento/criar')} 
             disabled 
             className="bg-blue-500 hover:bg-blue-600 text-white shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.12)] transition-all duration-200 w-full sm:w-auto"
           >
             <Plus className="mr-2 h-4 w-4" />
             <span className="hidden sm:inline">Criar Evento</span>
             <span className="sm:hidden">Evento</span>
           </Button>
           <NextLink href="/app/organizador/evento/criar/guest-list" className="w-full sm:w-auto">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.12)] transition-all duration-200 w-full">
                <ListPlus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Criar Guest List</span>
                <span className="sm:hidden">Guest List</span>
              </Button>
           </NextLink>
        </div>
      </div>

      {/* Próximos Eventos */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Próximos Eventos</h2>
          {upcomingEvents.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shadow-sm w-fit">
              {upcomingEvents.length} {upcomingEvents.length === 1 ? 'evento' : 'eventos'}
            </Badge>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum evento próximo</h3>
            <p className="mt-2 text-sm text-gray-500">
              Você não tem eventos programados. Comece criando seu próximo evento.
            </p>
            <Button 
              onClick={() => router.push('/app/organizador/eventos/criar')} 
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.12)] transition-all duration-200"
            >
              Criar Evento
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event, index) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onAction={handleAction} 
                isLCPImage={index === 0 && !!event.flyer_url}
              />
            ))}
          </div>
        )}
      </div>

      {/* Eventos Passados - Seção Colapsável */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Eventos Passados</h2>
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 shadow-sm w-fit">
                {pastEvents.length} {pastEvents.length === 1 ? 'evento' : 'eventos'}
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-200 hover:shadow-sm hover:border-gray-400 w-full sm:w-auto"
            >
              {showPastEvents ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Ocultar</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Mostrar</span>
                </>
              )}
            </Button>
          </div>

          {showPastEvents && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onAction={handleAction} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado vazio - quando não há eventos de forma alguma */}
      {eventList.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum evento encontrado</h3>
          <p className="mt-2 text-sm text-gray-500">
            Você ainda não criou nenhum evento. Comece criando seu primeiro evento.
          </p>
          <Button 
            onClick={() => router.push('/app/organizador/eventos/criar')} 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.12)] transition-all duration-200"
          >
            Criar Evento
          </Button>
        </div>
      )}
    </div>
  )
}

// Componente para o card de evento
function EventCard({ event, onAction, isLCPImage }: { event: Event, onAction: (action: string, eventId: string) => void, isLCPImage?: boolean }) {
  const router = useRouter()
  const eventImg = event.flyer_url || '/placeholder-event.jpg'
  const [guestCount, setGuestCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const isPast = event.status === 'completed' || isEventPast(event);
  const isPublished = event.is_published ?? true;
  
  const statusConfig = {
    scheduled: { label: "Próximo", color: "bg-blue-500" },
    active: { label: "Em Andamento", color: "bg-blue-600" },
    completed: { label: "Realizado", color: "bg-gray-500" }
  };
  
  const status = event.status || (isPast ? 'completed' : new Date(event.date) <= new Date() ? 'active' : 'scheduled');
  
  const handleEditClick = () => {
    if (isPast) {
      toast.error("Não é possível editar um evento que já foi realizado.");
      return;
    }
    
    if (event.type === 'guest-list') {
      router.push(`/app/organizador/evento/criar/guest-list?id=${event.id}`);
    } else {
      router.push(`/app/organizador/eventos/criar?id=${event.id}`);
    }
  };
  
  const handleCheckinClick = () => {
    router.push(`/app/organizador/eventos/${event.id}`)
  }
  
  const handleDuplicateClick = () => {
    onAction('duplicate', event.id);
  }
  
  const handleCopyLink = () => {
    // Usar rota específica baseada no tipo do evento
    const publicEventUrl = event.type === 'guest-list' 
      ? `${window.location.origin}/g/${event.id}`
      : `${window.location.origin}/e/${event.id}`;
      
    navigator.clipboard.writeText(publicEventUrl)
      .then(() => {
        toast.success("Link copiado para a área de transferência!");
      })
      .catch(err => {
        toast.error("Não foi possível copiar o link.");
      });
  }
  
  const refreshGuestCount = useCallback(async () => {
    if (event.type === 'guest-list') {
      setIsLoading(true);
      
      try {
        const count = await getCachedGuestCount(event.id);
        setGuestCount(count);
      } catch (err) {
          setGuestCount(0);
      } finally {
        setIsLoading(false);
      }
    }
  }, [event.id, event.type]);
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // ✅ NOVO: Debounce inteligente baseado na posição do card
  useEffect(() => {
    if (event.type === 'guest-list' && !isInitialized && !isLoading) {
      setIsInitialized(true);
      
      // Cache hit instantâneo
      const cached = guestCountCache.get(event.id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setGuestCount(cached.count);
        return;
      }
      
      // Delay escalonado para evitar chamadas simultâneas (0ms, 100ms, 200ms, etc.)
      const eventIndex = event.id.slice(-1); // Usar último char do ID para gerar delay único
      const delay = (parseInt(eventIndex, 16) || 0) * 50; // 0-750ms baseado no ID
      
      const timeoutId = setTimeout(() => {
        refreshGuestCount();
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [event.id]);

  return (
    <Card className={`overflow-hidden transition-all duration-300 cursor-pointer rounded-xl
      shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)]
      bg-white border-gray-200 hover:border-gray-300
      ${isPast ? 'opacity-80 grayscale' : ''} 
      ${!isPublished ? 'border-dashed border-orange-300' : ''} 
      ${!isPast && isPublished && status === 'scheduled' ? 'border-l-4 border-l-blue-500' : ''}
      ${!isPast && isPublished && status === 'active' ? 'border-l-4 border-l-blue-600' : ''}
    `}>
      <CardHeader className="p-0">
        <div className="relative h-40">
          <Image 
            src={eventImg}
            alt={event.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={isLCPImage}
          />
          
          {(isPast || !isPublished) && (
            <div className={`absolute inset-0 ${isPast ? 'bg-gray-200 bg-opacity-20' : 'bg-black bg-opacity-10'}`}></div>
          )}
          
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start gap-1 flex-wrap">
            <div className="flex flex-col gap-1 items-start">
              {event.type === 'guest-list' && (
                <Badge variant="outline" className="bg-blue-500/90 border-blue-600 text-white text-xs backdrop-blur-sm shadow-sm">
                  Guest List
                </Badge>
              )}
              <Badge variant={isPublished ? "success" : "destructive"} className="text-xs backdrop-blur-sm shadow">
                {isPublished ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            
            {!isPast && (
                <Badge className={`${statusConfig[status].color} text-white text-xs backdrop-blur-sm shadow`}>
                  {statusConfig[status].label}
                </Badge>
            )}
          </div>
          
          {isPast && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white text-center py-2 text-sm font-semibold">
              EVENTO REALIZADO
            </div>
          )}
        </div>
        
        {/* Barra azul para Guest Count - apenas para guest-lists */}
        {event.type === 'guest-list' && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {isLoading ? (
                <span className="text-sm font-medium">Carregando...</span>
              ) : (
                <span className="text-sm font-medium">
                  {guestCount !== null ? `${guestCount} Guests` : '0 Guests'}
                </span>
              )}
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // ✅ NOVO: Invalidar cache antes de refresh para garantir dados frescos
                invalidateGuestCountCache(event.id);
                refreshGuestCount();
              }}
              className="text-white hover:text-blue-200 transition-colors duration-200 hover:bg-blue-700 p-1 rounded"
              disabled={isLoading}
              title="Atualizar contagem de guests"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </CardHeader>
      <CardContent className={`p-4 md:p-6 ${isPast ? 'bg-gray-50' : ''} ${!isPublished ? 'bg-orange-50' : ''}`}>
        <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
        <p className="text-sm text-gray-500 truncate">
          {event.description || 'Sem descrição'}
        </p>
        <div className="flex items-center gap-1 text-xs mt-2 text-gray-600">
          <Calendar className="w-3 h-3 text-blue-600" />
          <span>{event.date ? new Date(event.date).toLocaleDateString('pt-BR') : '-'}</span>
        </div>
        
        {isPast && (
          <div className="mt-3 text-xs text-gray-500 italic border-t border-gray-200 pt-2">
            Este evento já foi realizado e algumas opções estão desativadas
          </div>
        )}
      </CardContent>
      <CardFooter className={`p-4 md:p-6 pt-0 ${isPast ? 'bg-gray-50' : ''} ${!isPublished ? 'bg-orange-50' : ''}`}>
        {/* Layout Mobile Otimizado: 2 botões por linha */}
        <div className="w-full space-y-2">
          {/* Primeira linha: Botões principais */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 transition-all duration-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm border-gray-200"
              onClick={handleCopyLink}
              disabled={!isPublished || isPast}
              title={!isPublished ? "Evento inativo" : isPast ? "Evento realizado" : "Copiar Link Público"}
            >
              <LinkIcon className="w-4 h-4 mr-1 text-blue-600" />
              <span className="hidden sm:inline">Link Evento</span>
              <span className="sm:hidden">Link</span>
            </Button>
            
            <Button 
              variant={isPast ? "ghost" : "outline"}
              size="sm" 
              className="flex-1 transition-all duration-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm border-gray-200"
              onClick={handleCheckinClick}
              disabled={!isPublished}
              title={!isPublished ? "Evento inativo" : "Ver Detalhes"}
            >
              <ExternalLink className="w-4 h-4 mr-1 text-blue-600" />
              Detalhes
            </Button>
          </div>
          
          {/* Segunda linha: Botões secundários */}
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm" 
              className="flex-1 transition-all duration-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm border-gray-200"
              onClick={handleEditClick}
              disabled={isPast}
              title={isPast ? "Evento realizado" : "Editar Evento"}
            >
              <Pencil className="w-4 h-4 mr-1 text-blue-600" />
              Editar
            </Button>
            
            {event.type === 'guest-list' ? (
              <Button 
                variant="outline"
                size="sm" 
                className="flex-1 transition-all duration-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm border-gray-200"
                onClick={handleDuplicateClick}
                title="Duplicar Evento"
              >
                <Copy className="w-4 h-4 mr-1 text-blue-600" />
                Duplicar
              </Button>
            ) : (
              <div className="flex-1"></div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 