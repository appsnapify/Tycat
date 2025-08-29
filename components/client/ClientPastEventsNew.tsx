'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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
}

interface ClientPastEventsProps {
  clientUserId: string;
}

// ✅ COMPLEXIDADE: 5 pontos (1 base + 4 condições)
export function ClientPastEvents({ clientUserId }: ClientPastEventsProps) {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchPastEvents = async () => {
      if (!clientUserId) return; // +1
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/client/events/${clientUserId}?type=past`);
        
        if (!response.ok) { // +1
          setError(`Erro HTTP: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.data) { // +1
          setEvents(data.data);
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

    fetchPastEvents();
  }, [clientUserId]);

  // Don't show section if no events and not loading
  if (!isLoading && events.length === 0) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-800">
              <Calendar className="w-5 h-5 text-slate-600" />
              Eventos Passados
            </span>
            <Skeleton className="h-6 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-[280px] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Calendar className="w-5 h-5 text-slate-600" />
            Eventos Passados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-4">Erro ao buscar eventos passados</p>
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

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-800">
            <Calendar className="w-5 h-5 text-slate-600" />
            Eventos Passados
          </span>
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 h-8 w-8"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {events.map((event) => (
              <ClientEventCard key={event.guest_id} event={event} isPastEvent={true} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

