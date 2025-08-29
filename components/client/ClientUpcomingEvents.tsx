'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, QrCode, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCard } from './EventCard';
import Link from 'next/link';

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
}

interface ClientUpcomingEventsProps {
  clientUserId: string;
}

// ✅ COMPLEXIDADE: 5 pontos (1 base + 4 condições)
export function ClientUpcomingEvents({ clientUserId }: ClientUpcomingEventsProps) {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FUNÇÃO: Fetch upcoming events (Complexidade: 3)
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!clientUserId) return; // +1
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/client/events/${clientUserId}?type=upcoming`);
        
        if (!response.ok) {
          console.error('API Response not OK:', response.status, response.statusText);
          setError(`Erro HTTP: ${response.status}`);
          return;
        }
        
        const responseText = await response.text();
        console.log('Raw API response:', responseText.substring(0, 200));
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Response text:', responseText);
          setError('Erro de formato de resposta');
          return;
        }
        
        if (data.success && data.data) { // +1
          setEvents(data.data);
        } else { // +1
          setError(data.error || 'Erro ao carregar eventos');
        }
      } catch (err) {
        console.error('Error fetching upcoming events:', err);
        setError('Erro de conexão');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [clientUserId]);

  // ✅ FUNÇÃO: Format date (Complexidade: 1)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // ✅ FUNÇÃO: Format time (Complexidade: 1)
  const formatTime = (timeString: string): string => {
    return timeString.slice(0, 5); // HH:MM
  };

  // Loading state
  if (isLoading) { // +1
    return (
      <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) { // +1
    return (
      <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-600 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (events.length === 0) { // +1
    return (
      <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
            <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              Nenhum evento próximo
            </h3>
            <p className="text-slate-600 mb-6">
              Quando se registar em novos eventos, eles aparecerão aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Events list
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center text-lg font-semibold text-slate-800">
            <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
            Próximos Eventos
          </span>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event) => ( // +1
          <Card key={event.id} className="border border-slate-200/50 hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              {/* Event Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                  )}
                </div>
                {!event.checked_in && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                    Ativo
                  </Badge>
                )}
                {event.checked_in && (
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    Check-in ✓
                  </Badge>
                )}
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="flex items-center text-sm text-slate-600">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                  {formatDate(event.event_date)}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </div>
                {event.location && (
                  <div className="flex items-center text-sm text-slate-600 sm:col-span-2">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    {event.location}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Registado via {event.source}
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={`/user/events/${event.id}`}>
                    <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                      <Users className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                  </Link>
                  <Link href={`/user/events/${event.id}/qr`}>
                    <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                      <QrCode className="w-4 h-4 mr-1" />
                      QR Code
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Ver todos os eventos */}
        <div className="text-center pt-4">
          <Link href="/user/events">
            <Button variant="ghost" className="text-emerald-600 hover:bg-emerald-50">
              Ver todos os eventos
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
