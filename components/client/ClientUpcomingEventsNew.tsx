'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientEventCard } from './ClientEventCard';

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

interface ClientUpcomingEventsProps {
  clientUserId: string;
}

// ✅ COMPLEXIDADE: 6 pontos (1 base + 5 condições)
export function ClientUpcomingEvents({ clientUserId }: ClientUpcomingEventsProps) {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!clientUserId) return; // +1
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/client/events/${clientUserId}?type=upcoming`);
        
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Próximos Eventos
          </h2>
          <Skeleton className="h-6 w-20" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-4">Erro ao buscar eventos</p>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <Button 
            variant="outline" 
            className="bg-white/50 border-slate-200 hover:bg-slate-50"
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No events
  if (events.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">Nenhum evento próximo encontrado</p>
          <Button 
            variant="outline" 
            className="bg-white/50 border-slate-200 hover:bg-slate-50"
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Events list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Próximos Eventos
        </h2>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          {events.length} {events.length === 1 ? 'evento' : 'eventos'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <ClientEventCard key={event.guest_id} event={event} isPastEvent={false} />
        ))}
      </div>
    </div>
  );
}
