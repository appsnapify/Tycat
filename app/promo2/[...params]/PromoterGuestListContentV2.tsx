"use client"

import NextImage from 'next/image';
import { CalendarIcon, Clock, MapPin, AlertTriangle, XCircle, ClockIcon, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GuestRequestClientV2 } from '@/components/promoter/GuestRequestClientV2';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useState } from 'react';

interface PromoterGuestListContentProps {
  event: {
    title: string;
    description?: string;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
    org_name?: string;
    organizations?: { name: string }[] | { name: string };
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

export default function PromoterGuestListContentV2({ event, params, hasAssociation = false, guestListStatus }: PromoterGuestListContentProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const eventDate = event.date ? format(new Date(event.date), 'PPP', { locale: pt }) : 'Data não definida';
  const eventTime = event.time || 'Horário não definido';

  const getOrganizationName = () => {
    if (event.org_name) return event.org_name;
    if (Array.isArray(event.organizations) && event.organizations[0]?.name) {
      return event.organizations[0].name;
    }
    if (event.organizations && typeof event.organizations === 'object' && 'name' in event.organizations) {
      return (event.organizations as { name: string }).name;
    }
    return 'Organizador';
  };
  
  const organizationName = getOrganizationName();

  const getTruncatedDescription = (text: string) => {
    const words = text.split(' ');
    if (words.length <= 50) return text;
    return words.slice(0, 50).join(' ') + '...';
  };

  const shouldShowReadMore = (text: string) => {
    return text.split(' ').length > 50;
  };

  const generateBackgroundStyle = () => {
    return { 
      background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)'
    };
  };

  return (
    <div className="min-h-screen" style={generateBackgroundStyle()}>
      <div className="backdrop-blur-sm">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-black text-white">TYCAT <span className="text-blue-400 text-sm">v2</span></h1>
        </div>
      </div>
      
      {!hasAssociation && (
        <div className="backdrop-blur-sm border-b border-orange-500/20 px-6 py-3">
          <div className="flex items-center gap-2 text-orange-300">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Este link pode não estar ativo ou ter funcionalidades limitadas.</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 pb-12 pt-8">
        <div className="grid md:grid-cols-2 gap-8">
          {event.flyer_url && (
            <div className="order-1 md:order-2 relative rounded-lg">
              <div 
                className="w-full relative rounded-lg overflow-hidden"
                style={{
                  aspectRatio: '16/9',
                  maxWidth: '100%',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.05)'
                }}
              >
                <NextImage
                  src={event.flyer_url}
                  fill
                  className="object-cover rounded-lg"
                  alt={event.title || 'Flyer do evento'}
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              </div>
            </div>
          )}
          
          <div className="order-2 md:order-1 space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {event.title.toUpperCase()}
            </h1>
            
            <p className="text-gray-400">Por <span className="text-blue-400">{organizationName}</span></p>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-300">
                <CalendarIcon className="w-5 h-5 flex-shrink-0 text-blue-400" />
                <span className="text-white">{eventDate}</span>
                {event.time && (
                  <>
                    <span>às</span>
                    <span className="text-white">{eventTime}</span>
                  </>
                )}
              </div>

              {event.location && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-5 h-5 flex-shrink-0 text-blue-400" />
                    <span>{event.location}</span>
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Descrição</h3>
                </div>
                <div className="text-gray-300 leading-relaxed pl-7">
                  <p>
                    {isDescriptionExpanded 
                      ? event.description 
                      : getTruncatedDescription(event.description)
                    }
                  </p>
                  {shouldShowReadMore(event.description) && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                    >
                      {isDescriptionExpanded ? 'Ver menos' : 'Ver mais'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <div className="max-w-sm mx-auto px-6 pb-10 pt-6">
        <div className="px-4 py-4">
          <div className="flex justify-center">
            {guestListStatus.isOpen ? (
              <GuestRequestClientV2
                eventId={params[0]}
                promoterId={params[1]}
                teamId={params[2]}
                buttonStyle={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s ease',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  width: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              />
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {guestListStatus.status === 'CLOSED' && <XCircle className="h-6 w-6 text-red-500" />}
                  {guestListStatus.status === 'BEFORE_OPENING' && <ClockIcon className="h-6 w-6 text-orange-500" />}
                  {guestListStatus.status === 'NO_SCHEDULE' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
                  <h3 className="text-lg font-semibold text-white">
                    {guestListStatus.status === 'CLOSED' && 'Guest List Fechada'}
                    {guestListStatus.status === 'BEFORE_OPENING' && 'Guest List em Breve'}
                    {guestListStatus.status === 'NO_SCHEDULE' && 'Guest List Indisponível'}
                  </h3>
                </div>
              
                <div className="p-3 rounded-lg mb-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700">
                  <p className={`text-sm ${
                      guestListStatus.status === 'CLOSED' ? 'text-red-400' :
                      guestListStatus.status === 'BEFORE_OPENING' ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      {guestListStatus.message}
                    </p>
                  </div>
              
                  {guestListStatus.status === 'BEFORE_OPENING' && (
                    <div className="text-xs text-gray-300">
                      <p className="mb-2">Volte quando a guest list abrir para garantir o seu lugar!</p>
                      <Button 
                        disabled 
                        className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-full text-xs font-medium cursor-not-allowed"
                      >
                        🕐 Aguardando Abertura
                      </Button>
                    </div>
                  )}
                  
                  {guestListStatus.status === 'CLOSED' && (
                    <div className="text-xs text-gray-300">
                      <p className="mb-2">O período de inscrição para este evento já terminou.</p>
                      <Button 
                        disabled 
                        className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-full text-xs font-medium cursor-not-allowed"
                      >
                        ❌ Guest List Encerrada
                      </Button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 