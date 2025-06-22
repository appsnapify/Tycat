"use client"

import Image from 'next/image';
import { CalendarIcon, Clock, MapPin, AlertTriangle, XCircle, ClockIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GuestRequestClient } from '@/components/promoter/GuestRequestClientButton';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PromoterGuestListContentProps {
  event: {
    title: string;
    description?: string;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
  };
  params: string[];
  hasAssociation?: boolean;
  guestListStatus: {
    isOpen: boolean;
    status: 'BEFORE_OPENING' | 'OPEN' | 'CLOSED' | 'NO_SCHEDULE';
    message: string;
    openDateTime?: string;
    closeDateTime?: string;
  };
}

export default function PromoterGuestListContent({ event, params, hasAssociation = false, guestListStatus }: PromoterGuestListContentProps) {
  // Formatar data e hora do evento
  const eventDate = event.date ? format(new Date(event.date), 'PPP', { locale: pt }) : 'Data não definida';
  const eventTime = event.time || 'Horário não definido';
  
  return (
    <div className="container max-w-lg mx-auto p-4 space-y-4">
      {/* Aviso se não há associação */}
      {!hasAssociation && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Este link pode não estar ativo ou ter funcionalidades limitadas.
          </AlertDescription>
        </Alert>
      )}

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
      
      {/* Renderização condicional baseada no status da guest list */}
      {guestListStatus.isOpen ? (
        /* Componente com autenticação completa - apenas quando guest list está aberta */
      <GuestRequestClient
        eventId={params[0]}
        promoterId={params[1]}
        teamId={params[2]}
      />
      ) : (
        /* Card com informação sobre status da guest list - preservando layout */
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
              {guestListStatus.status === 'CLOSED' && <XCircle className="h-6 w-6 text-red-500" />}
              {guestListStatus.status === 'BEFORE_OPENING' && <ClockIcon className="h-6 w-6 text-orange-500" />}
              {guestListStatus.status === 'NO_SCHEDULE' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
              {guestListStatus.status === 'CLOSED' && 'Guest List Fechada'}
              {guestListStatus.status === 'BEFORE_OPENING' && 'Guest List em Breve'}
              {guestListStatus.status === 'NO_SCHEDULE' && 'Guest List Indisponível'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`p-4 rounded-lg ${
                guestListStatus.status === 'CLOSED' ? 'bg-red-50 border border-red-200' :
                guestListStatus.status === 'BEFORE_OPENING' ? 'bg-orange-50 border border-orange-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm ${
                  guestListStatus.status === 'CLOSED' ? 'text-red-700' :
                  guestListStatus.status === 'BEFORE_OPENING' ? 'text-orange-700' :
                  'text-yellow-700'
                }`}>
                  {guestListStatus.message}
                </p>
              </div>
              
              {guestListStatus.status === 'BEFORE_OPENING' && (
                <div className="text-xs text-muted-foreground">
                  <p>Volte quando a guest list abrir para garantir o seu lugar!</p>
                </div>
              )}
              
              {guestListStatus.status === 'CLOSED' && (
                <div className="text-xs text-muted-foreground">
                  <p>O período de inscrição para este evento já terminou.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 