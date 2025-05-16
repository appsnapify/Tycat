// Este ficheiro representa a página pública de registo para uma guest list de evento com rastreamento de promotor.
// [...params] captura /promo/[eventId]/[promoterId]/[teamId]

import { notFound } from 'next/navigation';
import { createReadOnlyClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { CalendarIcon, Clock, MapPin, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuestRequestCard } from '@/components/promoter/GuestRequestCard';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// Interface para props da página
interface PageProps {
  params: { params: string[] | Promise<string[]> };
}

// Função para preparar os dados necessários no servidor para evitar uso do createClient no cliente
async function getPromoAndEventData(eventId: string, promoterId: string, teamId: string) {
  try {
    // Usar await explicitamente com createReadOnlyClient
    const supabase = await createReadOnlyClient();
    
    // Obter dados do evento
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id, 
        title, 
        description,
        date,
        time,
        location,
        flyer_url,
        is_published,
        guest_list_open_datetime,
        guest_list_close_datetime
      `)
      .eq('id', eventId)
      .eq('is_published', true)
      .maybeSingle();
      
    if (eventError || !eventData) {
      console.error('Evento não encontrado ou não publicado:', eventError);
      return null;
    }
    
    // Obter dados do promotor
    const { data: promoterData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', promoterId)
      .maybeSingle();
      
    // Checar associação evento-promotor
    const { data: eventPromoterData } = await supabase
      .from('event_promoters')
      .select('id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .maybeSingle();
    
    return {
      event: eventData,
      promoter: promoterData || null,
      hasAssociation: !!eventPromoterData
    };
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return null;
  }
}

// Server Component que captura parâmetros da URL e os passa para o cliente
export default async function PromoterGuestListPage({ params }: PageProps) {
  console.log('DEBUG: Dentro da PromoterGuestListPage - Inicio');
  try {
    const urlParams = await params.params;
    console.log('DEBUG: urlParams recebidos:', urlParams);
    
    if (!urlParams || urlParams.length !== 3) {
      return <div>Parâmetros inválidos (quantidade)</div>;
    }
    
    const [eventId, promoterId, teamId] = urlParams;
    console.log('DEBUG: eventId:', eventId);
    console.log('DEBUG: promoterId:', promoterId);
    console.log('DEBUG: teamId:', teamId);
    
    // Validação básica dos IDs (formato UUID)
    const isValidUUID = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    
    if (!isValidUUID(eventId) || !isValidUUID(promoterId) || !isValidUUID(teamId)) {
      console.error('ID(s) inválido(s) na URL');
      notFound();
    }
    
    // Carregar todos os dados necessários no servidor
    const data = await getPromoAndEventData(eventId, promoterId, teamId);
    
    if (!data) {
      notFound();
    }
    
    const { event: eventData, promoter: promoterData } = data;
    
    // Formatar data e hora para exibição
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'Data não definida';
      return format(new Date(dateString), 'PPP', { locale: pt });
    };
    
    const formatTime = (timeString: string | null | undefined) => {
      if (!timeString) return '';
      // Converte string "HH:MM:SS" para "HH:MM"
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
          
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(eventData.date)}</span>
                {eventData.time && (
                  <>
                    <Clock className="h-4 w-4 ml-2 text-muted-foreground" />
                    <span>{formatTime(eventData.time)}</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{eventData.location}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span>{statusMessage}</span>
              </div>
            </div>
            
            {eventData.description && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>{eventData.description}</p>
              </div>
            )}
            
            <div className="pt-4">
            {/* Passa os parâmetros para o componente cliente */}
            {isGuestListOpen ? (
              <GuestRequestCard 
                eventId={eventId}
                promoterId={promoterId}
                teamId={teamId}
                className="w-full"
              />
            ) : (
              <div className="text-center p-4 rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <p>{statusMessage}</p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('DEBUG: Erro ao processar params:', error);
    return <div>Erro ao processar parâmetros.</div>;
  }
} 