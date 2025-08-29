'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface ClientEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  event_flyer_url: string | null;
  guest_id: string;
  qr_code: string;
  qr_code_url: string;
  checked_in: boolean;
  check_in_time: string | null;
  source: string;
  organization_name: string;
}

interface ClientPastEventsCollapsibleProps {
  clientUserId: string;
}

// ✅ COMPLEXIDADE: 6 pontos (1 base + 5 condições)
export function ClientPastEventsCollapsible({ clientUserId }: ClientPastEventsCollapsibleProps) {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [pastEventsCount, setPastEventsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNÇÃO: Format date (Complexidade: 1)
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase(),
      year: date.getFullYear()
    };
  };

  // ✅ FUNÇÃO: Format time (Complexidade: 2)
  const formatEventTime = (timeString: string | null) => {
    if (!timeString) return null; // +1
    return timeString.substring(0, 5);
  };

  // Load count on mount
  useEffect(() => {
    const fetchPastEventsCount = async () => {
      if (!clientUserId) return; // +1
      
      try {
        const response = await fetch(`/api/client/events/${clientUserId}?type=past`);
        
        if (response.ok) { // +1
          // ✅ SEGURANÇA: Verificar Content-Type antes de fazer parse JSON
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) { // +1
            const data = await response.json();
            if (data.success && data.data) { // +1
              setPastEventsCount(data.data.length);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching past events count:', error);
      }
    };

    fetchPastEventsCount();
  }, [clientUserId]);

  // ✅ FUNÇÃO: Load events (Complexidade: 4)
  const loadPastEvents = async () => {
    if (hasLoaded || !clientUserId) return; // +1
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/client/events/${clientUserId}?type=past`);
      
      if (!response.ok) { // +1
        setError(`Erro HTTP: ${response.status}`);
        return;
      }
      
      // ✅ SEGURANÇA: Verificar Content-Type antes de fazer parse JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) { // +1
        setError('Resposta inválida do servidor');
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) { // +1
        setEvents(data.data);
        setHasLoaded(true);
      } else { // +1
        setError(data.error || 'Erro ao carregar eventos');
      }
    } catch (err) {
      console.error('Error fetching past events:', err);
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle expand/collapse
  const handleToggle = () => {
    if (!isExpanded && !hasLoaded) {
      loadPastEvents();
    }
    setIsExpanded(!isExpanded);
  };

  // Don't show if no past events
  if (pastEventsCount === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-xl overflow-hidden">
      {/* Header - sempre visível */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-600" />
            <div>
              <h3 className="font-semibold text-slate-800">Eventos Passados</h3>
              <p className="text-sm text-slate-600">
                {pastEventsCount} {pastEventsCount === 1 ? 'evento' : 'eventos'} realizados
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {pastEventsCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="p-2 h-10 w-10 hover:bg-slate-100"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content - expandível */}
      {isExpanded && (
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Erro ao carregar eventos passados</p>
              <p className="text-sm text-slate-600 mb-4">{error}</p>
              <Button 
                variant="outline" 
                className="bg-white/50 border-slate-200 hover:bg-slate-50"
                onClick={loadPastEvents}
              >
                Tentar Novamente
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum evento passado encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => {
                const date = formatEventDate(event.event_date);
                const time = formatEventTime(event.start_time);
                
                return (
                  <div
                    key={event.guest_id}
                    className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-lg"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                      {event.event_flyer_url ? (
                        <Image
                          src={event.event_flyer_url}
                          alt={`Flyer do evento ${event.title}`}
                          fill
                          className="object-cover opacity-90"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          quality={75}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
                      
                      {/* "REALIZADO" Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                          <span className="text-xs font-bold text-slate-800 tracking-wider">
                            REALIZADO
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative p-6 h-64 flex flex-col justify-between">
                      {/* Top Section */}
                      <div className="flex justify-between items-start">
                        <div className="text-white/80 text-xs font-medium tracking-wider">
                          {event.organization_name?.toUpperCase() || 'ORGANIZATION'}
                        </div>
                      </div>

                      {/* Center Section */}
                      <div className="text-center">
                        <h3 className="text-lg font-black text-white mb-2 tracking-tight line-clamp-2">
                          {event.title}
                        </h3>
                      </div>

                      {/* Bottom Section */}
                      <div className="flex justify-between items-end">
                        <div className="text-white">
                          <div className="text-2xl font-black leading-none">{date.day}</div>
                          <div className="text-xs font-mono text-white/60 tracking-widest">{date.month}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/60 text-xs font-mono tracking-wider">
                            {time || 'EVENTO'}
                          </div>
                          <div className="text-lg font-black text-white">PASSADO</div>
                        </div>
                      </div>
                    </div>


                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

