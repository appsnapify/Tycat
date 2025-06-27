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

    // 🚀 OTIMIZAÇÃO: Query unificada (6 consultas → 1 consulta)
    const { data: unifiedData, error: unifiedError } = await supabase
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

    if (unifiedError) {
      console.error('[ERROR] Erro ao buscar evento:', unifiedError);
      return null;
    }

    if (!unifiedData) {
      console.error('[ERROR] Evento não encontrado:', eventId);
      return null;
    }

    const eventData = unifiedData;

    // Buscar dados do promotor e verificações de associação em paralelo
    const [promoterResult, directAssocResult, teamMemberResult, orgTeamResult] = await Promise.all([
      // 1. Dados do promotor
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', promoterId)
        .maybeSingle(),
      
      // 2. Verificação de associação direta
      supabase
        .from('event_promoters')
        .select('id')
        .eq('event_id', eventId)
        .eq('promoter_id', promoterId)
        .eq('team_id', teamId)
        .maybeSingle(),
      
      // 3. Verificação se promotor é membro da equipe
      supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', promoterId)
        .eq('team_id', teamId)
        .maybeSingle(),
      
      // 4. Verificação se equipe está vinculada à organização
      eventData.organization_id ? supabase
        .from('organization_teams')
        .select('organization_id')
        .eq('team_id', teamId)
        .eq('organization_id', eventData.organization_id)
        .maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);

    // Processar dados do promotor
    const { data: promoterData, error: promoterError } = promoterResult;
    if (promoterError) {
      console.error('[ERROR] Erro ao buscar promotor:', promoterError);
      return null;
    }

    // Determinar hasAssociation com lógica otimizada
    let hasAssociation = false;
    
    // PRIORIDADE 1: Associação direta
    if (directAssocResult.data) {
      hasAssociation = true;
    }
    // PRIORIDADE 2: Membro da equipe + equipe vinculada à organização
    else if (teamMemberResult.data && orgTeamResult.data) {
      hasAssociation = true;
    }
    // PRIORIDADE 3: Verificar se equipe está associada ao evento
    else if (teamMemberResult.data) {
      const { data: teamEventAssociation, error: teamEventError } = await supabase
        .from('event_promoters')
        .select('id')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .limit(1);
      
      if (!teamEventError && teamEventAssociation && teamEventAssociation.length > 0) {
        hasAssociation = true;
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