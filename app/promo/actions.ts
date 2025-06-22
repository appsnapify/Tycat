'use server'

import { createReadOnlyClient } from '@/lib/supabase/server';

// Tipos
interface PromoData {
  event: {
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
    organization_id: string | null;
    org_name?: string;
    organizations?: { name: string }[] | { name: string };
  };
  promoter: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  hasAssociation: boolean;
  guestListStatus: {
    isOpen: boolean;
    status: 'BEFORE_OPENING' | 'OPEN' | 'CLOSED' | 'NO_SCHEDULE';
    message: string;
    openDateTime?: string;
    closeDateTime?: string;
  };
}

// Função para validar UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

// Server Action para processar parâmetros e buscar dados
export async function processPromoParams(params: string[]): Promise<PromoData | null> {
  try {
    // Validação básica dos parâmetros
    if (!Array.isArray(params)) {
      console.error('[ERROR] Parâmetros não são um array:', params);
      return null;
    }

    if (params.length !== 3) {
      console.error('[ERROR] Número incorreto de parâmetros. Esperado: 3, Recebido:', params.length);
      return null;
    }

    const [eventId, promoterId, teamId] = params;

    // Validação individual de cada ID
    if (!eventId || !promoterId || !teamId) {
      console.error('[ERROR] Parâmetros vazios detectados');
      return null;
    }

    if (!isValidUUID(eventId) || !isValidUUID(promoterId) || !isValidUUID(teamId)) {
      console.error('[ERROR] UUIDs inválidos detectados');
      return null;
    }

    const supabase = await createReadOnlyClient();

    // Buscar dados do evento com nome da organização
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
        guest_list_close_datetime,
        organization_id,
        organizations(name)
      `)
      .eq('id', eventId)
      .eq('is_published', true)
      .maybeSingle();

    if (eventError) {
      console.error('[ERROR] Erro ao buscar evento:', eventError);
      return null;
    }

    if (!eventData) {
      console.error('[ERROR] Evento não encontrado:', eventId);
      return null;
    }

    // Buscar dados do promotor
    const { data: promoterData, error: promoterError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', promoterId)
      .maybeSingle();

    if (promoterError) {
      console.error('[ERROR] Erro ao buscar promotor:', promoterError);
      return null;
    }

    // Verificar associação - PRIORIDADE 1: Associação direta na tabela event_promoters
    const { data: directAssociation, error: directError } = await supabase
      .from('event_promoters')
      .select('id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (directError) {
      console.error('[ERROR] Erro ao verificar associação direta:', directError);
    }

    let hasAssociation = !!directAssociation;
    
    if (!hasAssociation) {
      // PRIORIDADE 2: Verificar associação via equipa
      // 1. Verificar se o promotor é membro da equipa
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', promoterId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (teamMemberError) {
        console.error('[ERROR] Erro ao verificar membro da equipa:', teamMemberError);
      }

      if (teamMember) {
        // 2. Verificar se a equipa está associada ao evento via event_promoters
        const { data: teamEventAssociation, error: teamEventError } = await supabase
          .from('event_promoters')
          .select('id')
          .eq('event_id', eventId)
          .eq('team_id', teamId)
          .limit(1);

        if (teamEventError) {
          console.error('[ERROR] Erro ao verificar associação equipa-evento:', teamEventError);
        }

        if (teamEventAssociation && teamEventAssociation.length > 0) {
          hasAssociation = true;
        } else {
          // 3. Verificar se a equipa está vinculada à organização do evento
          if (eventData.organization_id) {
            const { data: orgAssociation, error: orgError } = await supabase
              .from('organization_teams')
              .select('organization_id')
              .eq('team_id', teamId)
              .eq('organization_id', eventData.organization_id)
              .maybeSingle();

            if (orgError) {
              console.error('[ERROR] Erro ao verificar associação equipa-organização:', orgError);
            }

            if (orgAssociation) {
              hasAssociation = true;
            }
          }
        }
      }
    }

    // Verificação do período de guest list
    const now = new Date();
    let guestListStatus = {
      isOpen: false,
      status: 'NO_SCHEDULE' as const,
      message: 'Período da guest list não configurado.',
      openDateTime: eventData.guest_list_open_datetime,
      closeDateTime: eventData.guest_list_close_datetime
    };

    if (eventData.guest_list_open_datetime && eventData.guest_list_close_datetime) {
      const openTime = new Date(eventData.guest_list_open_datetime);
      const closeTime = new Date(eventData.guest_list_close_datetime);

      if (now < openTime) {
        guestListStatus = {
          isOpen: false,
          status: 'BEFORE_OPENING',
          message: `A guest list abre em ${openTime.toLocaleString('pt-PT', { 
            timeZone: 'Europe/Lisbon',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}.`,
          openDateTime: eventData.guest_list_open_datetime,
          closeDateTime: eventData.guest_list_close_datetime
        };
      } else if (now >= closeTime) {
        guestListStatus = {
          isOpen: false,
          status: 'CLOSED',
          message: `O período para entrar na guest list terminou em ${closeTime.toLocaleString('pt-PT', { 
            timeZone: 'Europe/Lisbon',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}.`,
          openDateTime: eventData.guest_list_open_datetime,
          closeDateTime: eventData.guest_list_close_datetime
        };
      } else {
        guestListStatus = {
          isOpen: true,
          status: 'OPEN',
          message: `Guest list aberta até ${closeTime.toLocaleString('pt-PT', { 
            timeZone: 'Europe/Lisbon',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}.`,
          openDateTime: eventData.guest_list_open_datetime,
          closeDateTime: eventData.guest_list_close_datetime
        };
      }
    }

    // Processar nome da organização - lidar com objeto ou array
    let orgName = null;
    
    if (eventData.organizations) {
      if (Array.isArray(eventData.organizations) && eventData.organizations[0]?.name) {
        orgName = eventData.organizations[0].name;
      } else if (typeof eventData.organizations === 'object' && 'name' in eventData.organizations) {
        orgName = (eventData.organizations as { name: string }).name;
      }
    }
    
    // Debug apenas em development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Dados da organização:', {
        organizations: eventData.organizations,
        organizationsType: typeof eventData.organizations,
        isArray: Array.isArray(eventData.organizations),
        orgName: orgName
      });
    }
    
    const processedEventData = {
      ...eventData,
      org_name: orgName
    };

    const result = {
      event: processedEventData,
      promoter: promoterData || null,
      hasAssociation,
      guestListStatus
    };
    
    return result;

  } catch (error) {
    console.error('[ERROR] Erro não tratado em processPromoParams:', error);
    return null;
  }
} 