'use server'

import { createReadOnlyClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

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
  };
  promoter: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  hasAssociation: boolean;
}

// Função para validar UUID
const isValidUUID = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

// Server Action para processar parâmetros e buscar dados
export async function processPromoParams(params: string[]): Promise<PromoData | null> {
  console.log('[DEBUG] processPromoParams - Início', { params });

  try {
    if (!Array.isArray(params) || params.length !== 3) {
      console.error('[ERROR] Parâmetros inválidos:', params);
      return null;
    }

    const [eventId, promoterId, teamId] = params;

    if (!isValidUUID(eventId) || !isValidUUID(promoterId) || !isValidUUID(teamId)) {
      console.error('[ERROR] IDs inválidos:', { eventId, promoterId, teamId });
      return null;
    }

    const supabase = await createReadOnlyClient();

    // Buscar dados do evento
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
      console.error('[ERROR] Erro ao buscar evento:', eventError);
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
    }

    // Verificar associação
    const { data: eventPromoterData, error: associationError } = await supabase
      .from('event_promoters')
      .select('id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (associationError) {
      console.error('[ERROR] Erro ao verificar associação:', associationError);
    }

    const result = {
      event: eventData,
      promoter: promoterData || null,
      hasAssociation: !!eventPromoterData
    };

    console.log('[DEBUG] processPromoParams - Sucesso:', result);
    return result;

  } catch (error) {
    console.error('[ERROR] Erro não tratado em processPromoParams:', error);
    return null;
  }
} 