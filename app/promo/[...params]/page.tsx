// Este ficheiro representa a página pública de registo para uma guest list de evento com rastreamento de promotor.
// [...params] captura /promo/[eventId]/[promoterId]/[teamId]

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CalendarIcon, Clock, MapPin, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuestRequestCard } from '@/components/promoter/GuestRequestCard';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { processPromoParams } from '../actions';
import { getEvent } from '@/lib/events';

// Interface para props da página
interface PageProps {
  params: { params: Promise<string[]> };
}

// Server Component que captura parâmetros da URL e os passa para o cliente
export default async function PromoterGuestListPage({ params }: PageProps) {
  console.log('[DEBUG] Iniciando PromoterGuestListPage');
  
  try {
    // Aguardar a resolução dos parâmetros
    const urlParams = await params.params;
    
    // Processar parâmetros usando Server Action
    const data = await processPromoParams(urlParams);
    
    if (!data) {
      console.error('[ERROR] Dados não encontrados');
      return notFound();
    }
    
    const { event: eventData, promoter: promoterData } = data;
    console.log('[DEBUG] Dados processados:', { eventData, promoterData });
    
    // Verificar se o evento já passou
    const eventDate = new Date(eventData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetar hora para comparar apenas as datas
    
    if (eventDate < today) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Evento Encerrado</h1>
          <p className="text-gray-600 text-center">
            Este evento já foi realizado em {eventDate.toLocaleDateString()}.
            Não é mais possível solicitar entrada na guest list.
          </p>
        </div>
      );
    }
    
    // Formatar data e hora para exibição
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'Data não definida';
      return format(new Date(dateString), 'PPP', { locale: pt });
    };
    
    const formatTime = (timeString: string | null | undefined) => {
      if (!timeString) return '';
      return timeString.substring(0, 5);
    };
    
    // Checar se a guest list está aberta
    const now = new Date();
    let isGuestListOpen = true;
    let statusMessage = "Inscrições abertas";
    
    if (eventData.guest_list_open_datetime && eventData.guest_list_close_datetime) {
      const openTime = new Date(eventData.guest_list_open_datetime);
      const closeTime = new Date(eventData.guest_list_close_datetime);
      
      if (now < openTime) {
        isGuestListOpen = false;
        statusMessage = `Inscrições abrem em ${format(openTime, 'Pp', { locale: pt })}`;
      } else if (now > closeTime) {
        isGuestListOpen = false;
        statusMessage = "Inscrições encerradas";
      }
    }
    
    // Renderizar a página com a informação do evento e o botão para solicitar ingresso
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="mb-8 overflow-hidden">
          {eventData.flyer_url && (
            <div className="relative w-full aspect-[3/2] overflow-hidden">
              <Image 
                src={eventData.flyer_url}
                alt={eventData.title}
                fill
                style={{objectFit: 'cover'}}
                priority
              />
            </div>
          )}
          
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">{eventData.title}</CardTitle>
                {promoterData && (
                  <CardDescription>
                    Convite de {promoterData.first_name} {promoterData.last_name}
                  </CardDescription>
                )}
              </div>
              <Badge 
                variant={isGuestListOpen ? "default" : "secondary"}
                className="ml-2"
              >
                {isGuestListOpen ? "Aberto" : "Fechado"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {eventData.description && (
                <p className="text-muted-foreground">{eventData.description}</p>
              )}
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(eventData.date)}</span>
                </div>
                
                {eventData.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(eventData.time)}h</span>
                  </div>
                )}
                
                {eventData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{eventData.location}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Componente de solicitação de ingresso */}
        <GuestRequestCard
          eventId={eventData.id}
          promoterId={promoterData?.id || ''}
          teamId={urlParams[2]} // Usando o teamId dos parâmetros da URL
          className="mb-8"
        />
        
        {/* Status da guest list */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <UserCheck className="h-4 w-4" />
          <span>{statusMessage}</span>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[ERROR] Erro não tratado em PromoterGuestListPage:', error);
    return notFound();
  }
} 