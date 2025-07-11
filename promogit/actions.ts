import { createReadOnlyClient } from '@/lib/supabase/client';
import { isValidUUID } from '@/lib/utils';

// Interface para dados do evento
interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  location: string | null;
  flyer_url: string | null;
  is_published: boolean;
  guest_list_open_datetime: string | null;
  guest_list_close_datetime: string | null;
  organization_id: string;
  organizations: {
    name: string;
  } | null;
}

// Interface para dados retornados
interface PromoData {
  event: Event;
  hasAssociation: boolean;
  guestListStatus: {
    isOpen: boolean;
    message: string;
  };
}

// Função para verificar se a guest list está aberta
function checkGuestListStatus(event: Event): { isOpen: boolean; message: string } {
  const now = new Date();

  // Se não há horários definidos, está sempre aberta
  if (!event.guest_list_open_datetime && !event.guest_list_close_datetime) {
    return {
      isOpen: true,
      message: 'Guest list aberta'
    };
  }

  // Se tem horário de abertura mas não fechamento
  if (event.guest_list_open_datetime && !event.guest_list_close_datetime) {
    const openDate = new Date(event.guest_list_open_datetime);
    if (now >= openDate) {
      return {
        isOpen: true,
        message: 'Guest list aberta'
      };
    } else {
      return {
        isOpen: false,
        message: `Guest list abre em ${openDate.toLocaleDateString('pt-BR')} às ${openDate.toLocaleTimeString('pt-BR')}`
      };
    }
  }

  // Se tem horário de fechamento mas não abertura
  if (!event.guest_list_open_datetime && event.guest_list_close_datetime) {
    const closeDate = new Date(event.guest_list_close_datetime);
    if (now <= closeDate) {
      return {
        isOpen: true,
        message: 'Guest list aberta'
      };
    } else {
      return {
        isOpen: false,
        message: 'Guest list fechada'
      };
    }
  }

  // Se tem ambos os horários
  if (event.guest_list_open_datetime && event.guest_list_close_datetime) {
    const openDate = new Date(event.guest_list_open_datetime);
    const closeDate = new Date(event.guest_list_close_datetime);

    if (now < openDate) {
      return {
        isOpen: false,
        message: `Guest list abre em ${openDate.toLocaleDateString('pt-BR')} às ${openDate.toLocaleTimeString('pt-BR')}`
      };
    }

    if (now > closeDate) {
      return {
        isOpen: false,
        message: 'Guest list fechada'
      };
    }

    return {
      isOpen: true,
      message: 'Guest list aberta'
    };
  }

  // Caso padrão (não deve acontecer)
  return {
    isOpen: false,
    message: 'Status da guest list indisponível'
  };
}

// Função principal para processar parâmetros da URL
export async function processPromoParams(params: string[]): Promise<PromoData | null> {
  const [eventId, promoterId, teamId] = params;

  // Validar UUIDs
  if (!isValidUUID(eventId) || !isValidUUID(promoterId) || !isValidUUID(teamId)) {
    console.error('[PROMO] UUID inválido nos parâmetros');
    return null;
  }

  try {
    const supabase = createReadOnlyClient();

    // Buscar evento
    const { data: event, error: eventError } = await supabase
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
        guest_list_close_datetime,
        organization_id,
        organizations (
          name
        )
      `)
      .eq('id', eventId)
      .eq('is_published', true)
      .single();

    if (eventError || !event) {
      console.error('[PROMO] Erro ao buscar evento:', eventError);
      return null;
    }

    // Verificar associação promotor-equipe-evento
    const { data: association, error: associationError } = await supabase
      .from('event_promoters')
      .select('id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .single();

    if (associationError) {
      console.error('[PROMO] Erro ao verificar associação:', associationError);
      return null;
    }

    // Verificar status da guest list
    const guestListStatus = checkGuestListStatus(event);

    return {
      event,
      hasAssociation: !!association,
      guestListStatus
    };

  } catch (error) {
    console.error('[PROMO] Erro ao processar parâmetros:', error);
    return null;
  }
} 