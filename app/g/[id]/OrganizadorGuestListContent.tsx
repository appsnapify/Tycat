"use client"

import Image from 'next/image';
import { CalendarIcon, Clock, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizadorGuestRequest } from '@/components/organizador/OrganizadorGuestRequest';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface OrganizadorGuestListContentProps {
  event: {
    title: string;
    description?: string;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
  };
  eventId: string;
}

export default function OrganizadorGuestListContent({ event, eventId }: OrganizadorGuestListContentProps) {
  // Formatar data e hora do evento
  const eventDate = event.date ? format(new Date(event.date), 'PPP', { locale: pt }) : 'Data não definida';
  const eventTime = event.time || 'Horário não definido';
  
  return (
    <div className="container max-w-lg mx-auto p-4 space-y-4">
      {/* Card do Evento */}
      <Card>
        <CardHeader>
          {event.flyer_url && (
            <div className="relative w-full aspect-[3/2] mb-4">
              <Image
                src={event.flyer_url}
                alt={event.title || 'Flyer do evento'}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover rounded-lg"
                priority
              />
            </div>
          )}
          <CardTitle className="text-2xl">{event.title}</CardTitle>
          
          {/* Descrição do evento */}
          {event.description && (
            <div className="text-sm text-muted-foreground mt-2">
              <p>{event.description}</p>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>{eventDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{eventTime}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Componente com autenticação completa para organização */}
      <OrganizadorGuestRequest eventId={eventId} />
    </div>
  );
} 