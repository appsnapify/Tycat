'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { GuestRequestClientButton } from '@/components/promoter/GuestRequestClientButton.fixed';
import { formatEventDate } from '@/lib/utils';

// Interface para props do componente
interface Props {
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
    organizations: {
      name: string;
    } | null;
  };
  params: string[];
  hasAssociation: boolean;
  guestListStatus: {
    isOpen: boolean;
    message: string;
  };
}

// Componente principal otimizado
export default function PromoterGuestListContentV2({ event, params, hasAssociation, guestListStatus }: Props) {
  const [eventId, promoterId, teamId] = params;
  const [isLoading, setIsLoading] = useState(false);

  // Função para copiar link
  const copyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast.error('Erro ao copiar link');
    }
  };

  // Renderização condicional para erro de associação
  if (!hasAssociation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
          <p className="text-gray-600">
            Este promotor não está autorizado a adicionar convidados para este evento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        {/* Cabeçalho do Evento */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          {event.organizations?.name && (
            <p className="text-gray-600">{event.organizations.name}</p>
          )}
          <p className="text-gray-600">
            {formatEventDate(event.date, event.time)}
          </p>
          {event.location && (
            <p className="text-gray-600">{event.location}</p>
          )}
        </div>

        {/* Flyer do Evento */}
        {event.flyer_url && (
          <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
            <Image
              src={event.flyer_url}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Status da Guest List */}
        <div className={`text-center p-4 rounded-lg ${
          guestListStatus.isOpen 
            ? 'bg-green-50 text-green-700' 
            : 'bg-yellow-50 text-yellow-700'
        }`}>
          <p>{guestListStatus.message}</p>
        </div>

        {/* Botão de Entrada */}
        <div className="space-y-4">
          <GuestRequestClientButton
            eventId={eventId}
            promoterId={promoterId}
            teamId={teamId}
            isDisabled={!guestListStatus.isOpen || isLoading}
            setIsLoading={setIsLoading}
          />

          {/* Botão de Compartilhar */}
          <button
            onClick={copyLink}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Copiar Link
          </button>
        </div>

        {/* Descrição do Evento */}
        {event.description && (
          <div className="text-gray-600 text-sm">
            <p>{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
} 