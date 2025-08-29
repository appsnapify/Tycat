'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientEventCard } from '../ClientEventCard';

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

interface UpcomingEventsDisplayProps {
  events: ClientEvent[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// ✅ COMPONENTE: Loading State (Complexidade: 1)
export function LoadingState() {
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
          <Calendar className="w-5 h-5 mr-3 text-emerald-600" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ COMPONENTE: Error State (Complexidade: 1)
export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
          <Calendar className="w-5 h-5 mr-3 text-emerald-600" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={onRetry}
            variant="outline" 
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Tentar Novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ COMPONENTE: Empty State (Complexidade: 1)
export function EmptyState() {
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
          <Calendar className="w-5 h-5 mr-3 text-emerald-600" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg mb-2">Nenhum evento próximo</p>
          <p className="text-slate-500 text-sm">
            Quando tiver eventos agendados, eles aparecerão aqui.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ COMPONENTE: Events List (Complexidade: 1)
export function EventsList({ events }: { events: ClientEvent[] }) {
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center text-lg font-semibold text-slate-800">
            <Calendar className="w-5 h-5 mr-3 text-emerald-600" />
            Próximos Eventos
          </div>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            {events.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <ClientEventCard
              key={event.id}
              event={event}
              showQR={true}
              showStatus="valid"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ COMPONENTE PRINCIPAL: Upcoming Events Display (Complexidade: 3)
export function UpcomingEventsDisplay({ events, isLoading, error, onRetry }: UpcomingEventsDisplayProps) {
  if (isLoading) { // +1
    return <LoadingState />;
  }

  if (error) { // +1
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (events.length === 0) {
    return <EmptyState />;
  }

  return <EventsList events={events} />;
}
