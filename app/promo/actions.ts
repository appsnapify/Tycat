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
  };
  promoter: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  hasAssociation: boolean;
}

// Função para validar UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

// Server Action para processar parâmetros e buscar dados
export async function processPromoParams(params: string[]): Promise<PromoData | null> {
  // Debug apenas em development
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] processPromoParams - Parâmetros recebidos:', JSON.stringify(params));
  }

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
    
    // Debug apenas em development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] IDs extraídos:', { eventId, promoterId, teamId });
    }

    // Validação individual de cada ID
    if (!eventId) {
      console.error('[ERROR] eventId está vazio ou undefined');
      return null;
    }

    if (!promoterId) {
      console.error('[ERROR] promoterId está vazio ou undefined');
      return null;
    }

    if (!teamId) {
      console.error('[ERROR] teamId está vazio ou undefined');
      return null;
    }

    if (!isValidUUID(eventId)) {
      console.error('[ERROR] eventId não é um UUID válido:', eventId);
      return null;
    }

    if (!isValidUUID(promoterId)) {
      console.error('[ERROR] promoterId não é um UUID válido:', promoterId);
      return null;
    }

    if (!isValidUUID(teamId)) {
      console.error('[ERROR] teamId não é um UUID válido:', teamId);
      return null;
    }

    const supabase = await createReadOnlyClient();

    // Buscar dados do evento com validação de timezone
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
        organization_id
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Verificando associação direta...');
    }
    
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
    
    if (hasAssociation) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Associação direta encontrada');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Associação direta não encontrada, verificando via equipa...');
      }
      
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

      // Remover todos os DEBUG logs massivos - apenas manter em development quando necessário
      if (process.env.NODE_ENV === 'development' && process.env.ENABLE_VERBOSE_DEBUG === 'true') {
        // DEBUG: Log detalhado para entender o problema
        console.log('[DEBUG] Query team_members:', { 
          user_id: promoterId, 
          team_id: teamId, 
          result: teamMember,
          error: teamMemberError 
        });

        // DEBUG: Verificar se o promoter existe em alguma equipe
        const { data: allTeamsForUser, error: allTeamsError } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', promoterId);
        
        console.log('[DEBUG] Todas as equipas do promotor:', allTeamsForUser);

        // Todos os outros DEBUG logs verbosos continuam aqui mas só se ENABLE_VERBOSE_DEBUG=true
        // ... resto do código de debug fica igual mas dentro desta condição
      }

      if (teamMember) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Promotor é membro da equipa, verificando se equipa está associada ao evento...');
        }
        
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] Associação via equipa encontrada');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] Equipa não está associada ao evento, verificando via organização...');
          }
          
          // 3. Verificar se a equipa está vinculada à organização do evento
          if (!eventData.organization_id) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DEBUG] Evento não tem organization_id definido');
            }
          } else {
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
              if (process.env.NODE_ENV === 'development') {
                console.log('[DEBUG] Associação via organização encontrada');
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('[DEBUG] Equipa não está vinculada à organização do evento');
              }
            }
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Promotor não é membro da equipa especificada');
        }
      }
    }

    const result = {
      event: eventData,
      promoter: promoterData || null,
      hasAssociation
    };

    // Log final simplificado apenas em development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] processPromoParams - Resultado final:', { 
        eventTitle: result.event.title,
        promoterName: result.promoter ? `${result.promoter.first_name} ${result.promoter.last_name}` : 'null',
        hasAssociation: result.hasAssociation 
      });
    }
    
    return result;

  } catch (error) {
    console.error('[ERROR] Erro não tratado em processPromoParams:', error);
    return null;
  }
} 